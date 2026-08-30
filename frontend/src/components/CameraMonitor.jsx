import { useCallback, useEffect, useRef, useState } from "react";

const MEDIAPIPE_VISION_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs";
const MEDIAPIPE_WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const FACE_LANDMARKER_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";

// Configurable detection and timing constants
const DETECTION_INTERVAL_MS = 100;
const MISSED_FRAMES_THRESHOLD = 3;

// Configurable EAR thresholds
const EYE_OPEN_EAR_THRESHOLD = 0.21;

const EYE_CLOSED_EAR_THRESHOLD = 0.17;

// Configurable temporal stability / debounce timings (Milestone 4)
const EYE_CLOSED_CONFIRMATION_MS = 350; // Continuous closed time to confirm "Eyes Closed"
const EYE_OPEN_CONFIRMATION_MS = 200; // Continuous open time to confirm "Eyes Open"
const DROWSINESS_CLOSED_DURATION_MS = 2000; // Continuous closed time to flag "Drowsiness Suspected"

// Configurable Study Focus timings (Milestone 5)
const FOCUS_CONFIRMATION_MS = 300; // Time in open/alert state before confirming "Focused"
const ATTENTION_REDUCED_DELAY_MS = 500; // Time in closed/drowsy state before confirming "Attention Reduced"

// MediaPipe 468/478 Face Mesh landmark indices for Eye Aspect Ratio (EAR)
// Left eye landmarks (subject's perspective)
const LEFT_EYE_LANDMARKS = {
  p1: 33, // Outer corner
  p2: 160, // Upper eyelid outer
  p3: 158, // Upper eyelid inner
  p4: 133, // Inner corner
  p5: 153, // Lower eyelid inner
  p6: 144, // Lower eyelid outer
};

// Right eye landmarks (subject's perspective)
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
  active: "Camera active. Focus and eye monitoring run privately in this browser.",
};

const faceMessages = {
  off: "Face monitoring starts when the camera is active.",
  initializing: "Loading on-device face & eye landmarker...",
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

function distance2D(p1, p2) {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

/**
 * Calculates normalized Eye Aspect Ratio (EAR) from 6 landmark points:
 * EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
 * Based on normalized coordinates, independent of camera resolution.
 * Note: This is an experimental study-focus indicator, not a medical measurement.
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

function CameraMonitor() {
  const videoRef = useRef(null);
  const faceCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastDetectionTimeRef = useRef(0);
  const detectionActiveRef = useRef(false);
  const cameraRunIdRef = useRef(0);
  const mountedRef = useRef(true);

  // Status refs to avoid unnecessary re-renders & race conditions
  const faceStatusRef = useRef("off");
  const eyeStatusRef = useRef("eyes-unknown");
  const drowsinessStatusRef = useRef("paused");
  const focusStatusRef = useRef("paused");
  const consecutiveMissedFramesRef = useRef(0);

  // Temporal stability timing refs (Milestone 4 & 5)
  const earCandidateStateRef = useRef(null); // 'open' | 'closed' | null
  const earCandidateStartTimeRef = useRef(0);
  const continuousClosedStartTimeRef = useRef(null);

  const focusCandidateStateRef = useRef("paused"); // 'focused' | 'attention-reduced' | 'paused'
  const focusCandidateStartTimeRef = useRef(0);

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

  const updateFaceStatus = useCallback((status, message) => {
    if (faceStatusRef.current === status) return;
    faceStatusRef.current = status;
    setFaceStatus(status);
    setFaceMessage(message || faceMessages[status] || "");
  }, []);

  const updateEyeStatus = useCallback((status, message) => {
    if (eyeStatusRef.current === status) return;
    eyeStatusRef.current = status;
    setEyeStatus(status);
    setEyeMessage(message || eyeMessages[status] || "");
  }, []);

  const updateDrowsinessStatus = useCallback((status, message) => {
    if (drowsinessStatusRef.current === status) return;
    drowsinessStatusRef.current = status;
    setDrowsinessStatus(status);
    setDrowsinessMessage(message || drowsinessMessages[status] || "");
  }, []);

  const updateFocusStatus = useCallback((status, message) => {
    if (focusStatusRef.current === status) return;
    focusStatusRef.current = status;
    setFocusStatus(status);
    setFocusMessage(message || focusMessages[status] || "");
  }, []);

  const resetTemporalTracking = useCallback(() => {
    earCandidateStateRef.current = null;
    earCandidateStartTimeRef.current = 0;
    continuousClosedStartTimeRef.current = null;
    focusCandidateStateRef.current = "paused";
    focusCandidateStartTimeRef.current = 0;
  }, []);

  const clearFaceOverlay = useCallback(() => {
    const canvas = faceCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const drawLandmarkOverlay = useCallback((landmarks) => {
    const canvas = faceCanvasRef.current;
    const video = videoRef.current;

    if (!canvas || !video || !landmarks || !video.videoWidth || !video.videoHeight) {
      return;
    }

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const context = canvas.getContext("2d");
    if (!context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);

    // Draw subtle contours around eyes
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
  }, []);

  const stopVisionProcessing = useCallback(() => {
    detectionActiveRef.current = false;
    lastDetectionTimeRef.current = 0;
    consecutiveMissedFramesRef.current = 0;
    resetTemporalTracking();

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    clearFaceOverlay();
  }, [clearFaceOverlay, resetTemporalTracking]);

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
   * Priority:
   * 1. Face/camera/eye missing -> 'paused' (Monitoring Paused)
   * 2. Drowsiness Suspected or extended eye closure -> 'attention-reduced' (Attention Reduced)
   * 3. Stably open and alert -> 'focused' (Focused)
   */
  const evaluateFocusState = useCallback(
    (now, currentEyeState, currentDrowsinessState) => {
      // 1. Paused condition check
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

      // 2. Determine target focus state based on deterministic priority
      let targetState = "focused";
      if (
        currentDrowsinessState === "drowsiness-suspected" ||
        currentEyeState === "eyes-closed"
      ) {
        targetState = "attention-reduced";
      } else if (currentEyeState === "eyes-open" && currentDrowsinessState === "alert") {
        targetState = "focused";
      }

      // 3. Temporal debounce / confirmation check
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

      // Determine raw instantaneous frame classification
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
        // Confirmed stable Eyes Closed state
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
        // Confirmed stable Eyes Open state
        nextEyeState = "eyes-open";
        updateEyeStatus("eyes-open");
        continuousClosedStartTimeRef.current = null;
        nextDrowsinessState = "alert";
        updateDrowsinessStatus("alert");
      }

      // Evaluate Study Focus from updated state
      evaluateFocusState(now, nextEyeState, nextDrowsinessState);
    },
    [evaluateFocusState, resetTemporalTracking, updateDrowsinessStatus, updateEyeStatus],
  );

  const startVisionProcessing = useCallback(
    async (cameraRunId) => {
      const video = videoRef.current;
      if (!video) return;

      updateFaceStatus("initializing");
      updateEyeStatus("eyes-unknown");
      updateDrowsinessStatus("paused");
      updateFocusStatus("paused");

      let landmarker;

      try {
        const { FaceLandmarker, FilesetResolver } = await import(
          /* @vite-ignore */ MEDIAPIPE_VISION_URL
        );
        const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
        landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: FACE_LANDMARKER_MODEL_URL,
          },
          runningMode: "VIDEO",
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
        });

        if (!mountedRef.current || cameraRunIdRef.current !== cameraRunId) {
          landmarker.close();
          return;
        }

        landmarkerRef.current = landmarker;
        detectionActiveRef.current = true;
        consecutiveMissedFramesRef.current = 0;
        resetTemporalTracking();

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

          if (timestamp - lastDetectionTimeRef.current >= DETECTION_INTERVAL_MS) {
            lastDetectionTimeRef.current = timestamp;

            try {
              const now = performance.now();
              const result = landmarkerRef.current.detectForVideo(activeVideo, now);
              const landmarks = result.faceLandmarks?.[0];

              if (landmarks && landmarks.length >= 468) {
                consecutiveMissedFramesRef.current = 0;
                updateFaceStatus("detected");
                drawLandmarkOverlay(landmarks);

                // Compute EAR for left and right eyes
                const leftEAR = calculateEAR(landmarks, LEFT_EYE_LANDMARKS);
                const rightEAR = calculateEAR(landmarks, RIGHT_EYE_LANDMARKS);

                if (leftEAR !== null && rightEAR !== null) {
                  const averageEAR = (leftEAR + rightEAR) / 2.0;
                  processEyeStability(averageEAR, now);
                } else {
                  processEyeStability(null, now);
                }
              } else {
                clearFaceOverlay();
                consecutiveMissedFramesRef.current += 1;

                if (consecutiveMissedFramesRef.current >= MISSED_FRAMES_THRESHOLD) {
                  // Face absent: pause eye and focus monitoring, never count as eyes closed
                  updateFaceStatus("not-detected");
                  updateEyeStatus("eyes-unknown");
                  updateDrowsinessStatus("paused");
                  updateFocusStatus("paused");
                  resetTemporalTracking();
                }
              }
            } catch (err) {
              console.error("Face landmarker processing error:", err);
              stopVisionProcessing();
              updateFaceStatus("error");
              updateEyeStatus("eyes-unknown");
              updateDrowsinessStatus("paused");
              updateFocusStatus("paused");
              return;
            }
          }

          animationFrameRef.current = requestAnimationFrame(processFrame);
        };

        animationFrameRef.current = requestAnimationFrame(processFrame);
      } catch (err) {
        console.error("MediaPipe FaceLandmarker initialization error:", err);
        landmarker?.close();

        if (mountedRef.current && cameraRunIdRef.current === cameraRunId) {
          updateFaceStatus("error");
          updateEyeStatus("eyes-unknown");
          updateDrowsinessStatus("paused");
          updateFocusStatus("paused");
        }
      }
    },
    [
      clearFaceOverlay,
      drawLandmarkOverlay,
      processEyeStability,
      resetTemporalTracking,
      stopVisionProcessing,
      updateDrowsinessStatus,
      updateEyeStatus,
      updateFaceStatus,
      updateFocusStatus,
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
  }, [stopStream, updateDrowsinessStatus, updateEyeStatus, updateFaceStatus, updateFocusStatus]);

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
      <div className="camera-intro">
        <div>
          <p className="eyebrow">CAMERA MONITORING</p>
          <h2 id="camera-title">Your private study view</h2>
        </div>
        <p>
          StudyGuard AI uses your camera for real-time focus & eye openness monitoring.
          Camera access starts only when you choose to enable it.
        </p>
      </div>

      <div className="camera-layout">
        <div className="camera-preview" aria-label="Camera preview area">
          <video
            className={`camera-video ${isCameraActive ? "is-visible" : ""}`}
            ref={videoRef}
            autoPlay
            muted
            playsInline
            aria-label="Live camera preview"
          />
          <canvas
            className={`face-overlay ${isCameraActive ? "is-visible" : ""}`}
            ref={faceCanvasRef}
            aria-hidden="true"
          />
          {!isCameraActive && (
            <div className="camera-placeholder">
              <span className="camera-placeholder-icon" aria-hidden="true" />
              <strong>Camera preview is off</strong>
              <p>Your live preview appears here after you allow access.</p>
            </div>
          )}
        </div>

        <aside className="camera-panel">
          {/* CAMERA STATUS */}
          <div className="status-label">CAMERA STATUS</div>
          <div className={`camera-status ${cameraStatus}`} role="status" aria-live="polite">
            <span className="status-dot" aria-hidden="true" />
            {cameraStatus === "camera-off" && "Camera Off"}
            {isCameraStarting && "Camera Starting"}
            {isCameraActive && "Camera Active"}
            {cameraStatus === "denied" && "Permission Denied"}
            {cameraStatus === "error" && "Camera Error"}
          </div>
          <p className="camera-status-message">{cameraMessage}</p>

          {/* FACE STATUS */}
          <div className="status-sub-section">
            <div className="status-label">FACE STATUS</div>
            <div className={`face-status ${faceStatus}`} role="status" aria-live="polite">
              <span className="status-dot" aria-hidden="true" />
              {faceStatus === "off" && "Face Monitoring Off"}
              {faceStatus === "initializing" && "Initializing Landmarker"}
              {faceStatus === "detected" && "Face Detected"}
              {faceStatus === "not-detected" && "Face Not Detected"}
              {faceStatus === "error" && "Detection Error"}
            </div>
            <p className="status-note-message">{faceMessage}</p>
          </div>

          {/* EYE STATUS */}
          <div className="status-sub-section">
            <div className="status-label">EYE STATUS</div>
            <div className={`eye-status ${eyeStatus}`} role="status" aria-live="polite">
              <span className="status-dot" aria-hidden="true" />
              {eyeStatus === "eyes-open" && "Eyes Open"}
              {eyeStatus === "eyes-closed" && "Eyes Closed"}
              {eyeStatus === "eyes-unknown" && "Eyes Unknown"}
            </div>
            <p className="status-note-message">{eyeMessage}</p>
          </div>

          {/* DROWSINESS STATUS */}
          <div className="status-sub-section">
            <div className="status-label">DROWSINESS STATUS</div>
            <div className={`drowsiness-status ${drowsinessStatus}`} role="status" aria-live="polite">
              <span className="status-dot" aria-hidden="true" />
              {drowsinessStatus === "alert" && "Alert"}
              {drowsinessStatus === "eyes-closed" && "Eyes Closed"}
              {drowsinessStatus === "drowsiness-suspected" && "Drowsiness Suspected"}
              {drowsinessStatus === "paused" && "Monitoring Paused"}
            </div>
            <p className="status-note-message">{drowsinessMessage}</p>
          </div>

          {/* STUDY FOCUS (MILESTONE 5) */}
          <div className="status-sub-section focus-section">
            <div className="status-label">STUDY FOCUS</div>
            <div className={`focus-status ${focusStatus}`} role="status" aria-live="polite">
              <span className="status-dot" aria-hidden="true" />
              {focusStatus === "focused" && "Focused"}
              {focusStatus === "attention-reduced" && "Attention Reduced"}
              {focusStatus === "paused" && "Monitoring Paused"}
            </div>
            <p className="status-note-message">{focusMessage}</p>
          </div>

          {isCameraActive ? (
            <button className="camera-button stop-button" type="button" onClick={stopCamera}>
              Stop Camera
            </button>
          ) : (
            <button
              className="camera-button"
              type="button"
              onClick={enableCamera}
              disabled={isCameraStarting}
            >
              {isCameraStarting ? "Starting camera..." : "Enable Camera"}
            </button>
          )}

          <div className="camera-privacy-note">
            <span className="privacy-shield" aria-hidden="true">&#9674;</span>
            <p>
              Camera frames, eye measurements, and focus evaluations stay 100% in this browser.
              No video or telemetry is ever stored or transmitted.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default CameraMonitor;
