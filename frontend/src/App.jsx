import CameraMonitor from "./components/CameraMonitor";
import StudySessionTimer from "./components/StudySessionTimer";

const dashboardCards = [
  {
    icon: "🎯",
    title: "Study Focus Tracking",
    description: "Evaluates visual attention using normalized Eye Aspect Ratio and temporal debounce.",
    status: "Active on camera",
    accent: "purple",
  },
  {
    icon: "⏱",
    title: "Precision Session Timer",
    description: "Dedicated study timer with drift-free timestamp tracking and pause/resume states.",
    status: "Ready to start",
    accent: "blue",
  },
  {
    icon: "🛡",
    title: "On-Device Neural Vision",
    description: "MediaPipe 468-point face mesh executes 100% client-side via WebAssembly.",
    status: "Private sandbox",
    accent: "green",
  },
  {
    icon: "⚡",
    title: "Drowsiness Detection",
    description: "Detects extended eye closure thresholds to signal fatigue without false alarms.",
    status: "Debounced analysis",
    accent: "orange",
  },
];

const privacyHighlights = [
  {
    icon: "🔒",
    title: "100% Local Inference",
    description: "All computer vision models run directly inside your browser using WebAssembly. Your webcam feed never leaves your device.",
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

function App() {
  return (
    <div className="app-shell">
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
          <a className="nav-link" href="#session">Session</a>
          <a className="nav-link" href="#camera">Camera</a>
          <a className="nav-link" href="#privacy">Privacy</a>
        </nav>

        <div className="header-status-pill" aria-label="System status: On-Device & Private">
          <span className="status-dot online" aria-hidden="true" />
          <span>Private & On-Device</span>
        </div>
      </header>

      <main id="top" className="main-content">
        {/* HERO SECTION */}
        <section className="hero-section" id="dashboard" aria-labelledby="hero-title">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="sparkle-icon" aria-hidden="true">✨</span>
              <span>Intelligent Study & Focus Platform</span>
            </div>
            <h1 id="hero-title" className="hero-title">
              Focus deeper.<br />Study smarter.
            </h1>
            <p className="hero-description">
              Real-time on-device study attention monitoring, drowsiness detection, and session time tracking — designed for private, distraction-free productivity.
            </p>

            <div className="hero-quick-actions">
              <a href="#session" className="btn btn-primary">
                <span aria-hidden="true">⏱</span> Start Study Session
              </a>
              <a href="#camera" className="btn btn-secondary">
                <span aria-hidden="true">📹</span> Open Camera Monitor
              </a>
            </div>
          </div>

          <div className="hero-metrics-card" aria-label="Key features summary">
            <div className="metric-row">
              <div className="metric-badge-icon" aria-hidden="true">🔒</div>
              <div>
                <strong>100% Private</strong>
                <p>Zero cloud video processing</p>
              </div>
            </div>
            <div className="metric-row">
              <div className="metric-badge-icon" aria-hidden="true">⚡</div>
              <div>
                <strong>Real-Time Vision</strong>
                <p>Sub-second attention stability</p>
              </div>
            </div>
            <div className="metric-row">
              <div className="metric-badge-icon" aria-hidden="true">⏱</div>
              <div>
                <strong>Session Tracker</strong>
                <p>High-precision drift-free timing</p>
              </div>
            </div>
          </div>
        </section>

        {/* OVERVIEW DASHBOARD CARDS */}
        <section className="dashboard-section" aria-labelledby="overview-title">
          <div className="section-header">
            <div>
              <span className="section-tag">CORE CAPABILITIES</span>
              <h2 id="overview-title" className="section-title">Study Intelligence Suite</h2>
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

        {/* STUDY SESSION TIMER COMPONENT */}
        <StudySessionTimer />

        {/* LIVE CAMERA & ATTENTION MONITOR COMPONENT */}
        <CameraMonitor />

        {/* PRIVACY FIRST ARCHITECTURE SECTION */}
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
            Smart on-device study focus monitoring and session analytics.
          </p>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} StudyGuard AI. Privacy-First Educational Assistant.</p>
          <div className="footer-links">
            <a href="#dashboard">Dashboard</a>
            <a href="#session">Session</a>
            <a href="#camera">Camera</a>
            <a href="#privacy">Privacy Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
