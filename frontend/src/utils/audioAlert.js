/**
 * StudyGuard AI - Unified Audio Alert Service
 * Reliable HTML5 Audio playback for custom MP3 (/sounds/studyguard-alarm.mp3)
 * with user-gesture unlocking, single reusable audio instance, non-restarting loops,
 * immediate condition clearance, and graceful Web Audio API fallback.
 */

const ALARM_SOUND_PATH = "/sounds/studyguard-alarm.mp3";

let alarmAudio = null;
let isPlaying = false;
let isTestPlaying = false;
let testTimeoutId = null;
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
 * Gets or initializes the single reusable HTMLAudioElement.
 */
function getAlarmAudio() {
  if (typeof window === "undefined") return null;
  if (!alarmAudio) {
    alarmAudio = new Audio(ALARM_SOUND_PATH);
    alarmAudio.preload = "auto";
    alarmAudio.addEventListener("error", (e) => {
      console.warn("[StudyGuard Audio] Custom MP3 error or not found:", ALARM_SOUND_PATH, e);
    });
  }
  return alarmAudio;
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
 * Uses custom MP3 at /sounds/studyguard-alarm.mp3 with seamless looping.
 * If already playing, maintains playback without restarting from time 0.
 */
export async function startAlertSound(options = {}) {
  const {
    volume = 0.6,
    isMuted = false,
    soundPath = ALARM_SOUND_PATH,
    loop = true,
  } = options;

  if (isMuted || volume <= 0) {
    stopAlertSound();
    return false;
  }

  // Clear any active test timeout
  if (testTimeoutId) {
    clearTimeout(testTimeoutId);
    testTimeoutId = null;
    isTestPlaying = false;
  }

  const audio = getAlarmAudio();
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
      audio.volume = clampedVolume;
      audio.loop = loop;
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
      return true;
    } catch (err) {
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
}

/**
 * Tests alarm playback explicitly triggered by user interaction.
 */
export async function testAlertSound(volume = 0.6, isMuted = false) {
  unlockAudio();
  stopAlertSound();

  if (isMuted || volume <= 0) {
    return false;
  }

  const audio = getAlarmAudio();
  const clampedVolume = Math.max(0, Math.min(1, volume));

  if (!audio) {
    startSyntheticChime(clampedVolume, false);
    return true;
  }

  try {
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
 * Checks whether an alarm is currently playing.
 */
export function isAlertSoundPlaying() {
  return isPlaying || isTestPlaying;
}
