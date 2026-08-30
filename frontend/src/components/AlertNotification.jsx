import { useEffect } from "react";

function AlertNotification({ activeAlert, onDismiss, isMuted, onToggleMute }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && activeAlert) {
        onDismiss();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeAlert, onDismiss]);

  if (!activeAlert) return null;

  const severityClass = activeAlert.severity || "warning";

  return (
    <div
      className={`alert-banner severity-${severityClass}`}
      role="alert"
      aria-live="assertive"
      id="active-study-alert"
    >
      <div className="alert-banner-inner">
        <div className="alert-icon-wrap" aria-hidden="true">
          <span className="alert-icon">{activeAlert.icon}</span>
        </div>

        <div className="alert-text-content">
          <div className="alert-header-row">
            <span className="alert-tag">ATTENTION REQUIRED</span>
            <span className="alert-timestamp">Just now</span>
          </div>
          <h4 className="alert-title">{activeAlert.title}</h4>
          <p className="alert-message">{activeAlert.message}</p>
        </div>

        <div className="alert-actions">
          <button
            className="alert-mute-btn"
            type="button"
            onClick={onToggleMute}
            title={isMuted ? "Unmute alarm" : "Mute alarm"}
            aria-label={isMuted ? "Unmute alarm" : "Mute alarm"}
          >
            {isMuted ? "🔇" : "🔊"}
          </button>
          <button
            className="btn btn-sm btn-dismiss"
            type="button"
            onClick={onDismiss}
            id="dismiss-alert-btn"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

export default AlertNotification;
