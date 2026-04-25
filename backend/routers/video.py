from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from config import UPLOAD_DIR

router = APIRouter(prefix='/api/session/{session_id}', tags=['video'])


def _session(session_id: str) -> Path:
    p = UPLOAD_DIR / session_id
    if not p.exists():
        raise HTTPException(404, 'Session not found')
    return p


@router.get('/video')
async def get_video(session_id: str):
    session_dir = _session(session_id)
    videos = list(session_dir.glob('video.*'))
    if not videos:
        raise HTTPException(404, 'Video not found')
    ext = videos[0].suffix.lower()
    mime = {
        '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm',
        '.mkv': 'video/x-matroska', '.avi': 'video/x-msvideo',
    }.get(ext, 'video/mp4')
    return FileResponse(str(videos[0]), media_type=mime, headers={'Accept-Ranges': 'bytes'})


@router.get('/captions')
async def get_captions(session_id: str):
    session_dir = _session(session_id)
    vtt = session_dir / 'captions.vtt'
    if not vtt.exists():
        raise HTTPException(404, 'Captions not found')
    return FileResponse(str(vtt), media_type='text/vtt',
                        headers={'Content-Type': 'text/vtt; charset=utf-8'})


@router.get('/download/{filename}')
async def download_clip(session_id: str, filename: str):
    session_dir = _session(session_id)
    clip = session_dir / filename
    if not clip.exists():
        raise HTTPException(404, 'Clip not found')
    return FileResponse(str(clip), media_type='video/mp4', filename=filename)
