const BASE = ''

export async function uploadFiles(video: File, transcript?: File | null, transcriptText?: string): Promise<{
  sessionId: string
  videoUrl: string
  captionsUrl: string | null
  duration: number
  segments: import('../types').TranscriptSegment[]
  filename: string
}> {
  const form = new FormData()
  form.append('video', video)
  if (transcript) form.append('transcript', transcript)
  if (transcriptText) form.append('transcript_text', transcriptText)

  const res = await fetch(`${BASE}/api/upload`, { method: 'POST', body: form })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Upload failed')
  }
  return res.json()
}

export async function analyzeTranscript(sessionId: string): Promise<{ clips: import('../types').ClipRecommendation[] }> {
  const res = await fetch(`${BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Analysis failed')
  }
  return res.json()
}

export async function generateContent(
  sessionId: string,
  startTime: number,
  endTime: number,
  platform: string,
  topic: string,
): Promise<import('../types').GeneratedContent> {
  const res = await fetch(`${BASE}/api/generate-content`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, startTime, endTime, platform, topic }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Content generation failed')
  }
  return res.json()
}

export async function exportClip(
  sessionId: string,
  startTime: number,
  endTime: number,
  aspectRatio: string,
  includeCaptions: boolean,
  label: string,
): Promise<{ downloadUrl: string; filename: string }> {
  const res = await fetch(`${BASE}/api/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, startTime, endTime, aspectRatio, includeCaptions, label }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Export failed')
  }
  return res.json()
}
