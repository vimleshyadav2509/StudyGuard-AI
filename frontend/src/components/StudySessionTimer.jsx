import { useCallback, useEffect, useRef, useState } from "react";

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
  idle: "Set up and start your study session when you are ready.",
  running: "Session in progress. Stay focused on your goals.",
  paused: "Session paused. Take a brief breath and resume when ready.",
  ended: "Session completed. Great work on dedicating focused time.",
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
      <div className="session-intro">
        <div>
          <p className="eyebrow">STUDY SESSION</p>
          <h2 id="session-title">Focused study timer</h2>
        </div>
        <p>
          Track dedicated study intervals at your own pace. Works independently alongside camera monitoring.
        </p>
      </div>

      <div className="session-card">
        <div className="session-header-row">
          <div className="session-status-container">
            <span className="status-label">SESSION STATUS</span>
            <div className={`session-status ${sessionState}`} role="status" aria-live="polite">
              <span className="status-dot" aria-hidden="true" />
              {sessionState === "idle" && "Ready"}
              {sessionState === "running" && "Running"}
              {sessionState === "paused" && "Paused"}
              {sessionState === "ended" && "Ended"}
            </div>
          </div>
          <p className="session-status-message">{sessionMessages[sessionState]}</p>
        </div>

        <div className="session-timer-display" aria-label="Session elapsed time">
          <span className="timer-icon" aria-hidden="true">⏱</span>
          <span className="timer-digits">{formatTime(elapsedSeconds)}</span>
        </div>

        <div className="session-controls">
          {sessionState === "idle" && (
            <button
              className="session-button start-button"
              type="button"
              onClick={handleStartSession}
            >
              ▶ Start Session
            </button>
          )}

          {sessionState === "running" && (
            <div className="button-group">
              <button
                className="session-button pause-button"
                type="button"
                onClick={handlePauseSession}
              >
                ⏸ Pause Session
              </button>
              <button
                className="session-button end-button"
                type="button"
                onClick={handleEndSession}
              >
                ⏹ End Session
              </button>
            </div>
          )}

          {sessionState === "paused" && (
            <div className="button-group">
              <button
                className="session-button resume-button"
                type="button"
                onClick={handleResumeSession}
              >
                ▶ Resume Session
              </button>
              <button
                className="session-button end-button"
                type="button"
                onClick={handleEndSession}
              >
                ⏹ End Session
              </button>
            </div>
          )}

          {sessionState === "ended" && (
            <div className="button-group">
              <button
                className="session-button start-button"
                type="button"
                onClick={handleStartSession}
              >
                ▶ Start New Session
              </button>
              <button
                className="session-button secondary-button"
                type="button"
                onClick={handleResetSession}
              >
                ↺ Reset Timer
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default StudySessionTimer;
