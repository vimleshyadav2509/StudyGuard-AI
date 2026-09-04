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
  const isDeviceAlert = activeAlert.type === "ELECTRONIC_DEVICE" || activeAlert.type === "MOBILE";
  const systemTag = isDeviceAlert ? "⚠ ELECTRONIC DEVICE" : "⚠ SYSTEM ALERT";

  return (
    <div
      className={`alert-banner severity-${severityClass}`}
      role="alert"
      aria-live="assertive"
      id="active-study-alert"
    >
      <div className="alert-banner-inner">
        <div className="alert-icon-wrap" aria-hidden="true">
          <span className="alert-icon">{activeAlert.icon || "⚠️"}</span>
          <span className="alert-beacon-ring" />
        </div>

        <div className="alert-text-content">
          <div className="alert-header-row">
            <span className="alert-tag">{systemTag}</span>
            <span className="alert-dot-sep" aria-hidden="true">•</span>
            <span className="alert-timestamp">Real-time Priority Trigger</span>
          </div>
          <h4 className="alert-title">{activeAlert.title}</h4>
          <p className="alert-message">{activeAlert.message}</p>
        </div>

        <div className="alert-actions">
          <button
            className={`alert-mute-btn ${isMuted ? "is-muted" : ""}`}
            type="button"
            onClick={onToggleMute}
            title={isMuted ? "Unmute alarm audio" : "Mute alarm audio"}
            aria-label={isMuted ? "Unmute alarm audio" : "Mute alarm audio"}
          >
            <span aria-hidden="true">{isMuted ? "🔇" : "🔊"}</span>
            <span className="sr-only">{isMuted ? "Unmute" : "Mute"}</span>
          </button>

          <button
            className="btn btn-sm btn-dismiss"
            type="button"
            onClick={onDismiss}
            id="dismiss-alert-btn"
            aria-label="Dismiss active alert"
          >
            <span aria-hidden="true">✕</span> Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

export default AlertNotification;
