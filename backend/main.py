from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="StudyGuard AI API")

# These are the local addresses used by Vite during development.
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    """Return a simple response confirming that the API is running."""
    return {
        "status": "ok",
        "message": "StudyGuard AI API is running",
    }
