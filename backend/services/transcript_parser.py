import re
from dataclasses import dataclass
from typing import Optional


@dataclass
class TranscriptSegment:
    id: str
    start_time: float
    end_time: float
    text: str
    speaker: Optional[str] = None


def parse_transcript(content: str) -> list[TranscriptSegment]:
    content = content.strip()

    if re.search(r'\d{2}:\d{2}:\d{2}[,\.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,\.]\d{3}', content):
        return _parse_srt(content)

    if content.startswith('WEBVTT') or re.search(r'\d{1,2}:\d{2}:\d{2}\.\d{3}\s*-->\s*', content):
        return _parse_vtt(content)

    if re.search(r'\w[^\[]*\[\d{1,2}:\d{2}(?::\d{2})?\]\s*:', content):
        return _parse_speaker_bracketed(content)

    if re.search(r'\[\d{1,2}:\d{2}(?::\d{2})?\]', content):
        return _parse_bracketed(content)

    if re.search(r'^\d{1,2}:\d{2}(?::\d{2})?\s+\S', content, re.MULTILINE):
        return _parse_plain_timestamp(content)

    return _parse_plain_text(content)


def _ts_to_seconds(ts: str) -> float:
    ts = ts.strip().replace(',', '.')
    parts = ts.split(':')
    if len(parts) == 3:
        return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
    if len(parts) == 2:
        return int(parts[0]) * 60 + float(parts[1])
    return float(ts)


def _parse_srt(content: str) -> list[TranscriptSegment]:
    segments = []
    blocks = re.split(r'\n\s*\n', content.strip())
    for i, block in enumerate(blocks):
        lines = [l for l in block.strip().split('\n') if l.strip()]
        if not lines:
            continue
        line_idx = 1 if re.match(r'^\d+$', lines[0].strip()) else 0
        if line_idx >= len(lines):
            continue
        ts_match = re.match(
            r'(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})',
            lines[line_idx]
        )
        if not ts_match:
            continue
        start = _ts_to_seconds(ts_match.group(1))
        end = _ts_to_seconds(ts_match.group(2))
        text = ' '.join(lines[line_idx + 1:]).strip()
        text = re.sub(r'<[^>]+>', '', text)
        if text:
            segments.append(TranscriptSegment(id=str(i), start_time=start, end_time=end, text=text))
    return segments


def _parse_vtt(content: str) -> list[TranscriptSegment]:
    segments = []
    lines = content.split('\n')
    i = 0
    seg_id = 0
    while i < len(lines):
        ts_match = re.match(
            r'(\d{1,2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})',
            lines[i].strip()
        )
        if ts_match:
            start = _ts_to_seconds(ts_match.group(1))
            end = _ts_to_seconds(ts_match.group(2))
            i += 1
            text_lines = []
            while i < len(lines) and lines[i].strip():
                text_lines.append(lines[i].strip())
                i += 1
            text = re.sub(r'<[^>]+>', '', ' '.join(text_lines))
            if text:
                segments.append(TranscriptSegment(id=str(seg_id), start_time=start, end_time=end, text=text))
                seg_id += 1
        else:
            i += 1
    return segments


def _parse_bracketed(content: str) -> list[TranscriptSegment]:
    segments = []
    pattern = re.compile(r'\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*(.*?)(?=\[\d{1,2}:\d{2}|\Z)', re.DOTALL)
    matches = list(pattern.finditer(content))
    for i, match in enumerate(matches):
        start = _ts_to_seconds(match.group(1))
        text = match.group(2).strip().replace('\n', ' ')
        end = _ts_to_seconds(matches[i + 1].group(1)) if i + 1 < len(matches) else start + 30
        if text:
            segments.append(TranscriptSegment(id=str(i), start_time=start, end_time=end, text=text))
    return segments


def _parse_speaker_bracketed(content: str) -> list[TranscriptSegment]:
    segments = []
    pattern = re.compile(
        r'([^\[\n]+?)\s*\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*:\s*(.*?)(?=(?:[^\[\n]+?\[\d{1,2}:\d{2})|\Z)',
        re.DOTALL
    )
    matches = list(pattern.finditer(content))
    for i, match in enumerate(matches):
        speaker = match.group(1).strip()
        start = _ts_to_seconds(match.group(2))
        text = match.group(3).strip().replace('\n', ' ')
        end = _ts_to_seconds(matches[i + 1].group(2)) if i + 1 < len(matches) else start + 30
        if text:
            segments.append(TranscriptSegment(
                id=str(i), start_time=start, end_time=end, text=text, speaker=speaker
            ))
    return segments


def _parse_plain_timestamp(content: str) -> list[TranscriptSegment]:
    segments = []
    pattern = re.compile(r'^(\d{1,2}:\d{2}(?::\d{2})?)\s+(.*)', re.MULTILINE)
    matches = list(pattern.finditer(content))
    for i, match in enumerate(matches):
        start = _ts_to_seconds(match.group(1))
        text = match.group(2).strip()
        end = _ts_to_seconds(matches[i + 1].group(1)) if i + 1 < len(matches) else start + 30
        if text:
            segments.append(TranscriptSegment(id=str(i), start_time=start, end_time=end, text=text))
    return segments


def _parse_plain_text(content: str) -> list[TranscriptSegment]:
    sentences = re.split(r'(?<=[.!?])\s+', content)
    return [
        TranscriptSegment(id=str(i), start_time=float(i * 5), end_time=float((i + 1) * 5), text=s.strip())
        for i, s in enumerate(sentences) if s.strip()
    ]


def generate_vtt(segments: list[TranscriptSegment]) -> str:
    lines = ['WEBVTT', '']
    for seg in segments:
        lines.append(f'{_to_vtt_ts(seg.start_time)} --> {_to_vtt_ts(seg.end_time)}')
        lines.append(seg.text)
        lines.append('')
    return '\n'.join(lines)


def _to_vtt_ts(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    return f'{h:02d}:{m:02d}:{s:06.3f}'


def _fmt(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    return f'{h:02d}:{m:02d}:{s:02d}' if h else f'{m:02d}:{s:02d}'


def transcript_for_analysis(segments: list[TranscriptSegment]) -> str:
    lines = []
    for seg in segments:
        prefix = f'{seg.speaker}: ' if seg.speaker else ''
        lines.append(f'[{_fmt(seg.start_time)} - {_fmt(seg.end_time)}] {prefix}{seg.text}')
    return '\n'.join(lines)


def segments_to_dict(segments: list[TranscriptSegment]) -> list[dict]:
    return [
        {
            'id': s.id,
            'startTime': s.start_time,
            'endTime': s.end_time,
            'text': s.text,
            'speaker': s.speaker,
        }
        for s in segments
    ]
