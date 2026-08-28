import { useCallback, useEffect, useRef, useState } from "react";

const MEDIAPIPE_VISION_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs";
const MEDIAPIPE_WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const FACE_DETECTOR_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite";
const DETECTION_INTERVAL_MS = 200;

const cameraMessages = {
  "camera-off": "Camera is off. Enable it whenever you are ready to study.",
  starting: "Your browser is requesting camera permission.",
  active: "Camera active. Face detection runs privately in this browser.",
};

const faceMessages = {
  off: "Face monitoring starts when the camera is active.",
  initializing: "Loading the on-device face detector.",
  detected: "Face detected in the current camera view.",
  "not-detected": "No face detected. Move back into the camera view when you are ready.",
};

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
  const detectorRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastDetectionTimeRef = useRef(0);
  const detectionActiveRef = useRef(false);
  const cameraRunIdRef = useRef(0);
  const mountedRef = useRef(true);
  const faceStatusRef = useRef("off");
  const faceMessageRef = useRef(faceMessages.off);

  const [cameraStatus, setCameraStatus] = useState("camera-off");
  const [cameraMessage, setCameraMessage] = useState(cameraMessages["camera-off"]);
  const [faceStatus, setFaceStatus] = useState("off");
  const [faceMessage, setFaceMessage] = useState(faceMessages.off);

  const updateFaceStatus = useCallback((status, message) => {
    if (faceStatusRef.current === status && faceMessageRef.current === message) {
      return;
    }

    faceStatusRef.current = status;
    faceMessageRef.current = message;
    setFaceStatus(status);
    setFaceMessage(message);
  }, []);

  const clearFaceOverlay = useCallback(() => {
    const canvas = faceCanvasRef.current;
    const context = canvas?.getContext("2d");

    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const drawFaceOverlay = useCallback((detection) => {
    const canvas = faceCanvasRef.current;
    const video = videoRef.current;
    const boundingBox = detection.boundingBox;

    if (!canvas || !video || !boundingBox || !video.videoWidth || !video.videoHeight) {
      return;
    }

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#75e3ae";
    context.lineWidth = Math.max(3, canvas.width * 0.006);
    context.shadowColor = "rgba(117, 227, 174, 0.45)";
    context.shadowBlur = 10;
    context.strokeRect(
      boundingBox.originX,
      boundingBox.originY,
      boundingBox.width,
      boundingBox.height,
    );
  }, []);

  const stopFaceDetection = useCallback(() => {
    detectionActiveRef.current = false;
    lastDetectionTimeRef.current = 0;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    detectorRef.current?.close();
    detectorRef.current = null;
    clearFaceOverlay();
  }, [clearFaceOverlay]);

  const stopStream = useCallback(() => {
    stopFaceDetection();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stopFaceDetection]);

  const startFaceDetection = useCallback(
    async (cameraRunId) => {
      const video = videoRef.current;

      if (!video) {
        return;
      }

      updateFaceStatus("initializing", faceMessages.initializing);

      let detector;

      try {
        const { FaceDetector, FilesetResolver } = await import(
          /* @vite-ignore */ MEDIAPIPE_VISION_URL
        );
        const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
        detector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: FACE_DETECTOR_MODEL_URL,
          },
          runningMode: "VIDEO",
          minDetectionConfidence: 0.55,
        });

        if (!mountedRef.current || cameraRunIdRef.current !== cameraRunId) {
          detector.close();
          return;
        }

        detectorRef.current = detector;
        detectionActiveRef.current = true;

        const processFrame = (timestamp) => {
          if (
            !mountedRef.current ||
            !detectionActiveRef.current ||
            cameraRunIdRef.current !== cameraRunId
          ) {
            return;
          }

          const activeVideo = videoRef.current;

          if (!activeVideo || activeVideo.readyState < 2) {
            animationFrameRef.current = requestAnimationFrame(processFrame);
            return;
          }

          if (timestamp - lastDetectionTimeRef.current >= DETECTION_INTERVAL_MS) {
            lastDetectionTimeRef.current = timestamp;

            try {
              const result = detectorRef.current.detectForVideo(activeVideo, performance.now());
              const detection = result.detections[0];

              if (detection) {
                drawFaceOverlay(detection);
                updateFaceStatus("detected", faceMessages.detected);
              } else {
                clearFaceOverlay();
                updateFaceStatus("not-detected", faceMessages["not-detected"]);
              }
            } catch {
              stopFaceDetection();
              updateFaceStatus(
                "error",
                "Face detection stopped unexpectedly. Stop the camera and try again.",
              );
              return;
            }
          }

          animationFrameRef.current = requestAnimationFrame(processFrame);
        };

        animationFrameRef.current = requestAnimationFrame(processFrame);
      } catch {
        detector?.close();

        if (mountedRef.current && cameraRunIdRef.current === cameraRunId) {
          updateFaceStatus(
            "error",
            "Face detection could not be loaded. Check your internet connection and try again.",
          );
        }
      }
    },
    [clearFaceOverlay, drawFaceOverlay, stopFaceDetection, updateFaceStatus],
  );

  const stopCamera = useCallback(() => {
    cameraRunIdRef.current += 1;
    stopStream();
    setCameraStatus("camera-off");
    setCameraMessage(cameraMessages["camera-off"]);
    updateFaceStatus("off", faceMessages.off);
  }, [stopStream, updateFaceStatus]);

  const enableCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("error");
      setCameraMessage(
        "Camera access is not supported in this browser. Use a modern browser on localhost or HTTPS.",
      );
      updateFaceStatus("error", "Face detection needs browser camera support.");
      return;
    }

    const cameraRunId = cameraRunIdRef.current + 1;
    cameraRunIdRef.current = cameraRunId;
    stopStream();
    setCameraStatus("starting");
    setCameraMessage(cameraMessages.starting);
    updateFaceStatus("off", faceMessages.off);

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
      void startFaceDetection(cameraRunId);
    } catch (error) {
      if (!mountedRef.current || cameraRunIdRef.current !== cameraRunId) {
        return;
      }

      stopStream();
      const cameraError = getCameraErrorMessage(error);
      setCameraStatus(cameraError.status);
      setCameraMessage(cameraError.message);
      updateFaceStatus("off", faceMessages.off);
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
          StudyGuard AI uses your camera for real-time focus monitoring. Camera access
          starts only when you choose to enable it.
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

          <div className="face-status-area">
            <div className="status-label">FACE STATUS</div>
            <div className={`face-status ${faceStatus}`} role="status" aria-live="polite">
              <span className="status-dot" aria-hidden="true" />
              {faceStatus === "off" && "Face Monitoring Off"}
              {faceStatus === "initializing" && "Initializing Detection"}
              {faceStatus === "detected" && "Face Detected"}
              {faceStatus === "not-detected" && "Face Not Detected"}
              {faceStatus === "error" && "Detection Error"}
            </div>
            <p className="face-status-message">{faceMessage}</p>
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
              Camera frames and face detection stay in this browser. Do not store or upload
              camera footage.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default CameraMonitor;
