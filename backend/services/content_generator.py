import json
import anthropic

from config import ANTHROPIC_API_KEY
from services.transcript_parser import TranscriptSegment, transcript_for_analysis

_client: anthropic.Anthropic | None = None

PLATFORMS = {
    'youtube':   'YouTube (SEO-driven, detailed, 2-3 paragraph description, high-volume + niche hashtags)',
    'tiktok':    'TikTok (punchy, trend-aware, hooks matter most, 3-5 word title, 20-30 hashtags)',
    'instagram': 'Instagram Reels (lifestyle tone, emotive, community-oriented, 15-20 hashtags)',
    'general':   'all major platforms (balanced cross-platform approach)',
}


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    return _client


async def generate_content(segments: list[TranscriptSegment], platform: str = 'general', topic: str = '') -> dict:
    text = transcript_for_analysis(segments)
    plat_desc = PLATFORMS.get(platform, PLATFORMS['general'])
    topic_line = f'\nAdditional context: {topic}' if topic else ''

    prompt = f"""You are a top social media content strategist for {plat_desc}.

Analyze this video transcript and craft optimized metadata.{topic_line}

Transcript:
{text}

Return ONLY a JSON object — no markdown, no code fences:
{{
  "title": "<compelling, platform-optimized title>",
  "description": "<engaging description with natural keyword integration>",
  "hashtags": ["<tag1>", "<tag2>", ...],
  "hooks": ["<hook1>", "<hook2>", "<hook3>"]
}}

Requirements:
- title: max 60 chars for YouTube/TikTok; under 40 for short-form
- description: 2-3 paragraphs for YouTube; 1-2 punchy sentences for short-form
- hashtags: 20-30 tags without # prefix; mix high-volume, medium, and niche
- hooks: 3 powerful opening sentences to capture attention within 3 seconds
- All content must directly reflect what is actually said in the transcript"""

    msg = _get_client().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}]
    )
    raw = msg.content[0].text.strip()
    if '```' in raw:
        raw = raw.split('```')[1].lstrip('json').strip().split('```')[0].strip()

    result = json.loads(raw)
    result['platform'] = platform
    return result
