import json
import re
import shutil
import subprocess
from pathlib import Path


def check_ffmpeg() -> bool:
    return shutil.which('ffmpeg') is not None


def get_video_duration(video_path: Path) -> float:
    result = subprocess.run(
        ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', str(video_path)],
        capture_output=True, text=True, timeout=30
    )
    data = json.loads(result.stdout)
    return float(data['format']['duration'])


def extract_clip(
    video_path: Path,
    output_path: Path,
    start_time: float,
    end_time: float,
    aspect_ratio: str = '16:9',
    captions_path: Path | None = None,
) -> Path:
    duration = end_time - start_time
    vf_filters = []

    crop = _crop_filter(aspect_ratio)
    if crop:
        vf_filters.append(crop)

    if captions_path and captions_path.exists():
        adj = _adjusted_captions(captions_path, start_time, output_path.parent)
        if adj:
            escaped = str(adj).replace('\\', '/').replace(':', '\\:')
            style = 'FontSize=22,Bold=1,Alignment=2,Outline=2,Shadow=1,MarginV=25,PrimaryColour=&H00FFFFFF'
            vf_filters.append(f"subtitles='{escaped}':force_style='{style}'")

    cmd = ['ffmpeg', '-y', '-ss', str(start_time), '-i', str(video_path), '-t', str(duration)]
    if vf_filters:
        cmd += ['-vf', ','.join(vf_filters)]
    cmd += ['-c:v', 'libx264', '-crf', '23', '-preset', 'fast', '-c:a', 'aac', '-b:a', '128k', str(output_path)]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if result.returncode != 0:
        raise RuntimeError(f'FFmpeg failed: {result.stderr[-500:]}')
    return output_path


def _crop_filter(aspect_ratio: str) -> str | None:
    return {
        '16:9': None,
        '9:16': 'crop=ih*9/16:ih:(iw-ih*9/16)/2:0,scale=1080:1920',
        '1:1':  'crop=ih:ih:(iw-ih)/2:0,scale=1080:1080',
        '4:5':  'crop=ih*4/5:ih:(iw-ih*4/5)/2:0,scale=1080:1350',
    }.get(aspect_ratio)


def _adjusted_captions(captions_path: Path, start_offset: float, out_dir: Path) -> Path | None:
    content = captions_path.read_text(encoding='utf-8')

    def shift(ts: str) -> str:
        parts = ts.split(':')
        total = (int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])) if len(parts) == 3 \
            else (int(parts[0]) * 60 + float(parts[1]))
        adj = max(0.0, total - start_offset)
        h, rem = divmod(adj, 3600)
        m, s = divmod(rem, 60)
        return f'{int(h):02d}:{int(m):02d}:{s:06.3f}'

    def repl(m):
        return f'{shift(m.group(1))} --> {shift(m.group(2))}'

    adjusted = re.sub(
        r'(\d{1,2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})',
        repl, content
    )
    out = out_dir / f'adj_{captions_path.name}'
    out.write_text(adjusted, encoding='utf-8')
    return out
