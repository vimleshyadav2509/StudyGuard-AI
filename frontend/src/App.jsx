import CameraMonitor from "./components/CameraMonitor";

const dashboardCards = [
  {
    icon: "◉",
    title: "Camera Monitoring",
    description: "Enable your live camera preview when you are ready to begin.",
    status: "Camera controls below",
    accent: "purple",
  },
  {
    icon: "◷",
    title: "Study Timer",
    description: "Set up focused study sessions and Pomodoro cycles later.",
    status: "Ready to set up",
    accent: "blue",
  },
  {
    icon: "↗",
    title: "Focus Score",
    description: "Your focus insights will appear here after completed sessions.",
    status: "No data yet",
    accent: "green",
  },
  {
    icon: "▤",
    title: "Session History",
    description: "Past study sessions will be saved and shown in this area.",
    status: "No sessions yet",
    accent: "orange",
  },
];

function App() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="StudyGuard AI home">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>StudyGuard <strong>AI</strong></span>
        </a>
        <nav className="navigation" aria-label="Main navigation">
          <a className="active" href="#dashboard">Dashboard</a>
          <a href="#camera">Camera</a>
          <a href="#how-it-works">How it works</a>
        </nav>
      </header>

      <main id="top">
        <section className="hero" id="dashboard">
          <div>
            <p className="eyebrow">YOUR FOCUS COMPANION</p>
            <h1>Build better study habits, one session at a time.</h1>
            <p className="hero-copy">
              Welcome to your StudyGuard AI dashboard. Your study tools and insights
              will live here as the project grows.
            </p>
          </div>
          <div className="hero-badge" aria-label="Current project status">
            <span className="status-dot" />
            Milestone 4: Eye & Drowsiness Monitoring
          </div>
        </section>

        <section className="dashboard-section" aria-labelledby="dashboard-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">STUDY DASHBOARD</p>
              <h2 id="dashboard-title">Your focus space</h2>
            </div>
            <p>Start small. Build consistently.</p>
          </div>

          <div className="card-grid">
            {dashboardCards.map((card) => (
              <article className="dashboard-card" key={card.title}>
                <div className={`card-icon ${card.accent}`} aria-hidden="true">
                  {card.icon}
                </div>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
                <span className="card-status">{card.status}</span>
              </article>
            ))}
          </div>
        </section>

        <CameraMonitor />

        <section className="privacy-note" id="how-it-works">
          <div className="privacy-icon" aria-hidden="true">⌾</div>
          <div>
            <h2>Privacy-first by design</h2>
            <p>
              Eye and focus monitoring features run 100% locally in your browser, keeping
              all camera data private and under your control.
            </p>
          </div>
        </section>
      </main>

      <footer>StudyGuard AI · Milestone 4 Eye & Drowsiness Monitoring</footer>
    </div>
  );
}

export default App;
