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
  const isDeviceActive = electronicDeviceEnabled !== undefined ? electronicDeviceEnabled : mobileEnabled;
  const onDeviceToggle = (val) => {
    if (setElectronicDeviceEnabled) setElectronicDeviceEnabled(val);
    if (setMobileEnabled) setMobileEnabled(val);
  };
  return (
    <section className="alert-settings-section" id="alert-settings" aria-labelledby="settings-title">
      <div className="section-header">
        <div>
          <span className="section-tag">SMART ALERT CONTROLS</span>
          <h2 id="settings-title" className="section-title">Alert & Sound Preferences</h2>
        </div>
        <p className="section-desc">
          Customize multi-condition triggers, alarm volume, and notification parameters.
        </p>
      </div>

      <div className="settings-card">
        <div className="settings-grid">
          {/* MASTER SWITCHES */}
          <div className="settings-group">
            <h3 className="settings-group-title">Master Triggers</h3>

            <div className="setting-toggle-row">
              <div className="toggle-label-wrap">
                <strong>Visual Alerts</strong>
                <span>Show banner when attention drops or fatigue is detected</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={alertsEnabled}
                  onChange={(e) => setAlertsEnabled(e.target.checked)}
                  aria-label="Toggle visual alerts"
                />
                <span className="toggle-slider" />
              </label>
            </div>

            <div className="setting-toggle-row">
              <div className="toggle-label-wrap">
                <strong>Audible Alarm</strong>
                <span>Play custom tune (/sounds/studyguard-alarm.mp3) on trigger</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  aria-label="Toggle audible alarm"
                />
                <span className="toggle-slider" />
              </label>
            </div>

            {/* VOLUME CONTROL */}
            <div className="volume-control-row">
              <div className="volume-label-wrap">
                <strong>Alarm Volume</strong>
                <span>{Math.round(volume * 100)}%</span>
              </div>
              <div className="volume-slider-box">
                <span aria-hidden="true">🔈</span>
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
                />
                <span aria-hidden="true">🔊</span>
              </div>
            </div>

            <div className="test-sound-action">
              <button
                className="btn btn-secondary btn-block"
                type="button"
                onClick={onTestSound}
                disabled={!soundEnabled}
                id="test-alarm-btn"
              >
                <span aria-hidden="true">🔔</span> {isTestingSound ? "Playing Test..." : "Test Alarm Tune"}
              </button>
            </div>
          </div>

          {/* GRANULAR CONDITION TOGGLES */}
          <div className="settings-group">
            <h3 className="settings-group-title">Monitored Conditions</h3>

            <div className="setting-toggle-row">
              <div className="toggle-label-wrap">
                <span className="condition-icon-badge" aria-hidden="true">😴</span>
                <div>
                  <strong>Drowsiness Alert</strong>
                  <span>Triggers on 2.0s sustained eye closure (Priority 1)</span>
                </div>
              </div>
              <label className="toggle-switch">
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

            <div className="setting-toggle-row">
              <div className="toggle-label-wrap">
                <span className="condition-icon-badge" aria-hidden="true">📱</span>
                <div>
                  <strong>Electronic Device Detection</strong>
                  <span>Detects distracting electronic devices such as phones, laptops, tablets, monitors, keyboards, mice, and remote controls (Priority 2)</span>
                </div>
              </div>
              <label className="toggle-switch">
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

            <div className="setting-toggle-row">
              <div className="toggle-label-wrap">
                <span className="condition-icon-badge" aria-hidden="true">👀</span>
                <div>
                  <strong>Looking Away Alert</strong>
                  <span>Triggers on prolonged head/gaze deviation (Priority 3)</span>
                </div>
              </div>
              <label className="toggle-switch">
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

            <div className="setting-toggle-row">
              <div className="toggle-label-wrap">
                <span className="condition-icon-badge" aria-hidden="true">🎯</span>
                <div>
                  <strong>Study Focus Drop</strong>
                  <span>Triggers on attention reduction debounce (Priority 4)</span>
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={attentionEnabled}
                  onChange={(e) => setAttentionEnabled(e.target.checked)}
                  disabled={!alertsEnabled}
                  aria-label="Toggle study focus drop alert"
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        </div>

        <div className="settings-footer-note">
          <span className="info-icon" aria-hidden="true">⏱</span>
          <span>
            <strong>Anti-Spam Cooldown:</strong> Alerts enforce a 10-second cooldown window and single-event latching so alarms never loop repeatedly while a condition remains active.
          </span>
        </div>
      </div>
    </section>
  );
}

export default AlertSettings;
