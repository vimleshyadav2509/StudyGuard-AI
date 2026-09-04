# 🧠 StudyGuard AI

### Autonomous Private On-Device Study Intelligence

StudyGuard AI is a privacy-first, browser-based computer vision system designed to help students maintain focus during study sessions.

It uses real-time on-device AI to monitor study focus, eye behavior, gaze direction, electronic device distractions, and drowsiness — without uploading camera data to external servers.

## 🚀 Live Demo

🌐 **Try StudyGuard AI Live**

https://study-guard-ai-topaz.vercel.app

---

# ✨ Key Features

## 🎯 Real-Time Study Focus Monitoring

StudyGuard AI continuously evaluates visual attention and study engagement in real time.

- Study focus monitoring
- Attention reduction detection
- Distraction tracking
- Real-time monitoring lifecycle

---

## 📱 Electronic Device Detection

The system detects distracting electronic devices visible in the camera stream.

Supported detection includes:

- Mobile phones
- Laptops
- Monitors
- Keyboards
- Mice
- Other supported electronic devices

Detection runs locally inside the browser.

---

## 👀 Eye & Gaze Monitoring

StudyGuard AI analyzes eye behavior and visual attention.

Features include:

- Eye aperture monitoring
- Drowsiness detection
- Looking-away detection
- Head pose awareness
- Gaze direction monitoring

---

## 🚨 Unified Smart Alert System

StudyGuard AI provides configurable alerts when distraction or reduced focus is detected.

Alert capabilities include:

- Visual alerts
- Audible alarms
- Custom alarm sounds
- Multiple alert priorities
- Condition-based alert lifecycle
- Adjustable alarm volume

Available alert conditions:

1. 😴 Drowsiness Alert
2. 💻 Electronic Device Detection
3. 👀 Looking Away Alert
4. 🎯 Attention Reduced

---

## 🔊 Custom Alarm System

Users can choose between multiple alarm styles.

Available alarm profiles include:

- 🔔 Classic Alert
- ⚡ Focus Alarm
- 🤖 Digital Warning
- 🍃 Gentle Reminder
- 🚨 High Priority

Alarm preferences are stored locally using browser storage.

---

## ⏱️ Study Session Management

StudyGuard AI includes a built-in deep work session system.

Features:

- Session timer
- Start study session
- Pause session
- Resume session
- End session
- Real-time session status

---

# 🔒 Privacy-First Architecture

Privacy is a core design principle of StudyGuard AI.

## 100% Local Inference

AI models execute directly inside the user's browser.

The camera stream is processed locally and is not transmitted for remote AI processing.

## Zero Video Uploads

StudyGuard AI does not upload:

- Video streams
- Camera frames
- Screenshots
- Biometric recordings

to external servers for AI inference.

## No Biometric Profiling

StudyGuard AI focuses on geometric visual signals such as:

- Eye openness
- Face orientation
- Gaze direction
- Object presence

It does not perform identity recognition or biometric profiling.

---

# 🏗️ System Architecture

```text
                    ┌──────────────────────┐
                    │     User Camera      │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Browser Video Stream │
                    └──────────┬───────────┘
                               │
                               ▼
              ┌────────────────────────────────┐
              │     On-Device AI Processing    │
              │                                │
              │  • Face Detection              │
              │  • Eye Monitoring              │
              │  • Gaze Tracking               │
              │  • Object Detection            │
              │  • Focus Evaluation            │
              └───────────────┬────────────────┘
                              │
                              ▼
                 ┌──────────────────────────┐
                 │ StudyGuard Alert Engine  │
                 └────────────┬─────────────┘
                              │
                 ┌────────────┼─────────────┐
                 ▼            ▼             ▼
              Visual       Audio          Session
              Alerts       Alarm          Tracking
```

---

# 🖼️ Application Preview

## 🏠 StudyGuard AI Dashboard

![StudyGuard AI Dashboard](./screenshots/dashboard.png)

---

## 📷 Camera & Vision Workspace

![Camera and Vision Workspace](./screenshots/camera-vision.png)

Real-time computer vision telemetry and monitoring are displayed directly inside the application.

---

## ⏱️ Deep Work Study Session

![Study Session](./screenshots/study-session.png)

The integrated session management system helps users track focused study time.

---

## 🚨 Smart Alert Control

![Smart Alert Control](./screenshots/smart-alerts.png)

Users can configure monitoring conditions, alert priorities, alarm sounds, and volume.

---

## 🧠 Study Intelligence & Privacy

![Study Intelligence and Privacy](./screenshots/intelligence-privacy.png)

StudyGuard AI combines multiple monitoring capabilities while keeping AI inference on-device.

---

# 🛠️ Technology Stack

## Frontend

- React
- Vite
- JavaScript
- HTML5
- CSS3

## AI & Computer Vision

- Google MediaPipe Vision Tasks
- MediaPipe Face Landmarks
- Object Detection
- WebAssembly
- WebGL

## Browser APIs

- MediaDevices API
- Web Audio API
- localStorage

## Deployment

- Vercel
- HTTPS

---

# 💻 Local Installation

Clone the repository:

```bash
git clone https://github.com/vimleshyadav2509/StudyGuard-AI.git
```

Navigate to the frontend:

```bash
cd StudyGuard-AI/frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

---

# 🌐 Production Deployment

StudyGuard AI is deployed publicly using Vercel.

Live Application:

https://study-guard-ai-topaz.vercel.app

The application runs directly in modern browsers and does not require users to install:

- Python
- Backend software
- Local AI models
- Additional desktop applications

---

# 🎯 Use Cases

StudyGuard AI can be useful for:

- 📚 Focused self-study
- 💻 Deep work sessions
- 🧑‍🎓 Student productivity
- 🧠 Attention awareness
- 📵 Distraction monitoring
- 🏫 Smart education projects
- 🚀 AI and computer vision demonstrations

---

# 🔮 Future Improvements

Planned enhancements may include:

- Personalized focus analytics
- Study performance reports
- Focus history visualization
- Custom detection models
- Advanced device detection
- Productivity insights
- Multi-session analytics
- Optional cloud sync with user consent

---

# 🤝 Contributing

Contributions, suggestions, and improvements are welcome.

1. Fork the repository
2. Create a feature branch
3. Make improvements
4. Submit a pull request

---

# 👨‍💻 Developer

**Vimlesh Kumar Yadav**

B.Tech Computer Science & Engineering

Project: **StudyGuard AI**

---

# ⭐ Support

If you find StudyGuard AI useful, consider giving the repository a ⭐ on GitHub.

---

### 🔒 Privacy First. Intelligence On-Device. Focus Without Distraction.
