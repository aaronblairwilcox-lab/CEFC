import { Sparkles, Clock, PlayCircle, Plus, AlertCircle } from 'lucide-react'
import { useApp, SEGMENT_COLORS } from '../../context/AppContext'
import { analyzeTranscript } from '../../api/client'
import type { ClipRecommendation } from '../../types'

function fmt(s: number) {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2,'0')}`
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 bg-surface-4 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-accent to-purple-500 rounded-full" style={{ width: `${Math.round(score * 100)}%` }} />
      </div>
      <span className="text-xs text-slate-500 tabular-nums w-7">{Math.round(score * 100)}%</span>
    </div>
  )
}

function ClipCard({ clip, index, onUse }: { clip: ClipRecommendation; index: number; onUse: () => void }) {
  const { videoRef } = useApp()
  const dur = clip.endTime - clip.startTime
  const color = SEGMENT_COLORS[index % SEGMENT_COLORS.length]

  const preview = () => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = clip.startTime
    v.play().catch(() => {})
  }

  return (
    <div className="bg-surface-2 border border-border rounded-xl p-3.5 space-y-2.5 hover:border-slate-600 transition-colors">
      <div className="flex items-start gap-2.5">
        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white leading-tight">{clip.theme}</p>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{clip.description}</p>
        </div>
      </div>

      <ScoreBar score={clip.score} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Clock size={11} />
          <span>{fmt(clip.startTime)} → {fmt(clip.endTime)}</span>
          <span className="text-slate-600">·</span>
          <span>{dur.toFixed(0)}s</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={preview}
            className="p-1.5 text-slate-400 hover:text-accent transition-colors rounded-lg hover:bg-accent-dim"
            title="Preview"
          >
            <PlayCircle size={15} />
          </button>
          <button
            onClick={onUse}
            className="flex items-center gap-1 px-2.5 py-1 bg-accent/20 text-accent text-xs rounded-lg hover:bg-accent/30 transition-colors font-medium"
          >
            <Plus size={12} /> Use
          </button>
        </div>
      </div>
    </div>
  )
}

export function ClipRecommendations() {
  const { state, dispatch } = useApp()
  const { sessionId, recommendations, isAnalyzing, transcript } = state

  const analyze = async () => {
    if (!sessionId) return
    dispatch({ type: 'SET_ANALYZING', payload: true })
    try {
      const result = await analyzeTranscript(sessionId)
      dispatch({ type: 'SET_RECOMMENDATIONS', payload: result.clips })
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      dispatch({ type: 'SET_ANALYZING', payload: false })
    }
  }

  const useClip = (clip: ClipRecommendation, index: number) => {
    const id = `clip-${Date.now()}`
    dispatch({
      type: 'ADD_SEGMENT',
      payload: {
        id,
        startTime: clip.startTime,
        endTime: clip.endTime,
        label: clip.theme,
        aspectRatio: '16:9',
        color: SEGMENT_COLORS[index % SEGMENT_COLORS.length],
      },
    })
    dispatch({ type: 'TOGGLE_SEGMENT_EDITOR' })
    if (!state.showSegmentEditor) dispatch({ type: 'TOGGLE_SEGMENT_EDITOR' })
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      <button
        onClick={analyze}
        disabled={!sessionId || isAnalyzing || transcript.length === 0}
        className="btn-primary flex items-center justify-center gap-2 flex-shrink-0"
      >
        {isAnalyzing ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Analyzing transcript...
          </>
        ) : (
          <>
            <Sparkles size={15} />
            Find Best Clips (AI)
          </>
        )}
      </button>

      {transcript.length === 0 && (
        <div className="flex items-start gap-2 p-3 bg-surface-2 border border-border rounded-lg text-xs text-slate-400">
          <AlertCircle size={13} className="mt-0.5 flex-shrink-0 text-slate-500" />
          Upload a transcript to enable AI clip recommendations.
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="overflow-y-auto flex-1 space-y-2.5 pr-0.5">
          <p className="text-xs text-slate-500 flex-shrink-0">
            {recommendations.length} clips found · ranked by impact
          </p>
          {recommendations.map((clip, i) => (
            <ClipCard key={clip.id} clip={clip} index={i} onUse={() => useClip(clip, i)} />
          ))}
        </div>
      )}

      {recommendations.length === 0 && !isAnalyzing && sessionId && transcript.length > 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-8 gap-3">
          <div className="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center">
            <Sparkles size={22} className="text-slate-600" />
          </div>
          <p className="text-sm text-slate-400">Click above to analyze your transcript and discover high-impact clips</p>
        </div>
      )}
    </div>
  )
}
