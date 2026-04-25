import json
import anthropic

from config import ANTHROPIC_API_KEY
from services.transcript_parser import TranscriptSegment, transcript_for_analysis

_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    return _client


async def recommend_clips(segments: list[TranscriptSegment]) -> list[dict]:
    text = transcript_for_analysis(segments)
    total = segments[-1].end_time if segments else 0

    prompt = f"""You are a social media video strategist. Analyze this transcript and identify compelling 10–30 second clips.

Transcript (total duration: {total:.0f}s):
{text}

Find 6–10 high-value segments that work as standalone social media clips:
- Self-contained insight, story, or quote
- Emotionally resonant or surprising
- Clear beginning and end
- Covers a single theme or point

Return ONLY a JSON array:
[
  {{
    "startTime": <float seconds>,
    "endTime": <float seconds>,
    "theme": "<3-5 word theme>",
    "description": "<1-2 sentences on why this clip works>",
    "score": <0.0-1.0>
  }}
]

Rules:
- endTime - startTime must be 10–30
- Times must match actual transcript timestamps
- No prose, no markdown, no code fences — pure JSON array only"""

    msg = _get_client().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}]
    )
    raw = msg.content[0].text.strip()
    if '```' in raw:
        raw = raw.split('```')[1].lstrip('json').strip().split('```')[0].strip()

    clips = json.loads(raw)
    result = []
    for i, c in enumerate(clips):
        dur = c.get('endTime', 0) - c.get('startTime', 0)
        if 10 <= dur <= 30:
            c['id'] = str(i)
            result.append(c)
    return sorted(result, key=lambda x: x.get('score', 0), reverse=True)
