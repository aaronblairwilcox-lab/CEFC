from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import upload, video, content

app = FastAPI(title='Transcript Video Matcher', version='1.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(upload.router)
app.include_router(video.router)
app.include_router(content.router)


@app.get('/health')
async def health():
    from services.video_processor import check_ffmpeg
    from config import ANTHROPIC_API_KEY
    return {
        'status': 'ok',
        'ffmpeg': check_ffmpeg(),
        'anthropic': bool(ANTHROPIC_API_KEY),
    }
