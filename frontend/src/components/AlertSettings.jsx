function AlertSettings({
  alertsEnabled,
  setAlertsEnabled,
  soundEnabled,
  setSoundEnabled,
  volume,
  setVolume,
  drowsinessEnabled,
  setDrowsinessEnabled,
  electronicDeviceEnabled,
  setElectronicDeviceEnabled,
  mobileEnabled,
  setMobileEnabled,
  lookingAwayEnabled,
  setLookingAwayEnabled,
  attentionEnabled,
  setAttentionEnabled,
  onTestSound,
  isTestingSound,
}) {
  const isDeviceActive =
    electronicDeviceEnabled !== undefined ? electronicDeviceEnabled : mobileEnabled;

  const onDeviceToggle = (val) => {
    if (setElectronicDeviceEnabled) setElectronicDeviceEnabled(val);
    if (setMobileEnabled) setMobileEnabled(val);
  };

  const handleToggleMute = () => {
    setSoundEnabled(!soundEnabled);
  };

  return (
    <section className="alert-settings-section" id="alert-settings" aria-labelledby="settings-title">
      <div className="section-header">
        <div>
          <span className="section-tag">CONTROL CENTER</span>
          <h2 id="settings-title" className="section-title">SMART ALERT CONTROL</h2>
          <p className="section-subtitle-text">Configure your real-time study protection system.</p>
        </div>
        <div className="alert-engine-status-pill" role="status" aria-label="Alert engine status: online">
          <span className="status-dot online" aria-hidden="true" />
          <span>ALERT ENGINE ONLINE</span>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-grid">
          {/* LEFT COLUMN: DEDICATED ALARM OUTPUT & MASTER SYSTEM CONTROLS */}
          <div className="settings-group alarm-output-group">
            <div className="group-header-row">
              <div className="group-title-wrap">
                <span className="group-icon-wrap" aria-hidden="true">🔊</span>
                <div>
                  <h3 className="settings-group-title">ALARM OUTPUT</h3>
                  <span className="settings-group-subtitle">Master audio parameters and alert delivery</span>
                </div>
              </div>
            </div>

            {/* Master Visual Alerts Toggle */}
            <div className={`setting-toggle-row ${!alertsEnabled ? "is-disabled-row" : ""}`}>
              <div className="toggle-label-wrap">
                <div className="toggle-badge-icon visual-icon" aria-hidden="true">👁️</div>
                <div className="toggle-info-col">
                  <strong>Visual Alerts</strong>
                  <span>Display floating HUD warnings on camera focus loss or fatigue</span>
                </div>
              </div>
              <label className="toggle-switch" aria-label="Toggle visual alerts">
                <input
                  type="checkbox"
                  checked={alertsEnabled}
                  onChange={(e) => setAlertsEnabled(e.target.checked)}
                  aria-label="Toggle visual alerts"
                />
                <span className="toggle-slider" />
              </label>
            </div>

            {/* Master Audible Alarm Toggle */}
            <div className={`setting-toggle-row ${!soundEnabled ? "is-muted-row" : ""}`}>
              <div className="toggle-label-wrap">
                <div className="toggle-badge-icon sound-icon" aria-hidden="true">
                  {soundEnabled ? "🔔" : "🔕"}
                </div>
                <div className="toggle-info-col">
                  <strong>Audible Alarm</strong>
                  <span>Play audio alert (/sounds/studyguard-alarm.mp3) on trigger</span>
                </div>
              </div>
              <label className="toggle-switch" aria-label="Toggle audible alarm">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  aria-label="Toggle audible alarm"
                />
                <span className="toggle-slider" />
              </label>
            </div>

            {/* Volume Control Module */}
            <div className={`volume-control-row ${!soundEnabled ? "is-disabled" : ""}`}>
              <div className="volume-label-wrap">
                <div className="flex items-center gap-2">
                  <span className="vol-icon" aria-hidden="true">🔊</span>
                  <strong>Alarm Volume</strong>
                </div>
                <div className="volume-readout-pill">
                  <span>{soundEnabled ? `${Math.round(volume * 100)}%` : "MUTED"}</span>
                </div>
              </div>
              <div className="volume-slider-box">
                <span className="slider-end-icon" aria-hidden="true">🔈</span>
                <input
                  className="volume-slider"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  disabled={!soundEnabled}
                  aria-label="Alarm volume slider"
                  style={{
                    background: `linear-gradient(to right, #06b6d4 0%, #a855f7 ${volume * 100}%, rgba(51, 65, 85, 0.6) ${volume * 100}%, rgba(51, 65, 85, 0.6) 100%)`,
                  }}
                />
                <span className="slider-end-icon" aria-hidden="true">🔊</span>
              </div>
            </div>

            {/* Audio Quick Actions: Mute & Test Alarm */}
            <div className="alarm-action-buttons-grid">
              <button
                className={`btn btn-secondary ${!soundEnabled ? "btn-mute-active" : ""}`}
                type="button"
                onClick={handleToggleMute}
                aria-label={soundEnabled ? "Mute alarm audio" : "Unmute alarm audio"}
              >
                <span aria-hidden="true">{soundEnabled ? "🔇 Mute Alarm" : "🔊 Unmute Alarm"}</span>
              </button>

              <button
                className="btn btn-secondary"
                type="button"
                onClick={onTestSound}
                disabled={!soundEnabled}
                id="test-alarm-btn"
                aria-label="Play test alarm tune"
              >
                <span aria-hidden="true">{isTestingSound ? "⚡" : "🔔"}</span>{" "}
                {isTestingSound ? "Playing Test..." : "Test Alarm"}
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: GRANULAR MONITORED CONDITIONS */}
          <div className="settings-group conditions-group">
            <div className="group-header-row">
              <div className="group-title-wrap">
                <span className="group-icon-wrap" aria-hidden="true">🛡️</span>
                <div>
                  <h3 className="settings-group-title">MONITORED CONDITIONS</h3>
                  <span className="settings-group-subtitle">Prioritized on-device real-time triggers</span>
                </div>
              </div>
            </div>

            {/* Priority 1: Drowsiness Alert */}
            <div className={`setting-toggle-row condition-card ${!drowsinessEnabled || !alertsEnabled ? "is-inactive" : ""}`}>
              <div className="toggle-label-wrap">
                <span className="condition-icon-badge drowsiness-icon" aria-hidden="true">😴</span>
                <div className="toggle-info-col">
                  <div className="condition-title-row">
                    <strong>Drowsiness Alert</strong>
                    <span className="priority-tag p1">PRIORITY 1</span>
                  </div>
                  <span>Detect prolonged eye closure and potential drowsiness.</span>
                </div>
              </div>
              <label className="toggle-switch" aria-label="Toggle drowsiness alert">
                <input
                  type="checkbox"
                  checked={drowsinessEnabled}
                  onChange={(e) => setDrowsinessEnabled(e.target.checked)}
                  disabled={!alertsEnabled}
                  aria-label="Toggle drowsiness alert"
                />
                <span className="toggle-slider" />
              </label>
            </div>

            {/* Priority 2: Electronic Device Detection */}
            <div className={`setting-toggle-row condition-card ${!isDeviceActive || !alertsEnabled ? "is-inactive" : ""}`}>
              <div className="toggle-label-wrap">
                <span className="condition-icon-badge device-icon" aria-hidden="true">💻</span>
                <div className="toggle-info-col">
                  <div className="condition-title-row">
                    <strong>Electronic Device Detection</strong>
                    <span className="priority-tag p2">PRIORITY 2</span>
                  </div>
                  <span>Detect distracting electronic devices such as phones, laptops, keyboards, mice, monitors, and remote controls.</span>
                </div>
              </div>
              <label className="toggle-switch" aria-label="Toggle electronic device detection alert">
                <input
                  type="checkbox"
                  checked={isDeviceActive}
                  onChange={(e) => onDeviceToggle(e.target.checked)}
                  disabled={!alertsEnabled}
                  aria-label="Toggle electronic device detection alert"
                />
                <span className="toggle-slider" />
              </label>
            </div>

            {/* Priority 3: Looking Away Alert */}
            <div className={`setting-toggle-row condition-card ${!lookingAwayEnabled || !alertsEnabled ? "is-inactive" : ""}`}>
              <div className="toggle-label-wrap">
                <span className="condition-icon-badge looking-icon" aria-hidden="true">👀</span>
                <div className="toggle-info-col">
                  <div className="condition-title-row">
                    <strong>Looking Away Alert</strong>
                    <span className="priority-tag p3">PRIORITY 3</span>
                  </div>
                  <span>Detect when your gaze remains away from the study screen.</span>
                </div>
              </div>
              <label className="toggle-switch" aria-label="Toggle looking away alert">
                <input
                  type="checkbox"
                  checked={lookingAwayEnabled}
                  onChange={(e) => setLookingAwayEnabled(e.target.checked)}
                  disabled={!alertsEnabled}
                  aria-label="Toggle looking away alert"
                />
                <span className="toggle-slider" />
              </label>
            </div>

            {/* Priority 4: Attention Reduced */}
            <div className={`setting-toggle-row condition-card ${!attentionEnabled || !alertsEnabled ? "is-inactive" : ""}`}>
              <div className="toggle-label-wrap">
                <span className="condition-icon-badge attention-icon" aria-hidden="true">🎯</span>
                <div className="toggle-info-col">
                  <div className="condition-title-row">
                    <strong>Attention Reduced</strong>
                    <span className="priority-tag p4">PRIORITY 4</span>
                  </div>
                  <span>Warn when study focus significantly decreases.</span>
                </div>
              </div>
              <label className="toggle-switch" aria-label="Toggle attention reduced alert">
                <input
                  type="checkbox"
                  checked={attentionEnabled}
                  onChange={(e) => setAttentionEnabled(e.target.checked)}
                  disabled={!alertsEnabled}
                  aria-label="Toggle attention reduced alert"
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        </div>

        {/* Protection Engine Architecture Note */}
        <div className="settings-footer-note">
          <div className="note-icon-wrap" aria-hidden="true">
            <span className="note-pulse-dot" />
            <span className="info-icon">🛡️</span>
          </div>
          <div className="note-text-wrap">
            <strong>Autonomous Real-Time Protection:</strong> Alerts enforce intelligent temporal confirmation, single-event latching, and seamless condition-clearing so alarms stop the instant your focus is restored.
          </div>
        </div>
      </div>
    </section>
  );
}

export default AlertSettings;
