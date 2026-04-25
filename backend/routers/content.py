from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import UPLOAD_DIR, ANTHROPIC_API_KEY
from services.transcript_parser import parse_transcript, segments_to_dict
from services.clip_recommender import recommend_clips
from services.content_generator import generate_content
from services.video_processor import check_ffmpeg, extract_clip

router = APIRouter(prefix='/api', tags=['content'])


def _session(session_id: str) -> Path:
    p = UPLOAD_DIR / session_id
    if not p.exists():
        raise HTTPException(404, 'Session not found')
    return p


def _load_segments(session_dir: Path):
    tf = session_dir / 'transcript.txt'
    if not tf.exists():
        raise HTTPException(400, 'No transcript for this session')
    return parse_transcript(tf.read_text(encoding='utf-8'))


class AnalyzeRequest(BaseModel):
    sessionId: str


class ContentRequest(BaseModel):
    sessionId: str
    startTime: float
    endTime: float
    platform: str = 'general'
    topic: str = ''


class ExportRequest(BaseModel):
    sessionId: str
    startTime: float
    endTime: float
    aspectRatio: str = '16:9'
    includeCaptions: bool = True
    label: str = 'clip'


@router.post('/analyze')
async def analyze(req: AnalyzeRequest):
    if not ANTHROPIC_API_KEY:
        raise HTTPException(503, 'ANTHROPIC_API_KEY not configured')
    segments = _load_segments(_session(req.sessionId))
    clips = await recommend_clips(segments)
    return {'clips': clips}


@router.post('/generate-content')
async def gen_content(req: ContentRequest):
    if not ANTHROPIC_API_KEY:
        raise HTTPException(503, 'ANTHROPIC_API_KEY not configured')
    all_segs = _load_segments(_session(req.sessionId))
    clip_segs = [s for s in all_segs if s.end_time > req.startTime and s.start_time < req.endTime] or all_segs
    return await generate_content(clip_segs, req.platform, req.topic)


@router.post('/export')
async def export_clip(req: ExportRequest):
    if not check_ffmpeg():
        raise HTTPException(503, 'FFmpeg is not installed on this server')
    session_dir = _session(req.sessionId)
    videos = list(session_dir.glob('video.*'))
    if not videos:
        raise HTTPException(404, 'Video not found')

    captions_path = session_dir / 'captions.vtt' if req.includeCaptions else None
    safe_label = ''.join(c if c.isalnum() or c in '-_' else '_' for c in req.label)
    filename = f'{safe_label}_{req.aspectRatio.replace(":", "x")}_{int(req.startTime)}s.mp4'
    output_path = session_dir / filename

    extract_clip(
        video_path=videos[0],
        output_path=output_path,
        start_time=req.startTime,
        end_time=req.endTime,
        aspect_ratio=req.aspectRatio,
        captions_path=captions_path if captions_path and captions_path.exists() else None,
    )

    return {'downloadUrl': f'/api/session/{req.sessionId}/download/{filename}', 'filename': filename}
