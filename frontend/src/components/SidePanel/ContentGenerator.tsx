import { useState } from 'react'
import { Wand2, Copy, Check, Hash, Type, AlignLeft, Zap, ChevronDown, ChevronUp } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { generateContent } from '../../api/client'
import type { Platform } from '../../types'

const PLATFORMS: { id: Platform; label: string; icon: string }[] = [
  { id: 'youtube',   label: 'YouTube',   icon: '▶' },
  { id: 'tiktok',    label: 'TikTok',    icon: '♪' },
  { id: 'instagram', label: 'Reels',     icon: '◈' },
  { id: 'general',   label: 'General',   icon: '✦' },
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button onClick={copy} className="p-1 text-slate-500 hover:text-slate-200 transition-colors rounded">
      {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
    </button>
  )
}

function Field({ label, icon: Icon, children, value }: {
  label: string; icon: React.ElementType; children: React.ReactNode; value: string
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
          <Icon size={11} />
          <span>{label}</span>
        </div>
        <CopyButton text={value} />
      </div>
      {children}
    </div>
  )
}

export function ContentGenerator() {
  const { state, dispatch } = useApp()
  const { sessionId, segments, selectedSegmentId, generatedContent, isGenerating, transcript, videoDuration } = state

  const [platform, setPlatform] = useState<Platform>('youtube')
  const [topic, setTopic] = useState('')
  const [showHooks, setShowHooks] = useState(false)

  const selectedSeg = segments.find(s => s.id === selectedSegmentId)
  const startTime = selectedSeg?.startTime ?? 0
  const endTime = selectedSeg?.endTime ?? videoDuration

  const generate = async () => {
    if (!sessionId) return
    dispatch({ type: 'SET_GENERATING', payload: true })
    try {
      const result = await generateContent(sessionId, startTime, endTime, platform, topic)
      dispatch({ type: 'SET_GENERATED_CONTENT', payload: result })
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Content generation failed')
    } finally {
      dispatch({ type: 'SET_GENERATING', payload: false })
    }
  }

  const noSession = !sessionId || transcript.length === 0

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto">
      {/* Platform selector */}
      <div className="flex-shrink-0 space-y-3">
        <div>
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1.5 block">Platform</label>
          <div className="grid grid-cols-2 gap-1.5">
            {PLATFORMS.map(p => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2
                  ${platform === p.id ? 'bg-accent text-white' : 'bg-surface-2 text-slate-300 hover:bg-surface-3 border border-border'}`}
              >
                <span className="text-base leading-none">{p.icon}</span>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Segment scope */}
        {segments.length > 0 && (
          <div>
            <label className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1.5 block">Generate For</label>
            <select
              value={selectedSegmentId ?? ''}
              onChange={e => dispatch({ type: 'SELECT_SEGMENT', payload: e.target.value || null })}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-accent"
            >
              <option value="">Full video</option>
              {segments.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        )}

        {/* Optional topic */}
        <div>
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1.5 block">Context / Topic (optional)</label>
          <input
            type="text" value={topic} onChange={e => setTopic(e.target.value)}
            placeholder="e.g. faith, leadership, Sunday sermon..."
            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-accent"
          />
        </div>

        <button
          onClick={generate}
          disabled={noSession || isGenerating}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 size={15} />
              Generate Content
            </>
          )}
        </button>

        {noSession && (
          <p className="text-xs text-slate-500 text-center">Upload a transcript to generate content</p>
        )}
      </div>

      {/* Output */}
      {generatedContent && (
        <div className="flex-1 space-y-4 pb-4">
          <div className="h-px bg-border" />

          <Field label="Title" icon={Type} value={generatedContent.title}>
            <div className="bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-white font-medium leading-snug">
              {generatedContent.title}
            </div>
          </Field>

          <Field label="Description" icon={AlignLeft} value={generatedContent.description}>
            <div className="bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto">
              {generatedContent.description}
            </div>
          </Field>

          <Field
            label="Hashtags"
            icon={Hash}
            value={generatedContent.hashtags.map(h => `#${h}`).join(' ')}
          >
            <div className="flex flex-wrap gap-1.5">
              {generatedContent.hashtags.map((tag, i) => (
                <span key={i} className="px-2 py-0.5 bg-accent-dim text-accent text-xs rounded-full font-medium">
                  #{tag}
                </span>
              ))}
            </div>
          </Field>

          {generatedContent.hooks?.length > 0 && (
            <div className="space-y-1.5">
              <button
                onClick={() => setShowHooks(p => !p)}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider hover:text-white transition-colors"
              >
                <Zap size={11} />
                <span>Opening Hooks</span>
                {showHooks ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
              {showHooks && (
                <div className="space-y-1.5">
                  {generatedContent.hooks.map((hook, i) => (
                    <div key={i} className="flex items-start gap-2 bg-surface-2 border border-border rounded-lg px-3 py-2">
                      <span className="text-xs text-slate-500 font-mono mt-0.5">{i + 1}.</span>
                      <p className="text-xs text-slate-300 flex-1 leading-relaxed">{hook}</p>
                      <CopyButton text={hook} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
