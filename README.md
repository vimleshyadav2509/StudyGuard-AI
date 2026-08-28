# StudyGuard AI

StudyGuard AI is a privacy-first study and focus assistant. In future milestones, it will help students build better study habits with tools such as focus monitoring, timers, analytics, and an AI study coach.

## Current Milestone

**Milestone 3: Real-Time Face Detection + Face Presence Monitoring**

This milestone adds optional, real-time face presence monitoring to the live camera preview. MediaPipe Face Detector runs locally in the browser after the user enables the camera. Camera frames and face data are not stored or uploaded to the FastAPI server.

## Technology Stack

- **Frontend:** React, Vite, JavaScript, CSS, MediaPipe Face Detector
- **Backend:** Python, FastAPI

## Project Structure

```text
StudyGuard-AI/
├── frontend/                 # React dashboard application
│   ├── src/
│   │   ├── App.jsx           # Main dashboard component
│   │   ├── components/       # Reusable React components
│   │   │   └── CameraMonitor.jsx # Camera, face detection, and preview UI
│   │   ├── index.css         # Dashboard styles
│   │   └── main.jsx          # React application entry point
│   ├── index.html            # Web page Vite loads
│   ├── package.json          # Frontend dependencies and commands
│   └── vite.config.js        # Vite configuration
├── backend/                  # Python FastAPI application
│   ├── main.py               # API routes and CORS configuration
│   └── requirements.txt      # Python packages needed by the API
├── .gitignore                # Files Git should not track
└── README.md                 # Project setup and usage guide
```

## What Each Major Folder Does

- **`frontend/`** contains everything the user sees in the browser. React builds the dashboard interface here.
- **`frontend/src/`** contains the React code and CSS styling for the dashboard.
- **`frontend/src/components/CameraMonitor.jsx`** starts the camera after a button click, runs MediaPipe face detection locally, draws the face box, and stops camera/detection resources when requested or when the page closes.
- **`backend/`** contains the Python code that provides API endpoints for the frontend.
- **`backend/main.py`** starts the FastAPI app and currently provides the health-check endpoint.

## Prerequisites

Install these before running the project:

- [Node.js](https://nodejs.org/) (includes npm)
- [Python](https://www.python.org/downloads/)

During Python installation, select **Add Python to PATH**. You can confirm both tools are ready with:

```powershell
node --version
python --version
```

## Frontend Setup (Windows)

Open PowerShell in the project folder and run:

```powershell
cd frontend
npm.cmd install
```

Start the frontend development server:

```powershell
npm.cmd run dev
```

Vite will show a local address, normally `http://localhost:5173`. Open that address in your browser.

## Backend Setup (Windows)

Open a **second** PowerShell window in the project folder and run:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload
```

If PowerShell blocks the activation command, use Command Prompt instead:

```cmd
cd backend
python -m venv .venv
.venv\Scripts\activate.bat
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload
```

The backend runs at `http://127.0.0.1:8000`.

## API Endpoint

### `GET /api/health`

Open `http://127.0.0.1:8000/api/health` in a browser, or use:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health
```

Expected response:

```json
{
  "status": "ok",
  "message": "StudyGuard AI API is running"
}
```

FastAPI also provides interactive API documentation at `http://127.0.0.1:8000/docs` while the backend is running.

## Milestone 3 Manual Check

1. Start the backend in one terminal and the frontend in another terminal.
2. Open the Vite URL in a browser.
3. Confirm the header, welcome section, dashboard cards, and Camera Monitoring section are visible.
4. Select **Enable Camera** and allow the browser permission prompt. Confirm the live preview, **Camera Active**, and **Initializing Detection** statuses appear.
5. Stay in the camera view and confirm **Face Detected** plus a subtle green box appear.
6. Move out of the camera view and confirm **Face Not Detected** appears without an alarm.
7. Return to the camera view and confirm the status returns to **Face Detected**.
8. Select **Stop Camera** and confirm the preview turns off, camera status becomes **Camera Off**, and face monitoring turns off.
9. Reload the page, select **Enable Camera**, and deny the request. Confirm the **Permission Denied** message is clear.
10. Reduce the browser width or use mobile device emulation. The camera area and cards should stack cleanly.
11. Open the health endpoint URL and confirm the expected JSON response appears.

Stop here after Milestone 3. Later milestones can add further study features.
