import { useCallback, useEffect, useRef, useState } from "react";
import AlertNotification from "./components/AlertNotification";
import AlertSettings from "./components/AlertSettings";
import CameraMonitor from "./components/CameraMonitor";
import StudySessionTimer from "./components/StudySessionTimer";
import {
  setAlertVolume,
  startAlertSound,
  stopAlertSound,
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
    icon: "📱",
    title: "Mobile Detection",
    description: "Detects mobile phones in camera view using on-device neural object detection.",
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
  MOBILE: {
    type: "MOBILE",
    title: "Mobile Phone Detected",
    message: "A mobile device is visible in camera view. Put your phone away to maintain study focus.",
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
  const [mobileEnabled, setMobileEnabled] = useState(true);
  const [lookingAwayEnabled, setLookingAwayEnabled] = useState(true);
  const [attentionEnabled, setAttentionEnabled] = useState(true);

  // Active alert state
  const [activeAlert, setActiveAlert] = useState(null);
  const [isTestingSound, setIsTestingSound] = useState(false);

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
      const { cameraStatus, drowsinessStatus, mobileStatus, eyeDirectionStatus, focusStatus } =
        status;

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
      const isMobileActive = mobileEnabled && mobileStatus === "mobile-detected";
      const isLookingAwayActive = lookingAwayEnabled && eyeDirectionStatus === "looking-away";
      const isAttentionReducedActive = attentionEnabled && focusStatus === "attention-reduced";

      // Priority resolution:
      // Priority 1: Drowsiness
      // Priority 2: Mobile Phone
      // Priority 3: Looking Away
      // Priority 4: Attention Reduced
      let targetCondition = null;
      if (isDrowsyActive) {
        targetCondition = "DROWSINESS";
      } else if (isMobileActive) {
        targetCondition = "MOBILE";
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
          const alertDef = alertDefinitions[targetCondition];
          setActiveAlert({
            ...alertDef,
            id: `${targetCondition}-${Date.now()}`,
            timestamp: Date.now(),
          });
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
      lookingAwayEnabled,
      mobileEnabled,
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

      {/* PROFESSIONAL APPLICATION HEADER */}
      <header className="site-header">
        <div className="brand-group">
          <a className="brand" href="#top" aria-label="StudyGuard AI Home">
            <span className="brand-mark" aria-hidden="true">S</span>
            <div className="brand-text">
              <span className="brand-name">StudyGuard <strong>AI</strong></span>
              <span className="brand-tagline">Smart AI-Powered Study Monitoring</span>
            </div>
          </a>
        </div>

        <nav className="navigation" aria-label="Main Navigation">
          <a className="nav-link active" href="#dashboard">Dashboard</a>
          <a className="nav-link" href="#camera">Camera & Vision</a>
          <a className="nav-link" href="#session">Session</a>
          <a className="nav-link" href="#alert-settings">Alerts</a>
          <a className="nav-link" href="#capabilities">Capabilities</a>
          <a className="nav-link" href="#privacy">Privacy</a>
        </nav>

        <div className="header-status-pill" aria-label="System status: On-Device & Private">
          <span className="status-dot online" aria-hidden="true" />
          <span>Private & On-Device</span>
        </div>
      </header>

      <main id="top" className="main-content">
        {/* 1. HERO SECTION */}
        <section className="hero-section" id="dashboard" aria-labelledby="hero-title">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="sparkle-icon" aria-hidden="true">✨</span>
              <span>Intelligent Study & Focus Platform</span>
            </div>
            <h1 id="hero-title" className="hero-title">
              StudyGuard <span className="title-accent">AI</span>
            </h1>
            <p className="hero-subtitle">Focus deeper. Study smarter.</p>
            <p className="hero-description">
              Real-time on-device study attention monitoring, mobile phone detection, looking-away tracking, and live condition-tied sound alerts — engineered for private, distraction-free productivity.
            </p>

            <div className="hero-quick-actions">
              <a href="#camera" className="btn btn-primary">
                <span aria-hidden="true">📹</span> Open Camera Monitor
              </a>
              <a href="#session" className="btn btn-secondary">
                <span aria-hidden="true">⏱</span> Start Study Session
              </a>
              <a href="#alert-settings" className="btn btn-secondary">
                <span aria-hidden="true">🔔</span> Alert Preferences
              </a>
            </div>
          </div>

          <div className="hero-metrics-card" aria-label="Key features summary">
            <div className="metric-row">
              <div className="metric-badge-icon" aria-hidden="true">🔒</div>
              <div>
                <strong>100% Private & Local</strong>
                <p>Zero cloud video transmission</p>
              </div>
            </div>
            <div className="metric-row">
              <div className="metric-badge-icon" aria-hidden="true">📱</div>
              <div>
                <strong>Mobile & Gaze AI</strong>
                <p>Real-time neural distraction detection</p>
              </div>
            </div>
            <div className="metric-row">
              <div className="metric-badge-icon" aria-hidden="true">🔔</div>
              <div>
                <strong>Smart Alarm Lifecycle</strong>
                <p>Alarms tied directly to active condition</p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. PRIMARY LIVE MONITORING & VISION TELEMETRY SECTION */}
        <CameraMonitor onStatusUpdate={handleStatusUpdate} />

        {/* 3. STUDY SESSION TRACKER COMPONENT */}
        <StudySessionTimer />

        {/* 4. SMART ALERT SETTINGS COMPONENT */}
        <AlertSettings
          alertsEnabled={alertsEnabled}
          setAlertsEnabled={handleAlertsEnabledChange}
          soundEnabled={soundEnabled}
          setSoundEnabled={handleSoundEnabledChange}
          volume={volume}
          setVolume={handleVolumeChange}
          drowsinessEnabled={drowsinessEnabled}
          setDrowsinessEnabled={setDrowsinessEnabled}
          mobileEnabled={mobileEnabled}
          setMobileEnabled={setMobileEnabled}
          lookingAwayEnabled={lookingAwayEnabled}
          setLookingAwayEnabled={setLookingAwayEnabled}
          attentionEnabled={attentionEnabled}
          setAttentionEnabled={setAttentionEnabled}
          onTestSound={handleTestSound}
          isTestingSound={isTestingSound}
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
                  <span className="card-chip">{card.status}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* 6. PRIVACY FIRST ARCHITECTURE SECTION */}
        <section className="privacy-section" id="privacy" aria-labelledby="privacy-title">
          <div className="section-header centered">
            <span className="section-tag">PRIVACY ARCHITECTURE</span>
            <h2 id="privacy-title" className="section-title">Privacy-First by Design</h2>
            <p className="section-desc">
              Your camera data belongs to you. StudyGuard AI is engineered to execute all neural inferences on-device.
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
            <span className="brand-mark small" aria-hidden="true">S</span>
            <span className="footer-brand-name">StudyGuard <strong>AI</strong></span>
          </div>
          <p className="footer-tagline">
            Smart on-device study focus monitoring, mobile phone detection, and session analytics.
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
