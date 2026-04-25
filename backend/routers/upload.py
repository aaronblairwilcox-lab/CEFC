import uuid
from pathlib import Path
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
import aiofiles

from config import UPLOAD_DIR, ALLOWED_VIDEO_EXTENSIONS
from services.transcript_parser import generate_vtt, parse_transcript, segments_to_dict
from services.video_processor import check_ffmpeg, get_video_duration

router = APIRouter(prefix='/api', tags=['upload'])


@router.post('/upload')
async def upload_files(
    video: UploadFile = File(...),
    transcript: UploadFile | None = File(None),
    transcript_text: str | None = Form(None),
):
    ext = Path(video.filename or '').suffix.lower()
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(400, f'Unsupported video format "{ext}". Accepted: {", ".join(ALLOWED_VIDEO_EXTENSIONS)}')

    session_id = str(uuid.uuid4())
    session_dir = UPLOAD_DIR / session_id
    session_dir.mkdir(parents=True)

    video_path = session_dir / f'video{ext}'
    async with aiofiles.open(video_path, 'wb') as f:
        while chunk := await video.read(1024 * 1024):
            await f.write(chunk)

    duration = 0.0
    if check_ffmpeg():
        try:
            duration = get_video_duration(video_path)
        except Exception:
            pass

    raw_transcript = ''
    if transcript_text and transcript_text.strip():
        raw_transcript = transcript_text.strip()
    elif transcript is not None:
        content = await transcript.read()
        raw_transcript = content.decode('utf-8', errors='replace').strip()

    if raw_transcript:
        (session_dir / 'transcript.txt').write_text(raw_transcript, encoding='utf-8')

    segments = []
    captions_url = None
    if raw_transcript:
        parsed = parse_transcript(raw_transcript)
        segments = segments_to_dict(parsed)
        vtt = generate_vtt(parsed)
        (session_dir / 'captions.vtt').write_text(vtt, encoding='utf-8')
        captions_url = f'/api/session/{session_id}/captions'

    return JSONResponse({
        'sessionId': session_id,
        'videoUrl': f'/api/session/{session_id}/video',
        'captionsUrl': captions_url,
        'duration': duration,
        'segments': segments,
        'filename': video.filename,
    })
