import { useCallback, useEffect, useRef, useState } from "react";
import AlertNotification from "./components/AlertNotification";
import AlertSettings from "./components/AlertSettings";
import CameraMonitor from "./components/CameraMonitor";
import StudySessionTimer from "./components/StudySessionTimer";
import {
  previewAlertSound,
  setAlertVolume,
  setSelectedAlarmSound,
  startAlertSound,
  stopAlertSound,
  stopPreviewSound,
  testAlertSound,
  unlockAudio,
} from "./utils/audioAlert";

const dashboardCards = [
  {
    icon: "🎯",
    title: "Study Focus Tracking",
    description: "Evaluates visual attention using normalized Eye Aspect Ratio and temporal debounce.",
    status: "Active on camera",
    accent: "purple",
  },
  {
    icon: "💻",
    title: "Electronic Device Detection",
    description: "Detects phones, laptops, monitors, keyboards, mice, and other electronic devices in camera view using on-device neural object detection.",
    status: "Active on camera",
    accent: "orange",
  },
  {
    icon: "👀",
    title: "Eye Direction Monitor",
    description: "Tracks head pose and gaze alignment to detect sustained looking-away behavior.",
    status: "Active on camera",
    accent: "blue",
  },
  {
    icon: "🔔",
    title: "Unified Smart Alerts",
    description: "Custom audio alarm and visual notifications tied directly to active condition lifecycle.",
    status: "Active lifecycle",
    accent: "green",
  },
];

const privacyHighlights = [
  {
    icon: "🔒",
    title: "100% Local Inference",
    description: "All neural models (landmarks, gaze, and object detection) run directly inside your browser via WebAssembly. Your webcam feed never leaves your device.",
  },
  {
    icon: "🚫",
    title: "Zero Video Uploads",
    description: "No video frames, still photos, or telemetry data are ever transmitted to any external server or database.",
  },
  {
    icon: "🛡",
    title: "No Biometric Profiling",
    description: "StudyGuard AI measures geometric eye openness in real-time. No facial recognition or identity tracking is ever performed.",
  },
];

const alertDefinitions = {
  DROWSINESS: {
    type: "DROWSINESS",
    title: "Drowsiness Detected",
    message: "Extended eye closure detected. Please take a short break to refresh your energy.",
    icon: "😴",
    severity: "danger",
  },
  ELECTRONIC_DEVICE: {
    type: "ELECTRONIC_DEVICE",
    title: "Electronic Device Detected",
    message: "An electronic device is visible in camera view. Put it away to maintain study focus.",
    icon: "📱",
    severity: "danger",
  },
  // Backwards compatibility alias
  MOBILE: {
    type: "ELECTRONIC_DEVICE",
    title: "Electronic Device Detected",
    message: "An electronic device is visible in camera view. Put it away to maintain study focus.",
    icon: "📱",
    severity: "danger",
  },
  LOOKING_AWAY: {
    type: "LOOKING_AWAY",
    title: "Attention Reduced — Looking Away",
    message: "Head/gaze turned away from study screen for an extended period. Return attention to study.",
    icon: "👀",
    severity: "warning",
  },
  ATTENTION_REDUCED: {
    type: "ATTENTION_REDUCED",
    title: "Study Focus Reduced",
    message: "Visual study attention has dropped. Re-center your focus on the study materials.",
    icon: "🎯",
    severity: "warning",
  },
};

function App() {
  // Alert settings state
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [volume, setVolume] = useState(0.6);
  const [drowsinessEnabled, setDrowsinessEnabled] = useState(true);
  const [electronicDeviceEnabled, setElectronicDeviceEnabled] = useState(true);
  const [lookingAwayEnabled, setLookingAwayEnabled] = useState(true);
  const [attentionEnabled, setAttentionEnabled] = useState(true);

  // Active alert state
  const [activeAlert, setActiveAlert] = useState(null);
  const [isTestingSound, setIsTestingSound] = useState(false);

  // Selected alarm sound state with persistence
  const [selectedAlarmId, setSelectedAlarmId] = useState(() => {
    try {
      return localStorage.getItem("studyguard_alarm_tune") || "classic";
    } catch {
      return "classic";
    }
  });
  const [activePreviewId, setActivePreviewId] = useState(null);

  // Synchronize audio subsystem with initial or updated alarm tune
  useEffect(() => {
    setSelectedAlarmSound(selectedAlarmId);
  }, [selectedAlarmId]);

  // Audio lifecycle state refs
  const isAlarmPlayingRef = useRef(false);
  const currentActiveConditionRef = useRef(null);

  /**
   * Unified Alert Engine:
   * Evaluates camera telemetry against priority rules and manages active audio alarm lifecycle.
   * Starts alarm when an alert condition occurs; stops IMMEDIATELY when the condition clears.
   */
  const handleStatusUpdate = useCallback(
    (status) => {
      const {
        cameraStatus,
        drowsinessStatus,
        deviceStatus,
        mobileStatus,
        eyeDirectionStatus,
        focusStatus,
        detectedDevices,
      } = status;

      // If camera is not active or alerts are globally disabled: stop alarm immediately
      if (cameraStatus !== "active" || !alertsEnabled) {
        if (isAlarmPlayingRef.current) {
          stopAlertSound();
          isAlarmPlayingRef.current = false;
        }
        currentActiveConditionRef.current = null;
        setActiveAlert(null);
        return;
      }

      // Check which enabled conditions are currently active
      const isDrowsyActive = drowsinessEnabled && drowsinessStatus === "drowsiness-suspected";
      const isDeviceActive =
        electronicDeviceEnabled &&
        (deviceStatus === "device-detected" || mobileStatus === "mobile-detected");
      const isLookingAwayActive = lookingAwayEnabled && eyeDirectionStatus === "looking-away";
      const isAttentionReducedActive = attentionEnabled && focusStatus === "attention-reduced";

      // Priority resolution:
      // Priority 1: Drowsiness
      // Priority 2: Electronic Device
      // Priority 3: Looking Away
      // Priority 4: Attention Reduced
      let targetCondition = null;
      if (isDrowsyActive) {
        targetCondition = "DROWSINESS";
      } else if (isDeviceActive) {
        targetCondition = "ELECTRONIC_DEVICE";
      } else if (isLookingAwayActive) {
        targetCondition = "LOOKING_AWAY";
      } else if (isAttentionReducedActive) {
        targetCondition = "ATTENTION_REDUCED";
      }

      // Condition change & audio lifecycle handling
      if (targetCondition === null) {
        // No conditions are active -> IMMEDIATELY STOP ALARM
        if (isAlarmPlayingRef.current) {
          stopAlertSound();
          isAlarmPlayingRef.current = false;
        }
        currentActiveConditionRef.current = null;
        setActiveAlert(null);
      } else {
        // At least one condition is active
        if (currentActiveConditionRef.current !== targetCondition) {
          currentActiveConditionRef.current = targetCondition;

          if (targetCondition === "ELECTRONIC_DEVICE") {
            const devices = detectedDevices || [];
            let dynamicIcon = "📱";
            let dynamicTitle = "Electronic Device Detected";
            let dynamicMessage =
              "An electronic device is visible in camera view. Please remove the device and return your attention to your study.";

            if (devices.length === 1) {
              const d = devices[0];
              dynamicIcon = d.icon || "📱";
              dynamicTitle = `${d.displayName} Detected`;
              dynamicMessage = `${d.icon} ${d.displayName} detected in camera view. Please remove the electronic device and return your attention to your study.`;
            } else if (devices.length > 1) {
              const names = Array.from(new Set(devices.map((d) => d.displayName))).join(", ");
              dynamicIcon = "⚡";
              dynamicTitle = `${devices.length} Electronic Devices Detected`;
              dynamicMessage = `Multiple electronic devices (${names}) detected. Please remove them and return your attention to your study.`;
            }

            setActiveAlert({
              type: "ELECTRONIC_DEVICE",
              title: dynamicTitle,
              message: dynamicMessage,
              icon: dynamicIcon,
              severity: "danger",
              id: `ELECTRONIC_DEVICE-${Date.now()}`,
              timestamp: Date.now(),
            });
          } else {
            const alertDef = alertDefinitions[targetCondition];
            setActiveAlert({
              ...alertDef,
              id: `${targetCondition}-${Date.now()}`,
              timestamp: Date.now(),
            });
          }
        }

        // Manage audio state
        if (soundEnabled) {
          if (!isAlarmPlayingRef.current) {
            // Start alarm audio playback (will loop while condition remains active)
            isAlarmPlayingRef.current = true;
            void startAlertSound({ volume, isMuted: false, loop: true });
          }
          // If already playing, keep same audio playback without restarting from time 0
        } else {
          if (isAlarmPlayingRef.current) {
            stopAlertSound();
            isAlarmPlayingRef.current = false;
          }
        }
      }
    },
    [
      alertsEnabled,
      attentionEnabled,
      drowsinessEnabled,
      electronicDeviceEnabled,
      lookingAwayEnabled,
      soundEnabled,
      volume,
    ],
  );

  const handleDismissAlert = useCallback(() => {
    setActiveAlert(null);
    stopAlertSound();
    isAlarmPlayingRef.current = false;
  }, []);

  const handleToggleMute = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      if (!next) {
        stopAlertSound();
        isAlarmPlayingRef.current = false;
      } else if (currentActiveConditionRef.current && alertsEnabled) {
        isAlarmPlayingRef.current = true;
        void startAlertSound({ volume, isMuted: false, loop: true });
      }
      return next;
    });
  }, [alertsEnabled, volume]);

  const handleSoundEnabledChange = useCallback(
    (enabled) => {
      setSoundEnabled(enabled);
      if (!enabled) {
        stopAlertSound();
        isAlarmPlayingRef.current = false;
      } else if (currentActiveConditionRef.current && alertsEnabled) {
        isAlarmPlayingRef.current = true;
        void startAlertSound({ volume, isMuted: false, loop: true });
      }
    },
    [alertsEnabled, volume],
  );

  const handleAlertsEnabledChange = useCallback((enabled) => {
    setAlertsEnabled(enabled);
    if (!enabled) {
      stopAlertSound();
      isAlarmPlayingRef.current = false;
      currentActiveConditionRef.current = null;
      setActiveAlert(null);
    }
  }, []);

  const handleVolumeChange = useCallback((newVolume) => {
    setVolume(newVolume);
    setAlertVolume(newVolume);
  }, []);

  const handleTestSound = useCallback(() => {
    if (isTestingSound) {
      stopAlertSound();
      setIsTestingSound(false);
      return;
    }

    setIsTestingSound(true);
    void testAlertSound(volume, !soundEnabled);
    setTimeout(() => {
      setIsTestingSound(false);
    }, 2800);
  }, [isTestingSound, soundEnabled, volume]);

  const handleSelectAlarm = useCallback((alarmId) => {
    setSelectedAlarmId(alarmId);
    try {
      localStorage.setItem("studyguard_alarm_tune", alarmId);
    } catch {}
    setSelectedAlarmSound(alarmId);
  }, []);

  const handlePreviewAlarm = useCallback(
    (alarmId) => {
      void previewAlertSound(alarmId, volume, (currentId) => {
        setActivePreviewId(currentId);
      });
    },
    [volume],
  );

  // Global one-time interaction listener to prime audio on any user gesture
  useEffect(() => {
    const handleGesture = () => {
      unlockAudio();
    };
    window.addEventListener("pointerdown", handleGesture, { once: true });
    window.addEventListener("keydown", handleGesture, { once: true });
    return () => {
      window.removeEventListener("pointerdown", handleGesture);
      window.removeEventListener("keydown", handleGesture);
    };
  }, []);

  // Clean up audio on component unmount
  useEffect(() => {
    return () => {
      stopAlertSound();
      stopPreviewSound();
      isAlarmPlayingRef.current = false;
    };
  }, []);

  return (
    <div className="app-shell">
      {/* FLOATING UNIFIED ALERT NOTIFICATION */}
      <AlertNotification
        activeAlert={activeAlert}
        onDismiss={handleDismissAlert}
        isMuted={!soundEnabled}
        onToggleMute={handleToggleMute}
      />

      {/* TOP NAVIGATION — GLASSMORPHISM & NEON ACCENTS */}
      <header className="site-header">
        <div className="brand-group">
          <a className="brand" href="#top" aria-label="StudyGuard AI Home">
            <span className="brand-mark" aria-hidden="true">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <circle cx="12" cy="11" r="3" />
              </svg>
            </span>
            <div className="brand-text">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="brand-name font-black tracking-tight">
                  StudyGuard <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500 bg-clip-text text-transparent font-black">AI</span>
                </span>
                <span className="brand-privacy-badge" aria-label="Privacy status: 100% Private and Local">
                  <span className="brand-privacy-dot" />
                  100% Private &amp; Local
                </span>
              </div>
              <span className="brand-tagline">Smart Autonomous On-Device Vision</span>
            </div>
          </a>
        </div>

        <nav className="navigation" aria-label="Main Navigation">
          <a className="nav-link active" href="#dashboard">Dashboard</a>
          <a className="nav-link" href="#camera">Camera &amp; Vision</a>
          <a className="nav-link" href="#session">Session</a>
          <a className="nav-link" href="#alert-settings">Alerts</a>
          <a className="nav-link" href="#capabilities">Capabilities</a>
          <a className="nav-link" href="#privacy">Privacy</a>
        </nav>

        <div className="header-status-pill" aria-label="System status: On-Device & Private">
          <span className="status-dot online" aria-hidden="true" />
          <span>Private &amp; On-Device</span>
        </div>
      </header>

      <main id="top" className="main-content">
        {/* 1. HERO SECTION — FUTURISTIC AI STARTUP HERO */}
        <section className="hero-section" id="dashboard" aria-labelledby="hero-title">
          {/* Subtle Ambient Glow Shapes */}
          <div className="hero-glow-bg" aria-hidden="true" />

          <div className="hero-content">
            <div className="hero-badge">
              <span className="sparkle-icon" aria-hidden="true">✨</span>
              <span>Autonomous On-Device Study Intelligence</span>
            </div>

            <h1 id="hero-title" className="hero-title">
              Focus deeper.<br />
              <span className="title-accent">Study smarter.</span>
            </h1>

            <p className="hero-subtitle">Private On-Device Computer Vision Study Assistant</p>

            <p className="hero-description">
              StudyGuard AI helps students stay focused using private on-device computer vision. Real-time visual attention evaluation, distraction &amp; electronic device detection, looking-away tracking, and condition-tied smart alerts — 100% in your browser.
            </p>

            <div className="hero-quick-actions">
              <a href="#camera" className="btn btn-primary">
                <span aria-hidden="true">📹</span> Open Camera Monitor
              </a>
              <a href="#session" className="btn btn-secondary">
                <span aria-hidden="true">⏱</span> Study Session
              </a>
              <a href="#alert-settings" className="btn btn-secondary">
                <span aria-hidden="true">🔔</span> Smart Alert Control
              </a>
            </div>
          </div>

          <div className="hero-metrics-card" aria-label="Key features summary">
            <div className="metric-row">
              <div className="metric-badge-icon" aria-hidden="true">🔒</div>
              <div>
                <strong>100% On-Device AI</strong>
                <p>Zero cloud latency &amp; zero video uploads</p>
              </div>
            </div>
            <div className="metric-row">
              <div className="metric-badge-icon" aria-hidden="true">⚡</div>
              <div>
                <strong>Real-Time Vision</strong>
                <p>468-pt facial mesh &amp; neural device tracking</p>
              </div>
            </div>
            <div className="metric-row">
              <div className="metric-badge-icon" aria-hidden="true">🛡</div>
              <div>
                <strong>Privacy First</strong>
                <p>Pure client-side WebAssembly inference</p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. PRIMARY LIVE MONITORING & VISION TELEMETRY SECTION */}
        <CameraMonitor onStatusUpdate={handleStatusUpdate} />

        {/* 3. STUDY SESSION TRACKER COMPONENT */}
        <StudySessionTimer />

        {/* 4. SMART ALERT CONTROL CENTER COMPONENT */}
        <AlertSettings
          alertsEnabled={alertsEnabled}
          setAlertsEnabled={handleAlertsEnabledChange}
          soundEnabled={soundEnabled}
          setSoundEnabled={handleSoundEnabledChange}
          volume={volume}
          setVolume={handleVolumeChange}
          drowsinessEnabled={drowsinessEnabled}
          setDrowsinessEnabled={setDrowsinessEnabled}
          electronicDeviceEnabled={electronicDeviceEnabled}
          setElectronicDeviceEnabled={setElectronicDeviceEnabled}
          mobileEnabled={electronicDeviceEnabled}
          setMobileEnabled={setElectronicDeviceEnabled}
          lookingAwayEnabled={lookingAwayEnabled}
          setLookingAwayEnabled={setLookingAwayEnabled}
          attentionEnabled={attentionEnabled}
          setAttentionEnabled={setAttentionEnabled}
          onTestSound={handleTestSound}
          isTestingSound={isTestingSound}
          selectedAlarmId={selectedAlarmId}
          onSelectAlarm={handleSelectAlarm}
          activePreviewId={activePreviewId}
          onPreviewAlarm={handlePreviewAlarm}
        />

        {/* 5. CORE CAPABILITIES (SECONDARY INFORMATIONAL SUITE) */}
        <section className="dashboard-section" id="capabilities" aria-labelledby="capabilities-title">
          <div className="section-header">
            <div>
              <span className="section-tag">CORE CAPABILITIES</span>
              <h2 id="capabilities-title" className="section-title">Study Intelligence Suite</h2>
            </div>
            <p className="section-desc">Unified focus monitoring built for distraction-free learning.</p>
          </div>

          <div className="card-grid">
            {dashboardCards.map((card) => (
              <article className="dashboard-card" key={card.title}>
                <div className={`card-icon-box ${card.accent}`} aria-hidden="true">
                  {card.icon}
                </div>
                <h3 className="card-title">{card.title}</h3>
                <p className="card-desc">{card.description}</p>
                <div className="card-footer">
                  <span className="badge">{card.status}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* 6. PRIVACY SECTION */}
        <section className="privacy-section" id="privacy" aria-labelledby="privacy-title">
          <div className="section-header">
            <div>
              <span className="section-tag">DATA INTEGRITY</span>
              <h2 id="privacy-title" className="section-title">Privacy-First Architecture</h2>
            </div>
            <p className="section-desc">
              Your video stream never leaves your device. All machine learning inference runs locally in-browser.
            </p>
          </div>

          <div className="privacy-grid">
            {privacyHighlights.map((item) => (
              <div className="privacy-card" key={item.title}>
                <div className="privacy-card-icon" aria-hidden="true">{item.icon}</div>
                <h3 className="privacy-card-title">{item.title}</h3>
                <p className="privacy-card-desc">{item.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* PROFESSIONAL FOOTER */}
      <footer className="site-footer">
        <div className="footer-top">
          <div className="footer-brand">
            <span className="brand-mark small" aria-hidden="true">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <circle cx="12" cy="11" r="3" />
              </svg>
            </span>
            <span className="footer-brand-name">StudyGuard <strong>AI</strong></span>
          </div>
          <p className="footer-tagline">
            Smart on-device study focus monitoring, electronic device detection, and session analytics.
          </p>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} StudyGuard AI. Privacy-First Educational Assistant.</p>
          <div className="footer-links">
            <a href="#dashboard">Dashboard</a>
            <a href="#camera">Camera</a>
            <a href="#session">Session</a>
            <a href="#alert-settings">Alerts</a>
            <a href="#capabilities">Capabilities</a>
            <a href="#privacy">Privacy Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
