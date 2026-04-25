import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

UPLOAD_DIR = Path("/tmp/cefc_uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v", ".wmv", ".flv", ".ts"}
