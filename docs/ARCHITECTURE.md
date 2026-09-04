# StudyGuard AI — System Architecture & Technical Specifications

## 1. System Overview

StudyGuard AI is an autonomous, on-device study and deep-work assistant designed to prevent fatigue, eliminate study distractions, and maintain cognitive engagement through pure client-side computer vision.

All neural vision models, facial landmark mesh decoders, gaze estimators, and object detectors execute locally inside the user's browser runtime via WebAssembly (WASM) and WebGL/WebGPU acceleration. Zero video streams, photographic frames, or biometric identifiers are ever transmitted to any external server.

---

## 2. High-Level Architecture Flow

```text
                                 [ User Webcam ]
                                        │
                                        ▼
                        [ navigator.mediaDevices.getUserMedia ]
                                        │
                                        ▼
                               [ HTML5 Video Element ]
                                        │
             ┌──────────────────────────┴──────────────────────────┐
             ▼                                                     ▼
 [ MediaPipe FaceLandmarker ]                           [ MediaPipe ObjectDetector ]
 (468 3D Mesh Landmarks @ 100ms)                       (EfficientDet-Lite0 @ 250ms)
             │                                                     │
             ├──────────────────────────┐                          ▼
             ▼                          ▼              [ Electronic Device Filter ]
     [ EAR Calculation ]       [ Gaze / Head Pose ]    (cell phone, laptop, tv, etc.)
  (Left & Right Eye Aperture)   (Yaw / Pitch Ratios)               │
             │                          │                          │
             ▼                          ▼                          ▼
 [ Drowsiness State Machine ]   [ Looking-Away Engine ]   [ Temporal Confirmation Latch ]
 (Alert / Closed / Drowsy)     (Screen-Aligned vs Away)   (400ms On / 700ms Clear)
             │                          │                          │
             └──────────────────────────┼──────────────────────────┘
                                        ▼
                         [ Unified Alert Priority Arbiter ]
                                        │
                                        ├─ Priority 1: Drowsiness Suspected
                                        ├─ Priority 2: Electronic Device Detected
                                        ├─ Priority 3: Looking Away from Screen
                                        └─ Priority 4: Attention Reduced
                                        │
             ┌──────────────────────────┴──────────────────────────┐
             ▼                                                     ▼
  [ Floating Visual Banner ]                              [ Audio Alert Engine ]
  (HUD Micro-Badge & Banner)                       (HTML5 Audio / Web Audio Synth)
                                                                   │
                                                                   ▼
                                                          [ Speaker Output ]
```

---

## 3. Core Subsystems

### 3.1 Vision Ingestion & Lifecycle Pipeline (`CameraMonitor.jsx`)
* **Camera Initialization**: Requests user permission via `navigator.mediaDevices.getUserMedia({ video: true, audio: false })`.
* **Hardware Lifecycle**: Synchronized with React state and `cameraRunIdRef` to prevent memory leaks, orphan streams, or race conditions during rapid start/stop toggling.
* **Canvas Overlay Layer**: Real-time rendering of eye contours (colored dynamically based on open/closed state) and electronic device bounding boxes with identifying tags.

### 3.2 468-Point Facial Landmark & Eye Monitoring
* **Model**: MediaPipe FaceLandmarker (`face_landmarker.task`, Float16 quantization).
* **Sampling Rate**: Throttled to 100ms (`DETECTION_INTERVAL_MS = 100`) via `performance.now()` in a non-blocking `requestAnimationFrame` loop.
* **Eye Aspect Ratio (EAR)**:
  $$\text{EAR} = \frac{||\mathbf{p}_2 - \mathbf{p}_6|| + ||\mathbf{p}_3 - \mathbf{p}_5||}{2 \cdot ||\mathbf{p}_1 - \mathbf{p}_4||}$$
  * Left Eye Indices: $p_1=33, p_2=160, p_3=158, p_4=133, p_5=153, p_6=144$
  * Right Eye Indices: $p_1=362, p_2=385, p_3=387, p_4=263, p_5=373, p_6=380$
* **Thresholds & Stability**:
  * Open Threshold: $\ge 0.21$ (requires 200ms continuous confirmation)
  * Closed Threshold: $\le 0.17$ (requires 350ms continuous confirmation)
  * Drowsiness Threshold: Sustained eye closure $\ge 2000\text{ms}$.

### 3.3 Head Pose & Gaze Estimation (Looking Away)
* **Landmark Triangulation**: Computes geometric ratios between nose tip (Index 1), left cheek (Index 234), right cheek (Index 454), forehead (Index 10), and chin (Index 152).
* **Yaw Ratio**: Horizontal distribution of facial width relative to nose anchor.
* **Pitch Ratio**: Vertical distribution of facial height relative to nose anchor.
* **Debounce**: 1500ms continuous deviation required to trigger "Looking Away"; 350ms required to clear.

### 3.4 Electronic Device Detection (COCO-SSD / Object Detector)
* **Model**: MediaPipe ObjectDetector (`efficientdet_lite0.tflite`, Float16).
* **Sampling Rate**: Throttled to 250ms (`OBJECT_DETECTION_INTERVAL_MS = 250`).
* **Supported Categories & Confidence**:
  * Mobile Phone (`cell phone`): $\ge 0.52$ min score
  * Laptop (`laptop`): $\ge 0.48$ min score
  * Monitor / TV (`tv`): $\ge 0.48$ min score
  * Keyboard (`keyboard`): $\ge 0.50$ min score
  * Mouse (`mouse`): $\ge 0.50$ min score
  * Remote Control (`remote`): $\ge 0.52$ min score
* **Temporal Latch**: 400ms continuous presence confirmation to latch "Device Detected"; 700ms continuous clear confirmation to release.

---

## 4. Alert Priority Hierarchy & State Machine

When multiple conditions trigger simultaneously, the **Unified Alert Engine** in `App.jsx` evaluates them in strict order of severity:

| Priority | Condition | Severity | Description | Action |
| :--- | :--- | :--- | :--- | :--- |
| **P1** | `DROWSINESS` | Danger (Red) | Sustained eye closure $\ge 2.0\text{s}$ | High-priority alarm + urgent rest recommendation |
| **P2** | `ELECTRONIC_DEVICE` | Danger (Red) | Phone, laptop, or remote in view $\ge 400\text{ms}$ | Device-specific alert with bounding box |
| **P3** | `LOOKING_AWAY` | Warning (Yellow) | Gaze deviation $\ge 1.5\text{s}$ | Focus alignment prompt |
| **P4** | `ATTENTION_REDUCED` | Warning (Yellow) | Eye aperture drop / intermittent focus loss | Attention refocus prompt |

---

## 5. Audio Subsystem Architecture (`audioAlert.js`)

* **Dual-Engine Architecture**:
  1. **Primary**: High-fidelity custom MP3 audio playback (`/sounds/studyguard-alarm.mp3`) using HTML5 `Audio`.
  2. **Fallback**: Web Audio API oscillator synthesis generating dual-tone chime waves (659.25 Hz Sine + 329.63 Hz Triangle modulated to 880 Hz / 440 Hz) if audio decoding fails or network is restricted.
* **Auto-Play Policy Unlocking**: Global event listeners on first pointer interaction (`pointerdown`) and keypress unlock the `AudioContext` and pre-load media buffers.
* **Condition Latching**: Audio loops smoothly during active conditions without restarting from time 0 on each frame.
* **Immediate Clearance**: The moment the triggering condition clears or the user dismisses the alert, audio stops instantly.

---

## 6. Deep Work Chronometer (`StudySessionTimer.jsx`)

* **Drift-Free Precision**: Utilizes high-resolution system timestamps (`Date.now()`) with accumulated millisecond offsets to prevent JavaScript timer drift common in standard `setInterval` implementations.
* **Session Lifecycle**: Finite State Machine (`idle` $\rightarrow$ `running` $\leftrightarrow$ `paused` $\rightarrow$ `ended` $\rightarrow$ `idle`).

---

## 7. Backend Microservice (`backend/main.py`)

* **Framework**: FastAPI (Python 3.10+) with Uvicorn ASGI server.
* **CORS Policy**: Configured specifically for local development ports (`localhost:5173`, `127.0.0.1:5173`).
* **Endpoints**:
  * `GET /api/health` — Liveness and readiness probe for system monitoring.
  * Interactive Swagger docs at `/docs`.
