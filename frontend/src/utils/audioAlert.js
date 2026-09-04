/**
 * StudyGuard AI - Unified Audio Alert Service
 * Reliable HTML5 Audio playback supporting customizable built-in alarm tunes
 * with user-gesture unlocking, single reusable audio instances, non-restarting loops,
 * independent preview playback, immediate condition clearance, and graceful Web Audio API fallback.
 */

export const BUILTIN_ALARMS = [
  {
    id: "classic",
    name: "Classic Alert",
    description: "Standard StudyGuard pulse alarm",
    path: "/sounds/studyguard-alarm.mp3",
    icon: "🔔",
  },
  {
    id: "focus",
    name: "Focus Alarm",
    description: "Ascending energetic dual chime",
    path: "/sounds/focus-alert.mp3",
    icon: "⚡",
  },
  {
    id: "digital",
    name: "Digital Warning",
    description: "Futuristic cybernetic triple pulse",
    path: "/sounds/digital-alert.mp3",
    icon: "🤖",
  },
  {
    id: "gentle",
    name: "Gentle Reminder",
    description: "Warm mellow harmonic chord chime",
    path: "/sounds/gentle-alert.mp3",
    icon: "🍃",
  },
  {
    id: "urgent",
    name: "High Priority",
    description: "Urgent rhythmic alternating cadence",
    path: "/sounds/high-priority.mp3",
    icon: "🚨",
  },
];

export const DEFAULT_ALARM_ID = "classic";

let selectedAlarmId = DEFAULT_ALARM_ID;
let currentSoundPath = BUILTIN_ALARMS[0].path;

let alarmAudio = null;
let isPlaying = false;
let isTestPlaying = false;
let testTimeoutId = null;

// Preview audio management (isolated from main alert lifecycle)
let previewAudio = null;
let previewTimeoutId = null;
let activePreviewId = null;

let audioContext = null;

// Web Audio Fallback state
let activeOscillators = [];
let activeGainNode = null;
let syntheticIntervalId = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      audioContext = new AudioCtx();
    }
  }
  if (audioContext && audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

/**
 * Gets or initializes the single reusable HTMLAudioElement for alerts.
 */
function getAlarmAudio(soundPath = currentSoundPath) {
  if (typeof window === "undefined") return null;
  if (!alarmAudio) {
    alarmAudio = new Audio(soundPath);
    alarmAudio.preload = "auto";
    alarmAudio.addEventListener("error", (e) => {
      console.warn("[StudyGuard Audio] Custom MP3 error or not found:", soundPath, e);
    });
  } else if (alarmAudio.src && !alarmAudio.src.endsWith(soundPath)) {
    const wasPlaying = !alarmAudio.paused;
    alarmAudio.src = soundPath;
    alarmAudio.load();
    if (wasPlaying) {
      alarmAudio.play().catch(() => {});
    }
  }
  return alarmAudio;
}

/**
 * Gets or initializes the isolated preview HTMLAudioElement.
 */
function getPreviewAudio() {
  if (typeof window === "undefined") return null;
  if (!previewAudio) {
    previewAudio = new Audio();
    previewAudio.preload = "auto";
    previewAudio.addEventListener("ended", () => {
      stopPreviewSound();
    });
    previewAudio.addEventListener("error", (e) => {
      console.warn("[StudyGuard Audio] Preview audio error:", e);
      stopPreviewSound();
    });
  }
  return previewAudio;
}

/**
 * Sets the active alarm tune by ID or direct sound path.
 */
export function setSelectedAlarmSound(alarmIdOrPath) {
  const match = BUILTIN_ALARMS.find(
    (a) => a.id === alarmIdOrPath || a.path === alarmIdOrPath
  );
  if (match) {
    selectedAlarmId = match.id;
    currentSoundPath = match.path;
  } else if (typeof alarmIdOrPath === "string" && alarmIdOrPath.startsWith("/")) {
    currentSoundPath = alarmIdOrPath;
    selectedAlarmId = "custom";
  }

  // Preload new audio source if alarmAudio exists and is not currently actively alerting
  if (alarmAudio && !isPlaying) {
    try {
      alarmAudio.src = currentSoundPath;
      alarmAudio.load();
    } catch {}
  }

  return currentSoundPath;
}

/**
 * Gets current selected alarm sound ID.
 */
export function getSelectedAlarmId() {
  return selectedAlarmId;
}

/**
 * Gets current selected alarm metadata object.
 */
export function getSelectedAlarmSound() {
  return (
    BUILTIN_ALARMS.find((a) => a.id === selectedAlarmId) || BUILTIN_ALARMS[0]
  );
}

/**
 * Unlocks the audio subsystem during user interactions
 * (e.g., Enable Camera, Start Session, Test Alarm, or page click/key press).
 */
export function unlockAudio() {
  try {
    const audio = getAlarmAudio();
    if (audio) {
      audio.load();
    }
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  } catch (err) {
    // Non-fatal unlock error
  }
}

/**
 * Cleanly stops any active synthetic Web Audio oscillators and intervals.
 */
function stopSyntheticChime() {
  if (syntheticIntervalId !== null) {
    clearInterval(syntheticIntervalId);
    syntheticIntervalId = null;
  }

  activeOscillators.forEach((osc) => {
    try {
      osc.stop();
      osc.disconnect();
    } catch {}
  });
  activeOscillators = [];

  if (activeGainNode) {
    try {
      activeGainNode.disconnect();
    } catch {}
    activeGainNode = null;
  }
}

/**
 * Plays a single synthetic chime cycle.
 */
function triggerSingleSyntheticChime(volume = 0.6) {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(0.01, volume * 0.45), now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    gainNode.connect(ctx.destination);
    activeGainNode = gainNode;

    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now);
    osc1.frequency.setValueAtTime(880.0, now + 0.18);
    osc1.connect(gainNode);

    const osc2 = ctx.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(329.63, now);
    osc2.frequency.setValueAtTime(440.0, now + 0.18);
    osc2.connect(gainNode);

    activeOscillators.push(osc1, osc2);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.7);
    osc2.stop(now + 0.7);

    setTimeout(() => {
      activeOscillators = activeOscillators.filter((o) => o !== osc1 && o !== osc2);
    }, 750);
  } catch (err) {
    console.warn("[StudyGuard Audio] Synthetic chime error:", err);
  }
}

/**
 * Starts continuous synthetic fallback chime repeating until stopAlertSound is called.
 */
function startSyntheticChime(volume = 0.6, loop = true) {
  stopSyntheticChime();
  triggerSingleSyntheticChime(volume);

  if (loop) {
    syntheticIntervalId = setInterval(() => {
      triggerSingleSyntheticChime(volume);
    }, 900);
  }
}

/**
 * Starts the alarm audio.
 * Uses the currently selected alarm sound with seamless looping.
 * If already playing, maintains playback without restarting from time 0.
 */
export async function startAlertSound(options = {}) {
  const {
    volume = 0.6,
    isMuted = false,
    soundPath = currentSoundPath,
    loop = true,
  } = options;

  if (isMuted || volume <= 0) {
    stopAlertSound();
    return false;
  }

  // If a preview was playing, stop it so it doesn't clash with real alert
  stopPreviewSound();

  // Clear any active test timeout
  if (testTimeoutId) {
    clearTimeout(testTimeoutId);
    testTimeoutId = null;
    isTestPlaying = false;
  }

  const audio = getAlarmAudio(soundPath);
  const clampedVolume = Math.max(0, Math.min(1, volume));

  // If already playing alarm audio and not paused, simply update volume and loop setting
  if (isPlaying && audio && !audio.paused) {
    audio.volume = clampedVolume;
    audio.loop = loop;
    return true;
  }

  isPlaying = true;

  if (audio) {
    try {
      if (audio.src && !audio.src.endsWith(soundPath)) {
        audio.src = soundPath;
        audio.load();
      }
      audio.volume = clampedVolume;
      audio.loop = loop;
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
      return true;
    } catch (err) {
      isPlaying = false;
      if (err.name === "NotAllowedError") {
        console.warn("[StudyGuard Audio] Autoplay blocked by browser policy. Interacting with the page unlocks sound.");
      } else if (err.name === "AbortError") {
        // Play was interrupted by an immediate stop/pause (condition cleared quickly)
        return false;
      } else {
        console.warn("[StudyGuard Audio] Audio playback fallback:", err.message);
        startSyntheticChime(clampedVolume, loop);
      }
      return false;
    }
  } else {
    startSyntheticChime(clampedVolume, loop);
    return true;
  }
}

/**
 * IMMEDIATELY stops all alarm audio playback (both custom MP3 and synthetic fallback).
 * Resets playback position to 0 and releases active audio locks.
 */
export function stopAlertSound() {
  isPlaying = false;
  isTestPlaying = false;

  if (testTimeoutId) {
    clearTimeout(testTimeoutId);
    testTimeoutId = null;
  }

  if (alarmAudio) {
    try {
      alarmAudio.pause();
      alarmAudio.currentTime = 0;
    } catch (err) {}
  }

  stopSyntheticChime();
}

/**
 * Updates the volume of currently playing audio without interrupting playback.
 */
export function setAlertVolume(volume = 0.6) {
  const clamped = Math.max(0, Math.min(1, volume));
  if (alarmAudio) {
    try {
      alarmAudio.volume = clamped;
    } catch {}
  }
  if (previewAudio) {
    try {
      previewAudio.volume = clamped;
    } catch {}
  }
}

/**
 * Tests the currently selected alarm playback explicitly triggered by user interaction.
 */
export async function testAlertSound(volume = 0.6, isMuted = false, soundPath = currentSoundPath) {
  unlockAudio();
  stopAlertSound();
  stopPreviewSound();

  if (isMuted || volume <= 0) {
    return false;
  }

  const audio = getAlarmAudio(soundPath);
  const clampedVolume = Math.max(0, Math.min(1, volume));

  if (!audio) {
    startSyntheticChime(clampedVolume, false);
    return true;
  }

  try {
    if (audio.src && !audio.src.endsWith(soundPath)) {
      audio.src = soundPath;
      audio.load();
    }
    audio.volume = clampedVolume;
    audio.loop = false;
    audio.currentTime = 0;
    isTestPlaying = true;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      await playPromise;
    }

    testTimeoutId = setTimeout(() => {
      if (isTestPlaying) {
        stopAlertSound();
      }
    }, 2800);

    return true;
  } catch (err) {
    console.warn("[StudyGuard Audio] Test alarm play prevented:", err.message);
    isTestPlaying = false;
    startSyntheticChime(clampedVolume, false);
    return false;
  }
}

/**
 * Isolated Preview function for previewing alarm sounds without affecting smart alerts.
 * Rules:
 * 1. Only one preview audio plays at a time.
 * 2. Clicking same preview stops it (toggle).
 * 3. Starting another preview cleanly stops previous.
 * 4. Automatically stops after tune duration or timeout.
 */
export async function previewAlertSound(alarmId, volume = 0.6, onStateChange = null) {
  unlockAudio();

  // If already previewing this exact alarm, toggle it off
  if (activePreviewId === alarmId) {
    stopPreviewSound();
    if (onStateChange) onStateChange(null);
    return false;
  }

  // Stop any ongoing preview
  stopPreviewSound();

  const match = BUILTIN_ALARMS.find((a) => a.id === alarmId);
  const soundPath = match ? match.path : currentSoundPath;

  const preview = getPreviewAudio();
  if (!preview) return false;

  try {
    activePreviewId = alarmId;
    preview.src = soundPath;
    preview.volume = Math.max(0, Math.min(1, volume));
    preview.loop = false;
    preview.currentTime = 0;

    const playPromise = preview.play();
    if (playPromise !== undefined) {
      await playPromise;
    }

    if (onStateChange) onStateChange(alarmId);

    // Auto timeout safeguard (max 3.2s preview)
    previewTimeoutId = setTimeout(() => {
      stopPreviewSound();
      if (onStateChange) onStateChange(null);
    }, 3200);

    return true;
  } catch (err) {
    console.warn("[StudyGuard Audio] Preview playback error:", err);
    stopPreviewSound();
    if (onStateChange) onStateChange(null);
    return false;
  }
}

/**
 * Stops preview audio playback cleanly.
 */
export function stopPreviewSound() {
  if (previewTimeoutId) {
    clearTimeout(previewTimeoutId);
    previewTimeoutId = null;
  }
  if (previewAudio) {
    try {
      previewAudio.pause();
      previewAudio.currentTime = 0;
    } catch {}
  }
  activePreviewId = null;
}

/**
 * Returns currently active preview alarm ID (or null if none).
 */
export function getActivePreviewId() {
  return activePreviewId;
}

/**
 * Checks whether an alarm is currently playing.
 */
export function isAlertSoundPlaying() {
  return isPlaying || isTestPlaying;
}
