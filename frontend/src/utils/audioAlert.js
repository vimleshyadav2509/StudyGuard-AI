/**
 * StudyGuard AI - Unified Audio Alert Service
 * Supports explicit lifecycle (startAlertSound, stopAlertSound, testAlertSound)
 * using custom MP3 (/sounds/studyguard-alarm.mp3) with Web Audio API synthetic fallback.
 */

let audioContext = null;
let currentAudioElement = null;
let isPlaying = false;

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
    console.warn("Synthetic chime error:", err);
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
 * Uses custom MP3 at /sounds/studyguard-alarm.mp3 if available, or synthetic fallback.
 * If already playing, maintains playback without restarting from time 0.
 */
export function startAlertSound(options = {}) {
  const {
    volume = 0.6,
    isMuted = false,
    soundPath = "/sounds/studyguard-alarm.mp3",
    loop = true,
  } = options;

  if (isMuted || volume <= 0) {
    stopAlertSound();
    return Promise.resolve(false);
  }

  if (isPlaying && currentAudioElement) {
    // Already playing the custom audio element: update volume and ensure loop flag
    currentAudioElement.volume = Math.max(0, Math.min(1, volume));
    currentAudioElement.loop = loop;
    return Promise.resolve(true);
  }

  isPlaying = true;

  return new Promise((resolve) => {
    try {
      if (!currentAudioElement) {
        currentAudioElement = new Audio(soundPath);
      }

      currentAudioElement.volume = Math.max(0, Math.min(1, volume));
      currentAudioElement.loop = loop;
      currentAudioElement.currentTime = 0;

      const playPromise = currentAudioElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            resolve(true);
          })
          .catch(() => {
            // Audio file not found or browser restricted -> use Web Audio API fallback
            startSyntheticChime(volume, loop);
            resolve(true);
          });
      } else {
        startSyntheticChime(volume, loop);
        resolve(true);
      }
    } catch {
      startSyntheticChime(volume, loop);
      resolve(true);
    }
  });
}

/**
 * IMMEDIATELY stops all alarm audio playback (both custom MP3 and synthetic fallback).
 * Resets playback position to 0 and releases audio resources.
 */
export function stopAlertSound() {
  isPlaying = false;

  // 1. Immediately pause and reset HTML5 audio element
  if (currentAudioElement) {
    try {
      currentAudioElement.pause();
      currentAudioElement.currentTime = 0;
    } catch {}
  }

  // 2. Immediately stop any active synthetic Web Audio chimes/oscillators
  stopSyntheticChime();
}

/**
 * Updates the volume of currently playing audio without interrupting playback.
 */
export function setAlertVolume(volume = 0.6) {
  const clamped = Math.max(0, Math.min(1, volume));
  if (currentAudioElement) {
    try {
      currentAudioElement.volume = clamped;
    } catch {}
  }
}

/**
 * Tests alarm playback explicitly triggered by user interaction.
 */
export function testAlertSound(volume = 0.6, isMuted = false) {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  stopAlertSound();
  return startAlertSound({ volume, isMuted, loop: false });
}

/**
 * Checks whether an alarm is currently playing.
 */
export function isAlertSoundPlaying() {
  return isPlaying;
}
