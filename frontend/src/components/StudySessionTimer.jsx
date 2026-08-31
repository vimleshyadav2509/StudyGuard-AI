import { useCallback, useEffect, useRef, useState } from "react";
import { unlockAudio } from "../utils/audioAlert";

/**
 * Formats elapsed seconds into HH:MM:SS format.
 * @param {number} totalSeconds
 * @returns {string} Formatted time string
 */
function formatTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (num) => String(num).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

const sessionMessages = {
  idle: "Set up and start your deep work study session when you are ready.",
  running: "Session in progress. Maintaining continuous study focus.",
  paused: "Session paused. Take a brief breath and resume when ready.",
  ended: "Session concluded. Focused deep work recorded successfully.",
};

const sessionStateLabels = {
  idle: "READY",
  running: "SESSION ACTIVE",
  paused: "PAUSED",
  ended: "SESSION COMPLETE",
};

function StudySessionTimer() {
  // Session states: 'idle' | 'running' | 'paused' | 'ended'
  const [sessionState, setSessionState] = useState("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // High-precision timestamp references to prevent interval drift
  const startTimeRef = useRef(0);
  const accumulatedMsRef = useRef(0);
  const intervalIdRef = useRef(null);
  const isMountedRef = useRef(true);

  const clearTimerInterval = useCallback(() => {
    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  }, []);

  const calculateTotalElapsedSeconds = useCallback(() => {
    let totalMs = accumulatedMsRef.current;
    if (startTimeRef.current > 0) {
      totalMs += Date.now() - startTimeRef.current;
    }
    return Math.floor(totalMs / 1000);
  }, []);

  const startTicking = useCallback(() => {
    clearTimerInterval();
    intervalIdRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      const totalSeconds = calculateTotalElapsedSeconds();
      setElapsedSeconds(totalSeconds);
    }, 250);
  }, [calculateTotalElapsedSeconds, clearTimerInterval]);

  const handleStartSession = useCallback(() => {
    unlockAudio();
    clearTimerInterval();
    accumulatedMsRef.current = 0;
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    setSessionState("running");
    startTicking();
  }, [clearTimerInterval, startTicking]);

  const handlePauseSession = useCallback(() => {
    if (startTimeRef.current > 0) {
      accumulatedMsRef.current += Date.now() - startTimeRef.current;
      startTimeRef.current = 0;
    }
    clearTimerInterval();
    const finalSeconds = Math.floor(accumulatedMsRef.current / 1000);
    setElapsedSeconds(finalSeconds);
    setSessionState("paused");
  }, [clearTimerInterval]);

  const handleResumeSession = useCallback(() => {
    unlockAudio();
    clearTimerInterval();
    startTimeRef.current = Date.now();
    setSessionState("running");
    startTicking();
  }, [clearTimerInterval, startTicking]);

  const handleEndSession = useCallback(() => {
    if (startTimeRef.current > 0) {
      accumulatedMsRef.current += Date.now() - startTimeRef.current;
      startTimeRef.current = 0;
    }
    clearTimerInterval();
    const finalSeconds = Math.floor(accumulatedMsRef.current / 1000);
    setElapsedSeconds(finalSeconds);
    setSessionState("ended");
  }, [clearTimerInterval]);

  const handleResetSession = useCallback(() => {
    clearTimerInterval();
    accumulatedMsRef.current = 0;
    startTimeRef.current = 0;
    setElapsedSeconds(0);
    setSessionState("idle");
  }, [clearTimerInterval]);

  // Clean up interval on component unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      clearTimerInterval();
    };
  }, [clearTimerInterval]);

  return (
    <section className="session-section" id="session" aria-labelledby="session-title">
      <div className="section-header">
        <div>
          <span className="section-tag">SESSION MANAGEMENT</span>
          <h2 id="session-title" className="section-title">STUDY SESSION</h2>
          <p className="section-subtitle-text">Deep work session</p>
        </div>
        <div className={`session-status-pill ${sessionState}`} role="status" aria-live="polite">
          <span className="status-dot" aria-hidden="true" />
          <span>{sessionStateLabels[sessionState]}</span>
        </div>
      </div>

      <div className="session-card">
        <div className="session-card-header-bar">
          <div className="session-mode-badge">
            <span className="spark-dot" aria-hidden="true" />
            <span>DEEP WORK CHRONOMETER</span>
          </div>
          <p className="session-status-message">{sessionMessages[sessionState]}</p>
        </div>

        {/* Centerpiece Digital Chronometer */}
        <div className={`session-timer-display is-${sessionState}`} aria-label={`Elapsed session time: ${formatTime(elapsedSeconds)}`}>
          <div className="timer-badge" aria-hidden="true">
            <span className="timer-icon">⏱</span>
            <span className="timer-mode-label">SESSION TIME</span>
          </div>
          <div className="timer-digits-wrapper">
            <span className="timer-digits" id="timer-display-digits">{formatTime(elapsedSeconds)}</span>
          </div>
          <div className="timer-ambient-glow" aria-hidden="true" />
        </div>

        {/* Session Action Controls */}
        <div className="session-controls">
          {sessionState === "idle" && (
            <button
              className="btn btn-primary btn-lg btn-session-main"
              type="button"
              onClick={handleStartSession}
              id="start-session-btn"
              aria-label="Start study session"
            >
              <span aria-hidden="true">▶</span> Start Study Session
            </button>
          )}

          {sessionState === "running" && (
            <div className="button-group">
              <button
                className="btn btn-warning btn-lg btn-session-action"
                type="button"
                onClick={handlePauseSession}
                id="pause-session-btn"
                aria-label="Pause study session"
              >
                <span aria-hidden="true">⏸</span> Pause Session
              </button>
              <button
                className="btn btn-danger btn-lg btn-session-action"
                type="button"
                onClick={handleEndSession}
                id="end-session-btn"
                aria-label="End study session"
              >
                <span aria-hidden="true">⏹</span> End Session
              </button>
            </div>
          )}

          {sessionState === "paused" && (
            <div className="button-group">
              <button
                className="btn btn-primary btn-lg btn-session-action"
                type="button"
                onClick={handleResumeSession}
                id="resume-session-btn"
                aria-label="Resume study session"
              >
                <span aria-hidden="true">▶</span> Resume Session
              </button>
              <button
                className="btn btn-danger btn-lg btn-session-action"
                type="button"
                onClick={handleEndSession}
                id="end-session-btn"
                aria-label="End study session"
              >
                <span aria-hidden="true">⏹</span> End Session
              </button>
            </div>
          )}

          {sessionState === "ended" && (
            <div className="button-group">
              <button
                className="btn btn-primary btn-lg btn-session-action"
                type="button"
                onClick={handleStartSession}
                id="start-new-session-btn"
                aria-label="Start new study session"
              >
                <span aria-hidden="true">▶</span> Start New Session
              </button>
              <button
                className="btn btn-secondary btn-lg btn-session-action"
                type="button"
                onClick={handleResetSession}
                id="reset-session-btn"
                aria-label="Reset timer to zero"
              >
                <span aria-hidden="true">↺</span> Reset Timer
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default StudySessionTimer;
