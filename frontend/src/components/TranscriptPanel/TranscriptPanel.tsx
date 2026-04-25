import { useEffect, useRef, useState } from 'react'
import { Search, User } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type { TranscriptSegment } from '../../types'

function fmt(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60)
  return h ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${m}:${String(sec).padStart(2,'0')}`
}

function SegmentRow({ seg, isActive, onSeek }: { seg: TranscriptSegment; isActive: boolean; onSeek: (t: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isActive && ref.current) {
      ref.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [isActive])

  return (
    <div
      ref={ref}
      onClick={() => onSeek(seg.startTime)}
      className={`group px-3 py-2.5 rounded-lg cursor-pointer transition-colors border
        ${isActive
          ? 'bg-accent-dim border-accent/40 segment-highlight'
          : 'border-transparent hover:bg-surface-2 hover:border-border'
        }`}
    >
      <div className="flex items-start gap-2.5">
        <button
          className={`flex-shrink-0 font-mono text-xs px-1.5 py-0.5 rounded-md mt-0.5 transition-colors
            ${isActive ? 'bg-accent text-white' : 'bg-surface-3 text-slate-400 group-hover:text-accent group-hover:bg-accent-dim'}`}
        >
          {fmt(seg.startTime)}
        </button>
        <div className="flex-1 min-w-0">
          {seg.speaker && (
            <div className="flex items-center gap-1 mb-0.5">
              <User size={10} className="text-slate-500" />
              <span className="text-xs font-medium text-slate-400">{seg.speaker}</span>
            </div>
          )}
          <p className={`text-sm leading-relaxed ${isActive ? 'text-white' : 'text-slate-300'}`}>
            {seg.text}
          </p>
        </div>
      </div>
    </div>
  )
}

export function TranscriptPanel() {
  const { state, videoRef } = useApp()
  const { transcript, activeTranscriptId } = state
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? transcript.filter(s => s.text.toLowerCase().includes(query.toLowerCase()) || s.speaker?.toLowerCase().includes(query.toLowerCase()))
    : transcript

  const seek = (time: number) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = time
    v.play().catch(() => {})
  }

  return (
    <div className="panel flex flex-col min-h-0" style={{ width: '30%', flexShrink: 0 }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-white">Transcript</h2>
          {transcript.length > 0 && (
            <span className="text-xs text-slate-500">{transcript.length} segments</span>
          )}
        </div>
        {transcript.length > 0 && (
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search transcript..."
              className="w-full bg-surface-2 border border-border rounded-lg pl-8 pr-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-accent"
            />
          </div>
        )}
      </div>

      {/* Segments */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {transcript.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
            <div className="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center mb-3">
              <Search size={20} className="text-slate-600" />
            </div>
            <p className="text-sm text-slate-500">Transcript will appear here</p>
            <p className="text-xs text-slate-600 mt-1">Upload a video with a transcript to begin</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">No matching segments</div>
        ) : (
          filtered.map(seg => (
            <SegmentRow
              key={seg.id}
              seg={seg}
              isActive={seg.id === activeTranscriptId}
              onSeek={seek}
            />
          ))
        )}
      </div>
    </div>
  )
}
