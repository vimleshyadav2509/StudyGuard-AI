# StudyGuard AI

> **Smart On-Device Study Assistant** — Autonomous, privacy-first computer vision assistant built for deep work, fatigue prevention, distraction management, and focus tracking.

[![On-Device AI](https://img.shields.io/badge/AI-100%25%20On--Device-06b6d4?style=flat-square)](https://github.com)
[![Privacy First](https://img.shields.io/badge/Privacy-Zero%20Video%20Uploads-10b981?style=flat-square)](https://github.com)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61dafb?style=flat-square)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square)](https://fastapi.tiangolo.com)
[![MediaPipe](https://img.shields.io/badge/Vision-MediaPipe%20WASM-ff6f00?style=flat-square)](https://developers.google.com/mediapipe)

---

## 📖 Overview

**StudyGuard AI** is an intelligent, privacy-preserving study companion designed to help students and professionals sustain high-focus study sessions. Operating entirely within the browser sandbox via WebAssembly (WASM), StudyGuard AI monitors facial landmarks, eye aperture, head orientation, and nearby electronic devices to deliver timely, non-intrusive interventions before cognitive fatigue and digital distractions derail deep work.

---

## ❗ Problem

Modern learners face three primary threats to effective self-directed study:
1. **Unnoticed Fatigue & Drowsiness**: Long study sessions often cause eye strain and micro-sleeps, severely diminishing retention and comprehension.
2. **Digital & Device Distractions**: Smartphone notifications and proximity to unintended electronic devices introduce frequent context switching.
3. **Loss of Gaze & Focus**: Students frequently look away or zone out without realizing their study rhythm has broken.
4. **Privacy Concerns with Webcam Monitoring**: Existing proctoring and focus tools send raw webcam video to remote cloud servers, creating severe privacy risks.

---

## 💡 Solution

StudyGuard AI solves these challenges with **100% On-Device Artificial Intelligence**:
* **Autonomous Local Processing**: All neural vision models execute locally in your browser using MediaPipe and WebAssembly.
* **Zero Video Streaming**: Webcam frames are analyzed in memory and immediately discarded. No video is ever stored or uploaded.
* **Intelligent Multi-Modal Alerts**: Condition-tied visual HUD banners and pleasant audio alerts gently guide you back to focus.

---

## ✨ Features

- 👤 **Real-Time Face Presence Tracking**: 468-point 3D facial mesh tracking at high frame rates.
- 👁️ **Eye Aperture & Blink Monitoring**: Geometric calculation of normalized Eye Aspect Ratio (EAR) across both eyes.
- 😴 **Drowsiness State Machine**: Multi-stage detection distinguishing normal blinking from prolonged eye closure ($\ge 2.0\text{s}$).
- 🎯 **Study Focus Monitoring**: Evaluates sustained visual attention with temporal debounce to eliminate false positives.
- 👀 **Eye Direction & Gaze Alignment**: Real-time 3D head pose estimation detecting sustained looking-away behavior ($\ge 1.5\text{s}$).
- 💻 **Electronic Device Detection**: On-device object detection identifying mobile phones, laptops, monitors, keyboards, mice, and remote controls.
- ⚡ **High-Performance Mobile Phone Detection**: Rapid 130ms inference loop with dual-tier temporal confirmation and motion-blur tolerance.
- 📱 **Dynamic Device Identification**: Contextual bounding boxes and dynamic device naming on the live camera canvas.
- 🔔 **Smart Unified Alert Hierarchy**: Four-tier priority arbiter ensuring urgent alerts take precedence.
- 🎵 **Customizable Alarm Tunes**: Multi-tone selection (Classic, Focus, Digital, Gentle, Urgent) with audio preview and persistent preference storage.
- 🔊 **Dual-Engine Audio Alarms**: High-fidelity custom alarm audio with automatic Web Audio API synthesizer fallback.
- ⏱️ **Deep Work Chronometer**: Drift-free study session timer with high-precision timestamp tracking.
- 🎨 **Futuristic Cybernetic Dashboard**: Dark glassmorphic interface with electric cyan, purple, and neon accents.
- ♿ **Accessible & Responsive**: Fully responsive from 360px mobile screens to 4K displays, with keyboard controls and `prefers-reduced-motion` support.

---

## 🚨 Alert Priority Hierarchy

When multiple distraction or fatigue conditions coincide, StudyGuard AI resolves them through an autonomous priority state machine:

| Priority | Trigger Condition | Severity | Description |
| :--- | :--- | :--- | :--- |
| **P1** | **Drowsiness Detected** | Danger (Red) | Extended eye closure ($\ge 2.0\text{s}$). Recommends immediate break. |
| **P2** | **Electronic Device Detected** | Danger (Red) | Phone, laptop, or remote in view ($\ge 400\text{ms}$). Prompts device removal. |
| **P3** | **Looking Away from Screen** | Warning (Yellow) | Head or gaze turned away ($\ge 1.5\text{s}$). Re-centers study focus. |
| **P4** | **Attention Reduced** | Warning (Yellow) | Significant drop in eye aperture or intermittent focus loss. |

---

## 🔒 Privacy & Security Architecture

* **100% On-Device Execution**: Neural inference runs inside client-side WASM sandboxes.
* **No Video or Biometric Uploads**: Raw camera frames and facial measurements never leave your computer.
* **No Biometric Profiling**: Measures instantaneous eye geometry and object classes; does **not** identify or profile individuals.
* **Zero Persistent Video Storage**: Frames exist only for the fraction of a millisecond needed for geometric calculation.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 19 / JSX
- **Build Tool**: Vite 8.x
- **Styling**: Tailwind CSS v4 & Vanilla Glassmorphic CSS Design System
- **Computer Vision**: Google MediaPipe (`@mediapipe/tasks-vision` WASM runtime)
  - MediaPipe FaceLandmarker (`face_landmarker.task`, 468-point 3D mesh)
  - MediaPipe ObjectDetector (`efficientdet_lite0.tflite`)
- **Audio Engine**: HTML5 Audio + Web Audio API Synthetic Oscillator Fallback

### Backend
- **Framework**: Python FastAPI
- **ASGI Server**: Uvicorn
- **CORS Middleware**: Preconfigured for secure local development

---

## 📁 Project Structure

```text
StudyGuard-AI/
├── frontend/                     # React + Vite Frontend Application
│   ├── public/                   # Static assets
│   │   └── sounds/               # Audio alarm assets (studyguard-alarm.mp3)
│   ├── src/
│   │   ├── components/
│   │   │   ├── AlertNotification.jsx # Floating HUD alert banner & quick mute
│   │   │   ├── AlertSettings.jsx     # Master alert & condition control center
│   │   │   ├── CameraMonitor.jsx     # Neural camera stream, vision loops & canvas
│   │   │   └── StudySessionTimer.jsx # Drift-free deep work chronometer
│   │   ├── utils/
│   │   │   └── audioAlert.js     # Unified HTML5 + Web Audio alarm service
│   │   ├── App.jsx               # Application shell & unified alert priority arbiter
│   │   ├── index.css             # Futuristic dark glassmorphic design system
│   │   └── main.jsx              # React application entry point
│   ├── index.html                # Vite HTML5 template
│   ├── package.json              # Frontend dependencies and npm scripts
│   └── vite.config.js            # Vite bundler configuration with Tailwind plugin
├── backend/                      # Python FastAPI Backend
│   ├── main.py                   # Health check endpoint & CORS configuration
│   └── requirements.txt          # Python dependencies (fastapi, uvicorn)
├── docs/                         # Technical Architecture Documentation
│   └── ARCHITECTURE.md           # System data flow & model pipeline specs
├── .gitignore                    # Version control ignore rules
└── README.md                     # Project documentation
```

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Python](https://www.python.org/) (v3.10+ recommended)

---

### 1. Frontend Setup

Open a terminal in the project directory:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

The frontend will be available at: **`http://localhost:5173`**

---

### 2. Backend Setup (Optional API Health Service)

Open a second terminal:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload
```

The backend API will run at: **`http://127.0.0.1:8000`**  
API Documentation (Swagger UI): **`http://127.0.0.1:8000/docs`**

---

## 🧪 Verification & Testing

### Production Build Verification
To verify the production bundle builds cleanly with zero errors:

```powershell
cd frontend
npm.cmd run build
```

### Manual Testing Flow
1. **Camera Monitor**:
   - Click **Enable Camera Stream** and allow webcam access.
   - Verify 468-point eye mesh tracking and telemetry cards update in real-time.
   - Click **Stop Camera Stream** and verify hardware resources release immediately.
2. **Fatigue Detection (P1)**:
   - Close eyes continuously for $\ge 2.0\text{s}$.
   - Verify the **Drowsiness Alert** HUD banner and audible alarm trigger.
   - Open eyes to confirm the alarm and banner dismiss automatically.
3. **Electronic Device Detection (P2)**:
   - Hold a smartphone or display a laptop/keyboard in camera view for $\ge 400\text{ms}$.
   - Verify bounding box overlay and **Electronic Device Detected** alert.
   - Move device away to confirm clear within 700ms.
4. **Study Session Chronometer**:
   - Test **Start**, **Pause**, **Resume**, **End**, and **Reset** actions.
   - Confirm elapsed time calculates with zero timer drift.
5. **Smart Alert Controls**:
   - Test master **Visual Alerts** and **Audible Alarm** toggles.
   - Adjust the **Volume Slider** and test via the **Test Alarm** button.

---

## 🌐 Vercel Deployment

Deploying StudyGuard AI to Vercel is straightforward:

1. **Import Repository**: Connect your GitHub repository `StudyGuard-AI` in the Vercel Dashboard.
2. **Configure Project Settings**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
3. **Environment Variables**: None required (all computer vision models execute 100% on-device in the browser).
4. **Deploy**: Click **Deploy**. Vercel will build the frontend bundle and serve it with pre-configured security and caching headers via `vercel.json`.

---

## ⚠️ Limitations

- **Lighting Conditions**: Extremely dim lighting may reduce landmark detection accuracy.
- **Camera Angle & Occlusion**: Moderate front-facing camera positioning is recommended. Heavy occlusion (e.g. thick scarves covering eyes) will pause tracking.
- **Hardware Acceleration**: Devices without WebGL/WebAssembly hardware acceleration may experience lower frame rates.
- **Non-Medical Grade**: StudyGuard AI is an educational productivity tool and is not intended for medical or clinical diagnostic purposes.

---

## 🔮 Future Scope

- 📊 **Study Habit Analytics**: Historical session tracking with daily/weekly focus trends.
- 🧘 **Smart Micro-Break Coach**: Guided Pomodoro intervals and 20-20-20 eye strain exercises.
- 🎯 **Custom Focus Profiles**: User-defined sensitivity thresholds for EAR and looking-away duration.
- ☁️ **End-to-End Encrypted Cloud Sync**: Optional multi-device session sync with user-managed encryption keys.

---

## 📄 License

This project is open source and available under the **MIT License**.
