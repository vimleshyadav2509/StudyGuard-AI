import { useCallback, useEffect, useRef, useState } from "react";

const MEDIAPIPE_VISION_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs";
const MEDIAPIPE_WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const FACE_LANDMARKER_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";
const OBJECT_DETECTOR_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite";

// Configurable detection and timing constants
const DETECTION_INTERVAL_MS = 100;
const OBJECT_DETECTION_INTERVAL_MS = 250;
const MISSED_FRAMES_THRESHOLD = 3;

// Configurable EAR thresholds
const EYE_OPEN_EAR_THRESHOLD = 0.21;
const EYE_CLOSED_EAR_THRESHOLD = 0.17;

// Configurable temporal stability / debounce timings
const EYE_CLOSED_CONFIRMATION_MS = 350; // Continuous closed time to confirm "Eyes Closed"
const EYE_OPEN_CONFIRMATION_MS = 200; // Continuous open time to confirm "Eyes Open"
const DROWSINESS_CLOSED_DURATION_MS = 2000; // Continuous closed time to flag "Drowsiness Suspected"

// Configurable Study Focus timings
const FOCUS_CONFIRMATION_MS = 300; // Time in open/alert state before confirming "Focused"
const ATTENTION_REDUCED_DELAY_MS = 500; // Time in closed/drowsy state before confirming "Attention Reduced"

// Configurable Mobile Phone Detection timings
const MOBILE_CONFIRMATION_MS = 400; // Continuous detection to confirm "Mobile Detected"
const MOBILE_CLEAR_MS = 700; // Continuous absence to clear "Mobile Detected"

// Configurable Eye Direction / Looking Away timings
const LOOKING_AWAY_CONFIRMATION_MS = 1500; // Continuous deviation to confirm "Looking Away"
const LOOKING_AT_SCREEN_CONFIRMATION_MS = 350; // Continuous return to confirm "Looking at Screen"

// MediaPipe 468/478 Face Mesh landmark indices for Eye Aspect Ratio (EAR)
const LEFT_EYE_LANDMARKS = {
  p1: 33, // Outer corner
  p2: 160, // Upper eyelid outer
  p3: 158, // Upper eyelid inner
  p4: 133, // Inner corner
  p5: 153, // Lower eyelid inner
  p6: 144, // Lower eyelid outer
};

const RIGHT_EYE_LANDMARKS = {
  p1: 362, // Inner corner
  p2: 385, // Upper eyelid inner
  p3: 387, // Upper eyelid outer
  p4: 263, // Outer corner
  p5: 373, // Lower eyelid outer
  p6: 380, // Lower eyelid inner
};

// Contour indices for visual eye overlay
const LEFT_EYE_CONTOUR = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
const RIGHT_EYE_CONTOUR = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];

const cameraMessages = {
  "camera-off": "Camera is off. Enable it whenever you are ready to study.",
  starting: "Your browser is requesting camera permission.",
  active: "Camera active. Private on-device neural monitoring running locally.",
};

const faceMessages = {
  off: "Face monitoring starts when the camera is active.",
  initializing: "Loading on-device neural landmark models...",
  detected: "Face detected in camera view.",
  "not-detected": "No face detected. Move back into the camera view when you are ready.",
  error: "Face landmarker encountered an issue. Camera preview remains active.",
};

const eyeMessages = {
  "eyes-open": "Eyes are open and alert.",
  "eyes-closed": "Eyes are currently closed.",
  "eyes-unknown": "Eye tracking is unavailable or paused.",
};

const drowsinessMessages = {
  alert: "Subject is alert with eyes open.",
  "eyes-closed": "Eyes closed briefly.",
  "drowsiness-suspected": "Extended eye closure detected. Drowsiness suspected.",
  paused: "Drowsiness monitoring paused while face is not detected.",
};

const focusMessages = {
  focused: "Visual study attention maintained with eyes open.",
  "attention-reduced": "Visual attention reduced due to sustained eye closure.",
  paused: "Study focus monitoring paused while face or camera is unavailable.",
};

const mobileMessages = {
  "no-mobile": "No mobile device detected in camera field.",
  "mobile-detected": "Mobile phone visible in camera view. Put phone away to maintain focus.",
  unavailable: "Mobile detection initializing or unavailable.",
  paused: "Mobile detection paused while camera is inactive.",
};

const eyeDirectionMessages = {
  "looking-at-screen": "Gaze and head orientation aligned with study screen.",
  "looking-away": "Head or gaze turned away from screen for an extended period.",
  unknown: "Eye direction monitoring unavailable.",
  paused: "Eye direction paused while face or camera is unavailable.",
};

function distance2D(p1, p2) {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

/**
 * Calculates normalized Eye Aspect Ratio (EAR) from 6 landmark points:
 * EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
 */
function calculateEAR(landmarks, eye) {
  if (!landmarks || !landmarks[eye.p1] || !landmarks[eye.p4]) {
    return null;
  }

  const p1 = landmarks[eye.p1];
  const p2 = landmarks[eye.p2];
  const p3 = landmarks[eye.p3];
  const p4 = landmarks[eye.p4];
  const p5 = landmarks[eye.p5];
  const p6 = landmarks[eye.p6];

  const vertical1 = distance2D(p2, p6);
  const vertical2 = distance2D(p3, p5);
  const horizontal = distance2D(p1, p4);

  if (horizontal <= 0.0001) {
    return 0;
  }

  return (vertical1 + vertical2) / (2.0 * horizontal);
}

/**
 * Determines whether head orientation / gaze is directed at the screen or looking away.
 * Uses 3D landmark geometric proportions (nose index 1, left cheek 234, right cheek 454, forehead 10, chin 152).
 */
function calculateLookingAway(landmarks) {
  if (!landmarks || !landmarks[1] || !landmarks[234] || !landmarks[454]) {
    return null;
  }

  const nose = landmarks[1];
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];

  const distLeft = distance2D(nose, leftCheek);
  const distRight = distance2D(nose, rightCheek);
  const totalX = distLeft + distRight;

  if (totalX <= 0.0001) return false;

  const yawRatio = distLeft / totalX;

  let pitchRatio = 0.5;
  if (landmarks[10] && landmarks[152]) {
    const distTop = distance2D(nose, landmarks[10]);
    const distBottom = distance2D(nose, landmarks[152]);
    const totalY = distTop + distBottom;
    if (totalY > 0.0001) {
      pitchRatio = distTop / totalY;
    }
  }

  // Neutral forward looking: yawRatio ~0.50 (normal range: 0.33 to 0.67), pitchRatio ~0.50 (normal range: 0.28 to 0.72)
  const isTurnedHorizontally = yawRatio < 0.31 || yawRatio > 0.69;
  const isTurnedVertically = pitchRatio < 0.26 || pitchRatio > 0.74;

  return isTurnedHorizontally || isTurnedVertically;
}

function getCameraErrorMessage(error) {
  switch (error.name) {
    case "NotAllowedError":
    case "SecurityError":
      return {
        status: "denied",
        message: "Camera permission was denied. Allow camera access in your browser settings to try again.",
      };
    case "NotFoundError":
      return {
        status: "error",
        message: "No camera was found. Connect a camera and try again.",
      };
    case "NotReadableError":
    case "TrackStartError":
      return {
        status: "error",
        message: "Your camera is busy in another application. Close that application and try again.",
      };
    case "OverconstrainedError":
      return {
        status: "error",
        message: "Your camera does not support the requested settings. Please try again.",
      };
    default:
      return {
        status: "error",
        message: "Camera access could not be started. Please try again.",
      };
  }
}

function CameraMonitor({ onStatusUpdate }) {
  const videoRef = useRef(null);
  const faceCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const objectDetectorRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastDetectionTimeRef = useRef(0);
  const lastObjectDetectionTimeRef = useRef(0);
  const detectionActiveRef = useRef(false);
  const cameraRunIdRef = useRef(0);
  const mountedRef = useRef(true);

  // Status refs
  const faceStatusRef = useRef("off");
  const eyeStatusRef = useRef("eyes-unknown");
  const drowsinessStatusRef = useRef("paused");
  const focusStatusRef = useRef("paused");
  const mobileStatusRef = useRef("paused");
  const eyeDirectionStatusRef = useRef("paused");
  const consecutiveMissedFramesRef = useRef(0);

  // Temporal stability timing refs
  const earCandidateStateRef = useRef(null);
  const earCandidateStartTimeRef = useRef(0);
  const continuousClosedStartTimeRef = useRef(null);

  const focusCandidateStateRef = useRef("paused");
  const focusCandidateStartTimeRef = useRef(0);

  const mobileCandidateStateRef = useRef("no-mobile");
  const mobileCandidateStartTimeRef = useRef(0);
  const detectedMobileBoxesRef = useRef([]);

  const eyeDirectionCandidateStateRef = useRef("looking-at-screen");
  const eyeDirectionCandidateStartTimeRef = useRef(0);

  // State hooks for UI
  const [cameraStatus, setCameraStatus] = useState("camera-off");
  const [cameraMessage, setCameraMessage] = useState(cameraMessages["camera-off"]);
  const [faceStatus, setFaceStatus] = useState("off");
  const [faceMessage, setFaceMessage] = useState(faceMessages.off);
  const [eyeStatus, setEyeStatus] = useState("eyes-unknown");
  const [eyeMessage, setEyeMessage] = useState(eyeMessages["eyes-unknown"]);
  const [drowsinessStatus, setDrowsinessStatus] = useState("paused");
  const [drowsinessMessage, setDrowsinessMessage] = useState(drowsinessMessages.paused);
  const [focusStatus, setFocusStatus] = useState("paused");
  const [focusMessage, setFocusMessage] = useState(focusMessages.paused);
  const [mobileStatus, setMobileStatus] = useState("paused");
  const [mobileMessage, setMobileMessage] = useState(mobileMessages.paused);
  const [eyeDirectionStatus, setEyeDirectionStatus] = useState("paused");
  const [eyeDirectionMessage, setEyeDirectionMessage] = useState(eyeDirectionMessages.paused);

  // Broadcast unified status changes to parent
  const notifyStatusChange = useCallback(() => {
    if (onStatusUpdate) {
      onStatusUpdate({
        cameraStatus: cameraStatus,
        faceStatus: faceStatusRef.current,
        eyeStatus: eyeStatusRef.current,
        drowsinessStatus: drowsinessStatusRef.current,
        focusStatus: focusStatusRef.current,
        mobileStatus: mobileStatusRef.current,
        eyeDirectionStatus: eyeDirectionStatusRef.current,
      });
    }
  }, [cameraStatus, onStatusUpdate]);

  const updateFaceStatus = useCallback((status, message) => {
    if (faceStatusRef.current === status) return;
    faceStatusRef.current = status;
    setFaceStatus(status);
    setFaceMessage(message || faceMessages[status] || "");
    notifyStatusChange();
  }, [notifyStatusChange]);

  const updateEyeStatus = useCallback((status, message) => {
    if (eyeStatusRef.current === status) return;
    eyeStatusRef.current = status;
    setEyeStatus(status);
    setEyeMessage(message || eyeMessages[status] || "");
    notifyStatusChange();
  }, [notifyStatusChange]);

  const updateDrowsinessStatus = useCallback((status, message) => {
    if (drowsinessStatusRef.current === status) return;
    drowsinessStatusRef.current = status;
    setDrowsinessStatus(status);
    setDrowsinessMessage(message || drowsinessMessages[status] || "");
    notifyStatusChange();
  }, [notifyStatusChange]);

  const updateFocusStatus = useCallback((status, message) => {
    if (focusStatusRef.current === status) return;
    focusStatusRef.current = status;
    setFocusStatus(status);
    setFocusMessage(message || focusMessages[status] || "");
    notifyStatusChange();
  }, [notifyStatusChange]);

  const updateMobileStatus = useCallback((status, message) => {
    if (mobileStatusRef.current === status) return;
    mobileStatusRef.current = status;
    setMobileStatus(status);
    setMobileMessage(message || mobileMessages[status] || "");
    notifyStatusChange();
  }, [notifyStatusChange]);

  const updateEyeDirectionStatus = useCallback((status, message) => {
    if (eyeDirectionStatusRef.current === status) return;
    eyeDirectionStatusRef.current = status;
    setEyeDirectionStatus(status);
    setEyeDirectionMessage(message || eyeDirectionMessages[status] || "");
    notifyStatusChange();
  }, [notifyStatusChange]);

  const resetTemporalTracking = useCallback(() => {
    earCandidateStateRef.current = null;
    earCandidateStartTimeRef.current = 0;
    continuousClosedStartTimeRef.current = null;
    focusCandidateStateRef.current = "paused";
    focusCandidateStartTimeRef.current = 0;
    mobileCandidateStateRef.current = "no-mobile";
    mobileCandidateStartTimeRef.current = 0;
    detectedMobileBoxesRef.current = [];
    eyeDirectionCandidateStateRef.current = "looking-at-screen";
    eyeDirectionCandidateStartTimeRef.current = 0;
  }, []);

  const clearCanvasOverlay = useCallback(() => {
    const canvas = faceCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const drawCombinedOverlay = useCallback((landmarks, mobileBoxes) => {
    const canvas = faceCanvasRef.current;
    const video = videoRef.current;

    if (!canvas || !video || !video.videoWidth || !video.videoHeight) {
      return;
    }

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const context = canvas.getContext("2d");
    if (!context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw eye contours if face landmarks available
    if (landmarks && landmarks.length >= 468) {
      const drawContour = (indices, strokeColor, fillColor) => {
        if (!indices || indices.length === 0) return;
        context.beginPath();
        const first = landmarks[indices[0]];
        context.moveTo(first.x * canvas.width, first.y * canvas.height);

        for (let i = 1; i < indices.length; i++) {
          const pt = landmarks[indices[i]];
          if (pt) {
            context.lineTo(pt.x * canvas.width, pt.y * canvas.height);
          }
        }
        context.closePath();
        context.strokeStyle = strokeColor;
        context.lineWidth = 1.5;
        context.fillStyle = fillColor;
        context.fill();
        context.stroke();
      };

      const eyeHighlightColor =
        eyeStatusRef.current === "eyes-closed"
          ? "rgba(223, 172, 52, 0.85)"
          : "rgba(117, 227, 174, 0.85)";
      const eyeFillColor =
        eyeStatusRef.current === "eyes-closed"
          ? "rgba(223, 172, 52, 0.15)"
          : "rgba(117, 227, 174, 0.12)";

      drawContour(LEFT_EYE_CONTOUR, eyeHighlightColor, eyeFillColor);
      drawContour(RIGHT_EYE_CONTOUR, eyeHighlightColor, eyeFillColor);
    }

    // 2. Draw mobile phone bounding box overlay if detected
    if (mobileBoxes && mobileBoxes.length > 0 && mobileStatusRef.current === "mobile-detected") {
      mobileBoxes.forEach((box) => {
        context.strokeStyle = "rgba(239, 68, 68, 0.9)";
        context.lineWidth = 2.5;
        context.fillStyle = "rgba(239, 68, 68, 0.12)";

        const bx = box.originX;
        const by = box.originY;
        const bw = box.width;
        const bh = box.height;

        context.fillRect(bx, by, bw, bh);
        context.strokeRect(bx, by, bw, bh);

        // Label tag
        context.fillStyle = "rgba(220, 38, 38, 0.9)";
        context.font = "bold 12px Inter, sans-serif";
        const text = "📱 Mobile Detected";
        const textWidth = context.measureText(text).width;
        context.fillRect(bx, Math.max(0, by - 22), textWidth + 12, 22);
        context.fillStyle = "#ffffff";
        context.fillText(text, bx + 6, Math.max(15, by - 6));
      });
    }
  }, []);

  const stopVisionProcessing = useCallback(() => {
    detectionActiveRef.current = false;
    lastDetectionTimeRef.current = 0;
    lastObjectDetectionTimeRef.current = 0;
    consecutiveMissedFramesRef.current = 0;
    resetTemporalTracking();

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    objectDetectorRef.current?.close();
    objectDetectorRef.current = null;
    clearCanvasOverlay();
  }, [clearCanvasOverlay, resetTemporalTracking]);

  const stopStream = useCallback(() => {
    stopVisionProcessing();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stopVisionProcessing]);

  /**
   * Evaluates Study Focus state from current face, eye, and drowsiness signals.
   */
  const evaluateFocusState = useCallback(
    (now, currentEyeState, currentDrowsinessState) => {
      if (
        faceStatusRef.current !== "detected" ||
        currentEyeState === "eyes-unknown" ||
        currentDrowsinessState === "paused"
      ) {
        focusCandidateStateRef.current = "paused";
        focusCandidateStartTimeRef.current = now;
        updateFocusStatus("paused");
        return;
      }

      let targetState = "focused";
      if (
        currentDrowsinessState === "drowsiness-suspected" ||
        currentEyeState === "eyes-closed"
      ) {
        targetState = "attention-reduced";
      } else if (currentEyeState === "eyes-open" && currentDrowsinessState === "alert") {
        targetState = "focused";
      }

      if (focusCandidateStateRef.current !== targetState) {
        focusCandidateStateRef.current = targetState;
        focusCandidateStartTimeRef.current = now;
      }

      const elapsed = now - focusCandidateStartTimeRef.current;

      if (targetState === "attention-reduced") {
        if (
          currentDrowsinessState === "drowsiness-suspected" ||
          elapsed >= ATTENTION_REDUCED_DELAY_MS
        ) {
          updateFocusStatus("attention-reduced");
        }
      } else if (targetState === "focused") {
        if (elapsed >= FOCUS_CONFIRMATION_MS) {
          updateFocusStatus("focused");
        }
      }
    },
    [updateFocusStatus],
  );

  /**
   * Process raw EAR measurements with temporal debounce / stability to avoid flickering.
   */
  const processEyeStability = useCallback(
    (averageEAR, now) => {
      if (averageEAR === null || isNaN(averageEAR)) {
        updateEyeStatus("eyes-unknown");
        updateDrowsinessStatus("paused");
        evaluateFocusState(now, "eyes-unknown", "paused");
        resetTemporalTracking();
        return;
      }

      let instantaneousState = null;
      if (averageEAR >= EYE_OPEN_EAR_THRESHOLD) {
        instantaneousState = "open";
      } else if (averageEAR <= EYE_CLOSED_EAR_THRESHOLD) {
        instantaneousState = "closed";
      }

      if (instantaneousState) {
        if (earCandidateStateRef.current !== instantaneousState) {
          earCandidateStateRef.current = instantaneousState;
          earCandidateStartTimeRef.current = now;
        }
      }

      const candidateState = earCandidateStateRef.current;
      const candidateElapsed = now - earCandidateStartTimeRef.current;

      let nextEyeState = eyeStatusRef.current;
      let nextDrowsinessState = drowsinessStatusRef.current;

      if (candidateState === "closed" && candidateElapsed >= EYE_CLOSED_CONFIRMATION_MS) {
        nextEyeState = "eyes-closed";
        updateEyeStatus("eyes-closed");

        if (continuousClosedStartTimeRef.current === null) {
          continuousClosedStartTimeRef.current = earCandidateStartTimeRef.current;
        }

        const continuousClosedDuration = now - continuousClosedStartTimeRef.current;
        if (continuousClosedDuration >= DROWSINESS_CLOSED_DURATION_MS) {
          nextDrowsinessState = "drowsiness-suspected";
          updateDrowsinessStatus("drowsiness-suspected");
        } else {
          nextDrowsinessState = "eyes-closed";
          updateDrowsinessStatus("eyes-closed");
        }
      } else if (candidateState === "open" && candidateElapsed >= EYE_OPEN_CONFIRMATION_MS) {
        nextEyeState = "eyes-open";
        updateEyeStatus("eyes-open");
        continuousClosedStartTimeRef.current = null;
        nextDrowsinessState = "alert";
        updateDrowsinessStatus("alert");
      }

      evaluateFocusState(now, nextEyeState, nextDrowsinessState);
    },
    [evaluateFocusState, resetTemporalTracking, updateDrowsinessStatus, updateEyeStatus],
  );

  /**
   * Process Eye Direction / Head Gaze with temporal debounce.
   */
  const processEyeDirectionStability = useCallback(
    (isLookingAwayRaw, now) => {
      if (isLookingAwayRaw === null || faceStatusRef.current !== "detected") {
        updateEyeDirectionStatus("paused");
        return;
      }

      const target = isLookingAwayRaw ? "looking-away" : "looking-at-screen";

      if (eyeDirectionCandidateStateRef.current !== target) {
        eyeDirectionCandidateStateRef.current = target;
        eyeDirectionCandidateStartTimeRef.current = now;
      }

      const elapsed = now - eyeDirectionCandidateStartTimeRef.current;

      if (target === "looking-away" && elapsed >= LOOKING_AWAY_CONFIRMATION_MS) {
        updateEyeDirectionStatus("looking-away");
      } else if (target === "looking-at-screen" && elapsed >= LOOKING_AT_SCREEN_CONFIRMATION_MS) {
        updateEyeDirectionStatus("looking-at-screen");
      }
    },
    [updateEyeDirectionStatus],
  );

  /**
   * Process Mobile Phone Object Detection with temporal debounce.
   */
  const processMobileStability = useCallback(
    (hasMobileRaw, boxes, now) => {
      detectedMobileBoxesRef.current = boxes || [];

      const target = hasMobileRaw ? "mobile-detected" : "no-mobile";

      if (mobileCandidateStateRef.current !== target) {
        mobileCandidateStateRef.current = target;
        mobileCandidateStartTimeRef.current = now;
      }

      const elapsed = now - mobileCandidateStartTimeRef.current;

      if (target === "mobile-detected" && elapsed >= MOBILE_CONFIRMATION_MS) {
        updateMobileStatus("mobile-detected");
      } else if (target === "no-mobile" && elapsed >= MOBILE_CLEAR_MS) {
        updateMobileStatus("no-mobile");
      }
    },
    [updateMobileStatus],
  );

  const startVisionProcessing = useCallback(
    async (cameraRunId) => {
      const video = videoRef.current;
      if (!video) return;

      updateFaceStatus("initializing");
      updateEyeStatus("eyes-unknown");
      updateDrowsinessStatus("paused");
      updateFocusStatus("paused");
      updateMobileStatus("unavailable");
      updateEyeDirectionStatus("unknown");

      let landmarker = null;
      let objectDetector = null;

      try {
        const { FaceLandmarker, ObjectDetector, FilesetResolver } = await import(
          /* @vite-ignore */ MEDIAPIPE_VISION_URL
        );
        const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);

        // Load FaceLandmarker and ObjectDetector concurrently
        const [loadedLandmarker, loadedObjectDetector] = await Promise.all([
          FaceLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: FACE_LANDMARKER_MODEL_URL },
            runningMode: "VIDEO",
            numFaces: 1,
            minFaceDetectionConfidence: 0.5,
            minFacePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
            outputFaceBlendshapes: false,
            outputFacialTransformationMatrixes: false,
          }),
          ObjectDetector.createFromOptions(vision, {
            baseOptions: { modelAssetPath: OBJECT_DETECTOR_MODEL_URL },
            scoreThreshold: 0.38,
            runningMode: "VIDEO",
          }).catch((err) => {
            console.warn("MediaPipe ObjectDetector load error:", err);
            return null;
          }),
        ]);

        landmarker = loadedLandmarker;
        objectDetector = loadedObjectDetector;

        if (!mountedRef.current || cameraRunIdRef.current !== cameraRunId) {
          landmarker?.close();
          objectDetector?.close();
          return;
        }

        landmarkerRef.current = landmarker;
        objectDetectorRef.current = objectDetector;
        detectionActiveRef.current = true;
        consecutiveMissedFramesRef.current = 0;
        resetTemporalTracking();
        updateMobileStatus("no-mobile");

        let lastLandmarks = null;

        const processFrame = (timestamp) => {
          if (
            !mountedRef.current ||
            !detectionActiveRef.current ||
            cameraRunIdRef.current !== cameraRunId
          ) {
            return;
          }

          const activeVideo = videoRef.current;
          if (
            !activeVideo ||
            activeVideo.readyState < 2 ||
            !activeVideo.videoWidth ||
            !activeVideo.videoHeight
          ) {
            animationFrameRef.current = requestAnimationFrame(processFrame);
            return;
          }

          const now = performance.now();

          // 1. Face & Eye Landmarker loop (Every 100ms)
          if (timestamp - lastDetectionTimeRef.current >= DETECTION_INTERVAL_MS) {
            lastDetectionTimeRef.current = timestamp;

            try {
              if (landmarkerRef.current) {
                const result = landmarkerRef.current.detectForVideo(activeVideo, now);
                const landmarks = result.faceLandmarks?.[0];
                lastLandmarks = landmarks;

                if (landmarks && landmarks.length >= 468) {
                  consecutiveMissedFramesRef.current = 0;
                  updateFaceStatus("detected");

                  // Compute EAR for eyes
                  const leftEAR = calculateEAR(landmarks, LEFT_EYE_LANDMARKS);
                  const rightEAR = calculateEAR(landmarks, RIGHT_EYE_LANDMARKS);

                  if (leftEAR !== null && rightEAR !== null) {
                    const averageEAR = (leftEAR + rightEAR) / 2.0;
                    processEyeStability(averageEAR, now);
                  } else {
                    processEyeStability(null, now);
                  }

                  // Compute Looking Away / Gaze orientation
                  const isLookingAway = calculateLookingAway(landmarks);
                  processEyeDirectionStability(isLookingAway, now);
                } else {
                  consecutiveMissedFramesRef.current += 1;

                  if (consecutiveMissedFramesRef.current >= MISSED_FRAMES_THRESHOLD) {
                    updateFaceStatus("not-detected");
                    updateEyeStatus("eyes-unknown");
                    updateDrowsinessStatus("paused");
                    updateFocusStatus("paused");
                    updateEyeDirectionStatus("paused");
                    resetTemporalTracking();
                  }
                }
              }
            } catch (err) {
              console.error("Face landmarker processing error:", err);
            }
          }

          // 2. Mobile Object Detector loop (Throttled every 250ms)
          if (timestamp - lastObjectDetectionTimeRef.current >= OBJECT_DETECTION_INTERVAL_MS) {
            lastObjectDetectionTimeRef.current = timestamp;

            try {
              if (objectDetectorRef.current) {
                const objectResult = objectDetectorRef.current.detectForVideo(activeVideo, now);
                const detections = objectResult.detections || [];

                const phoneBoxes = [];
                let phoneDetected = false;

                for (const detection of detections) {
                  const categories = detection.categories || [];
                  const isPhone = categories.some((c) => {
                    const name = c.categoryName.toLowerCase();
                    return (
                      (name.includes("cell phone") ||
                        name.includes("mobile") ||
                        name.includes("telephone") ||
                        name.includes("phone")) &&
                      c.score >= 0.35
                    );
                  });

                  if (isPhone && detection.boundingBox) {
                    phoneDetected = true;
                    phoneBoxes.push(detection.boundingBox);
                  }
                }

                processMobileStability(phoneDetected, phoneBoxes, now);
              }
            } catch (err) {
              console.warn("Object detector processing error:", err);
            }
          }

          // 3. Render combined overlays
          drawCombinedOverlay(lastLandmarks, detectedMobileBoxesRef.current);

          animationFrameRef.current = requestAnimationFrame(processFrame);
        };

        animationFrameRef.current = requestAnimationFrame(processFrame);
      } catch (err) {
        console.error("MediaPipe vision initialization error:", err);
        landmarker?.close();
        objectDetector?.close();

        if (mountedRef.current && cameraRunIdRef.current === cameraRunId) {
          updateFaceStatus("error");
          updateEyeStatus("eyes-unknown");
          updateDrowsinessStatus("paused");
          updateFocusStatus("paused");
          updateMobileStatus("unavailable");
          updateEyeDirectionStatus("unknown");
        }
      }
    },
    [
      drawCombinedOverlay,
      processEyeDirectionStability,
      processEyeStability,
      processMobileStability,
      resetTemporalTracking,
      updateDrowsinessStatus,
      updateEyeDirectionStatus,
      updateEyeStatus,
      updateFaceStatus,
      updateFocusStatus,
      updateMobileStatus,
    ],
  );

  const stopCamera = useCallback(() => {
    cameraRunIdRef.current += 1;
    stopStream();
    setCameraStatus("camera-off");
    setCameraMessage(cameraMessages["camera-off"]);
    updateFaceStatus("off");
    updateEyeStatus("eyes-unknown");
    updateDrowsinessStatus("paused");
    updateFocusStatus("paused");
    updateMobileStatus("paused");
    updateEyeDirectionStatus("paused");
  }, [
    stopStream,
    updateDrowsinessStatus,
    updateEyeDirectionStatus,
    updateEyeStatus,
    updateFaceStatus,
    updateFocusStatus,
    updateMobileStatus,
  ]);

  const enableCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("error");
      setCameraMessage(
        "Camera access is not supported in this browser. Use a modern browser on localhost or HTTPS.",
      );
      updateFaceStatus("error");
      updateEyeStatus("eyes-unknown");
      updateDrowsinessStatus("paused");
      updateFocusStatus("paused");
      updateMobileStatus("paused");
      updateEyeDirectionStatus("paused");
      return;
    }

    const cameraRunId = cameraRunIdRef.current + 1;
    cameraRunIdRef.current = cameraRunId;
    stopStream();
    setCameraStatus("starting");
    setCameraMessage(cameraMessages.starting);
    updateFaceStatus("off");
    updateEyeStatus("eyes-unknown");
    updateDrowsinessStatus("paused");
    updateFocusStatus("paused");
    updateMobileStatus("unavailable");
    updateEyeDirectionStatus("unknown");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      if (!mountedRef.current || cameraRunIdRef.current !== cameraRunId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      if (!mountedRef.current || cameraRunIdRef.current !== cameraRunId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      setCameraStatus("active");
      setCameraMessage(cameraMessages.active);
      void startVisionProcessing(cameraRunId);
    } catch (error) {
      if (!mountedRef.current || cameraRunIdRef.current !== cameraRunId) {
        return;
      }

      stopStream();
      const cameraError = getCameraErrorMessage(error);
      setCameraStatus(cameraError.status);
      setCameraMessage(cameraError.message);
      updateFaceStatus("off");
      updateEyeStatus("eyes-unknown");
      updateDrowsinessStatus("paused");
      updateFocusStatus("paused");
      updateMobileStatus("paused");
      updateEyeDirectionStatus("paused");
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      cameraRunIdRef.current += 1;
      stopStream();
    };
  }, [stopStream]);

  const isCameraActive = cameraStatus === "active";
  const isCameraStarting = cameraStatus === "starting";

  return (
    <section className="camera-section" id="camera" aria-labelledby="camera-title">
      <div className="section-header">
        <div>
          <span className="section-tag">LIVE VISION TELEMETRY</span>
          <h2 id="camera-title" className="section-title">Camera & Attention Monitor</h2>
        </div>
        <p className="section-desc">
          High-frequency on-device neural landmark, eye openness, gaze, and mobile detection running in a single video stream.
        </p>
      </div>

      <div className="camera-grid">
        {/* LEFT COLUMN: Camera Feed & Main Hardware Controls */}
        <div className="camera-feed-card">
          <div className="feed-header">
            <div className="feed-title-wrap">
              <span className="feed-icon" aria-hidden="true">📹</span>
              <div>
                <h3 className="feed-heading">Video Stream</h3>
                <span className="feed-subheading">Local preview only</span>
              </div>
            </div>
            <div className={`camera-chip ${cameraStatus}`} role="status" aria-live="polite">
              <span className="status-dot" aria-hidden="true" />
              <span>
                {cameraStatus === "camera-off" && "Camera Off"}
                {isCameraStarting && "Connecting..."}
                {isCameraActive && "Live Stream Active"}
                {cameraStatus === "denied" && "Permission Denied"}
                {cameraStatus === "error" && "Hardware Error"}
              </span>
            </div>
          </div>

          <div className="camera-preview-box" aria-label="Camera preview area">
            <video
              className={`camera-video ${isCameraActive ? "is-visible" : ""}`}
              ref={videoRef}
              autoPlay
              muted
              playsInline
              aria-label="Live camera video stream"
            />
            <canvas
              className={`face-overlay ${isCameraActive ? "is-visible" : ""}`}
              ref={faceCanvasRef}
              aria-hidden="true"
            />
            {!isCameraActive && (
              <div className="camera-placeholder">
                <div className="placeholder-icon-wrap" aria-hidden="true">
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                    <circle cx="12" cy="13" r="3"/>
                  </svg>
                </div>
                <strong>Camera is currently inactive</strong>
                <p>Activate your webcam to initiate private on-device focus and alert tracking.</p>
              </div>
            )}
          </div>

          <div className="camera-controls-bar">
            {isCameraActive ? (
              <button
                className="btn btn-danger btn-block"
                type="button"
                onClick={stopCamera}
                id="stop-camera-btn"
              >
                <span aria-hidden="true">⏹</span> Stop Camera Stream
              </button>
            ) : (
              <button
                className="btn btn-primary btn-block"
                type="button"
                onClick={enableCamera}
                disabled={isCameraStarting}
                id="enable-camera-btn"
              >
                <span aria-hidden="true">▶</span> {isCameraStarting ? "Requesting Camera Access..." : "Enable Camera Stream"}
              </button>
            )}
          </div>

          {cameraMessage && (
            <p className="feed-footer-msg" role="status">
              <span className="info-icon" aria-hidden="true">ⓘ</span>
              <span>{cameraMessage}</span>
            </p>
          )}
        </div>

        {/* RIGHT COLUMN: Real-Time Telemetry & Status Cards */}
        <div className="telemetry-panel">
          <div className="telemetry-header">
            <h3 className="telemetry-title">Live Vision Indicators</h3>
            <span className="telemetry-badge">Private Inference</span>
          </div>

          <div className="telemetry-cards-list">
            {/* 1. STUDY FOCUS CARD (PRIMARY) */}
            <div className={`status-card highlight-card focus-${focusStatus}`}>
              <div className="status-card-top">
                <div className="status-card-label">
                  <span className="status-icon-indicator" aria-hidden="true">🎯</span>
                  <span>STUDY FOCUS</span>
                </div>
                <div className={`status-pill ${focusStatus}`} role="status" aria-live="polite">
                  <span className="status-dot" aria-hidden="true" />
                  <span>
                    {focusStatus === "focused" && "Focused"}
                    {focusStatus === "attention-reduced" && "Attention Reduced"}
                    {focusStatus === "paused" && "Monitoring Paused"}
                  </span>
                </div>
              </div>
              <p className="status-card-desc">{focusMessage}</p>
            </div>

            {/* 2. DROWSINESS MONITOR CARD */}
            <div className={`status-card drowsiness-${drowsinessStatus}`}>
              <div className="status-card-top">
                <div className="status-card-label">
                  <span className="status-icon-indicator" aria-hidden="true">😴</span>
                  <span>DROWSINESS STATE</span>
                </div>
                <div className={`status-pill ${drowsinessStatus}`} role="status" aria-live="polite">
                  <span className="status-dot" aria-hidden="true" />
                  <span>
                    {drowsinessStatus === "alert" && "Alert"}
                    {drowsinessStatus === "eyes-closed" && "Eyes Closed"}
                    {drowsinessStatus === "drowsiness-suspected" && "Drowsiness Suspected"}
                    {drowsinessStatus === "paused" && "Monitoring Paused"}
                  </span>
                </div>
              </div>
              <p className="status-card-desc">{drowsinessMessage}</p>
            </div>

            {/* 3. MOBILE PHONE DETECTION CARD */}
            <div className={`status-card mobile-${mobileStatus}`}>
              <div className="status-card-top">
                <div className="status-card-label">
                  <span className="status-icon-indicator" aria-hidden="true">📱</span>
                  <span>MOBILE PHONE</span>
                </div>
                <div className={`status-pill ${mobileStatus}`} role="status" aria-live="polite">
                  <span className="status-dot" aria-hidden="true" />
                  <span>
                    {mobileStatus === "no-mobile" && "No Mobile Detected"}
                    {mobileStatus === "mobile-detected" && "Mobile Detected"}
                    {mobileStatus === "unavailable" && "Detection Unavailable"}
                    {mobileStatus === "paused" && "Monitoring Paused"}
                  </span>
                </div>
              </div>
              <p className="status-card-desc">{mobileMessage}</p>
            </div>

            {/* 4. EYE DIRECTION / LOOKING AWAY CARD */}
            <div className={`status-card eye-dir-${eyeDirectionStatus}`}>
              <div className="status-card-top">
                <div className="status-card-label">
                  <span className="status-icon-indicator" aria-hidden="true">👀</span>
                  <span>EYE DIRECTION</span>
                </div>
                <div className={`status-pill ${eyeDirectionStatus}`} role="status" aria-live="polite">
                  <span className="status-dot" aria-hidden="true" />
                  <span>
                    {eyeDirectionStatus === "looking-at-screen" && "Looking at Screen"}
                    {eyeDirectionStatus === "looking-away" && "Looking Away"}
                    {eyeDirectionStatus === "unknown" && "Eye Direction Unknown"}
                    {eyeDirectionStatus === "paused" && "Monitoring Paused"}
                  </span>
                </div>
              </div>
              <p className="status-card-desc">{eyeDirectionMessage}</p>
            </div>

            {/* 5. EYE APERTURE CARD */}
            <div className={`status-card eye-${eyeStatus}`}>
              <div className="status-card-top">
                <div className="status-card-label">
                  <span className="status-icon-indicator" aria-hidden="true">👁</span>
                  <span>EYE APERTURE</span>
                </div>
                <div className={`status-pill ${eyeStatus}`} role="status" aria-live="polite">
                  <span className="status-dot" aria-hidden="true" />
                  <span>
                    {eyeStatus === "eyes-open" && "Eyes Open"}
                    {eyeStatus === "eyes-closed" && "Eyes Closed"}
                    {eyeStatus === "eyes-unknown" && "Eyes Unknown"}
                  </span>
                </div>
              </div>
              <p className="status-card-desc">{eyeMessage}</p>
            </div>

            {/* 6. FACE PRESENCE CARD */}
            <div className={`status-card face-${faceStatus}`}>
              <div className="status-card-top">
                <div className="status-card-label">
                  <span className="status-icon-indicator" aria-hidden="true">👤</span>
                  <span>FACE PRESENCE</span>
                </div>
                <div className={`status-pill ${faceStatus}`} role="status" aria-live="polite">
                  <span className="status-dot" aria-hidden="true" />
                  <span>
                    {faceStatus === "off" && "Monitoring Off"}
                    {faceStatus === "initializing" && "Initializing Mesh"}
                    {faceStatus === "detected" && "Face Detected"}
                    {faceStatus === "not-detected" && "Not Detected"}
                    {faceStatus === "error" && "Error"}
                  </span>
                </div>
              </div>
              <p className="status-card-desc">{faceMessage}</p>
            </div>
          </div>

          <div className="telemetry-privacy-footnote">
            <span className="shield-icon" aria-hidden="true">🛡</span>
            <span>Zero video frames or facial biometrics ever leave your local browser sandbox.</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CameraMonitor;
