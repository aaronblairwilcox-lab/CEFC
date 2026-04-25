import { useRef, useState, useCallback, useEffect } from 'react'
import { Scissors, Download, Trash2, Plus, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { useApp, SEGMENT_COLORS } from '../../context/AppContext'
import { exportClip } from '../../api/client'
import type { AspectRatio, VideoSegment } from '../../types'

const ASPECT_RATIOS: { id: AspectRatio; label: string; sub: string }[] = [
  { id: '16:9', label: '16:9', sub: 'YouTube' },
  { id: '9:16', label: '9:16', sub: 'Reels/Shorts' },
  { id: '1:1',  label: '1:1',  sub: 'Instagram' },
  { id: '4:5',  label: '4:5',  sub: 'Portrait' },
]

function fmt(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60)
  return h ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${m}:${String(sec).padStart(2,'0')}`
}

type DragState =
  | { kind: 'idle' }
  | { kind: 'creating'; startX: number; startTime: number; currentTime: number }
  | { kind: 'handle'; segId: string; handle: 'start' | 'end'; startX: number; origTime: number }

export function SegmentEditor() {
  const { state, dispatch, videoRef } = useApp()
  const { segments, videoDuration, currentTime, selectedSegmentId, sessionId, showSegmentEditor, captionsUrl } = state

  const [globalAR, setGlobalAR] = useState<AspectRatio>('16:9')
  const [drag, setDrag] = useState<DragState>({ kind: 'idle' })
  const [exportingId, setExportingId] = useState<string | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  const duration = videoDuration || 1

  const pctToTime = useCallback((px: number): number => {
    const bar = timelineRef.current
    if (!bar) return 0
    const rect = bar.getBoundingClientRect()
    return Math.max(0, Math.min(duration, ((px - rect.left) / rect.width) * duration))
  }, [duration])

  const timeToPct = (t: number) => `${(t / duration) * 100}%`

  // Global mouse events for drag
  useEffect(() => {
    if (drag.kind === 'idle') return

    const onMove = (e: MouseEvent) => {
      if (drag.kind === 'creating') {
        setDrag(d => d.kind === 'creating' ? { ...d, currentTime: pctToTime(e.clientX) } : d)
      } else if (drag.kind === 'handle') {
        const t = pctToTime(e.clientX)
        const seg = segments.find(s => s.id === drag.segId)
        if (!seg) return
        const updated = drag.handle === 'start'
          ? { ...seg, startTime: Math.min(t, seg.endTime - 1) }
          : { ...seg, endTime: Math.max(t, seg.startTime + 1) }
        dispatch({ type: 'UPDATE_SEGMENT', payload: updated })
      }
    }

    const onUp = (e: MouseEvent) => {
      if (drag.kind === 'creating') {
        const t = pctToTime(e.clientX)
        const start = Math.min(drag.startTime, t)
        const end = Math.max(drag.startTime, t)
        if (end - start >= 1) {
          const id = `seg-${Date.now()}`
          dispatch({
            type: 'ADD_SEGMENT',
            payload: {
              id, startTime: start, endTime: end,
              label: `Clip ${segments.length + 1}`,
              aspectRatio: globalAR,
              color: SEGMENT_COLORS[segments.length % SEGMENT_COLORS.length],
            },
          })
        }
      }
      setDrag({ kind: 'idle' })
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [drag, segments, dispatch, pctToTime, globalAR])

  const onTimelineMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).dataset.handle) return
    e.preventDefault()
    const t = pctToTime(e.clientX)
    setDrag({ kind: 'creating', startX: e.clientX, startTime: t, currentTime: t })
  }

  const doExport = async (seg: VideoSegment) => {
    if (!sessionId) return
    setExportingId(seg.id)
    try {
      const result = await exportClip(
        sessionId, seg.startTime, seg.endTime,
        seg.aspectRatio, !!captionsUrl, seg.label
      )
      const a = document.createElement('a')
      a.href = result.downloadUrl
      a.download = result.filename
      a.click()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setExportingId(null)
    }
  }

  const seekTo = (t: number) => {
    const v = videoRef.current
    if (v) { v.currentTime = t; v.play().catch(() => {}) }
  }

  // Preview ghost while creating
  const ghostStart = drag.kind === 'creating' ? Math.min(drag.startTime, drag.currentTime) : 0
  const ghostEnd   = drag.kind === 'creating' ? Math.max(drag.startTime, drag.currentTime) : 0

  return (
    <div className="panel flex flex-col flex-shrink-0">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <Scissors size={15} className="text-slate-400" />
          <span className="text-sm font-semibold text-white">Segment Editor</span>
          {segments.length > 0 && (
            <span className="text-xs bg-surface-3 text-slate-400 rounded-full px-2 py-0.5">{segments.length}</span>
          )}
        </div>

        {/* Aspect ratio */}
        <div className="flex items-center gap-1 ml-2">
          {ASPECT_RATIOS.map(ar => (
            <button
              key={ar.id} onClick={() => setGlobalAR(ar.id)}
              title={ar.sub}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors
                ${globalAR === ar.id ? 'bg-accent text-white' : 'text-slate-400 hover:text-white hover:bg-surface-3'}`}
            >
              {ar.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <button
          onClick={() => {
            if (!videoDuration) return
            const id = `seg-${Date.now()}`
            const start = currentTime
            const end = Math.min(currentTime + 30, videoDuration)
            dispatch({
              type: 'ADD_SEGMENT',
              payload: { id, startTime: start, endTime: end, label: `Clip ${segments.length + 1}`, aspectRatio: globalAR, color: SEGMENT_COLORS[segments.length % SEGMENT_COLORS.length] },
            })
          }}
          disabled={!videoDuration}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-surface-2 border border-border rounded-lg text-slate-300 hover:border-slate-500 hover:text-white transition-colors disabled:opacity-40"
        >
          <Plus size={13} /> Add at Playhead
        </button>

        <button
          onClick={() => dispatch({ type: 'TOGGLE_SEGMENT_EDITOR' })}
          className="text-slate-500 hover:text-white transition-colors"
        >
          {showSegmentEditor ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>

      {/* Timeline */}
      <div className="px-4 py-3">
        <div
          ref={timelineRef}
          onMouseDown={onTimelineMouseDown}
          className="relative h-12 bg-surface-2 border border-border rounded-xl overflow-hidden cursor-crosshair select-none"
        >
          {/* Transcript tick marks */}
          {videoDuration > 0 && state.transcript.slice(0, 200).map(seg => (
            <div
              key={seg.id}
              className="absolute top-0 bottom-0 w-px bg-slate-700/50 pointer-events-none"
              style={{ left: timeToPct(seg.startTime) }}
            />
          ))}

          {/* Segments */}
          {segments.map(seg => {
            const left = (seg.startTime / duration) * 100
            const width = ((seg.endTime - seg.startTime) / duration) * 100
            const isSelected = seg.id === selectedSegmentId
            return (
              <div
                key={seg.id}
                onClick={() => dispatch({ type: 'SELECT_SEGMENT', payload: seg.id })}
                onDoubleClick={() => seekTo(seg.startTime)}
                className={`absolute top-1 bottom-1 rounded-lg flex items-center justify-center overflow-hidden cursor-pointer transition-opacity
                  ${isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-surface-2' : 'opacity-80 hover:opacity-100'}`}
                style={{ left: `${left}%`, width: `${width}%`, background: seg.color + '55', borderLeft: `3px solid ${seg.color}` }}
              >
                <span className="text-xs text-white font-medium px-1 truncate"
                  style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                  {seg.label}
                </span>
                {/* Handles */}
                <div
                  data-handle="start"
                  onMouseDown={e => { e.stopPropagation(); setDrag({ kind: 'handle', segId: seg.id, handle: 'start', startX: e.clientX, origTime: seg.startTime }) }}
                  className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20"
                />
                <div
                  data-handle="end"
                  onMouseDown={e => { e.stopPropagation(); setDrag({ kind: 'handle', segId: seg.id, handle: 'end', startX: e.clientX, origTime: seg.endTime }) }}
                  className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20"
                />
              </div>
            )
          })}

          {/* Creation ghost */}
          {drag.kind === 'creating' && ghostEnd > ghostStart && (
            <div
              className="absolute top-1 bottom-1 rounded-lg bg-white/10 border-2 border-dashed border-white/40 pointer-events-none"
              style={{ left: timeToPct(ghostStart), width: timeToPct(ghostEnd - ghostStart) }}
            />
          )}

          {/* Playhead */}
          {videoDuration > 0 && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-accent pointer-events-none z-10"
              style={{ left: timeToPct(currentTime) }}
            >
              <div className="w-2.5 h-2.5 bg-accent rounded-full -translate-x-1/2 -translate-y-0.5" />
            </div>
          )}

          {/* Empty hint */}
          {segments.length === 0 && drag.kind === 'idle' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-xs text-slate-600">Click and drag to create a segment</span>
            </div>
          )}
        </div>
      </div>

      {/* Segment cards */}
      {segments.length > 0 && (
        <div className="px-4 pb-3 flex gap-2.5 overflow-x-auto">
          {segments.map(seg => {
            const isSelected = seg.id === selectedSegmentId
            const isExporting = exportingId === seg.id
            return (
              <div
                key={seg.id}
                onClick={() => dispatch({ type: 'SELECT_SEGMENT', payload: seg.id })}
                className={`flex-shrink-0 w-56 bg-surface-2 border rounded-xl p-3 cursor-pointer transition-colors space-y-2
                  ${isSelected ? 'border-accent/60' : 'border-border hover:border-slate-500'}`}
              >
                {/* Label */}
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: seg.color }} />
                  <input
                    value={seg.label}
                    onClick={e => e.stopPropagation()}
                    onChange={e => dispatch({ type: 'UPDATE_SEGMENT', payload: { ...seg, label: e.target.value } })}
                    className="flex-1 bg-transparent text-sm font-medium text-white focus:outline-none border-b border-transparent focus:border-slate-500"
                  />
                </div>

                {/* Time */}
                <div className="text-xs text-slate-400 font-mono">
                  {fmt(seg.startTime)} → {fmt(seg.endTime)} · {(seg.endTime - seg.startTime).toFixed(0)}s
                </div>

                {/* Aspect ratio per-segment */}
                <div className="flex gap-1">
                  {ASPECT_RATIOS.map(ar => (
                    <button
                      key={ar.id}
                      onClick={e => { e.stopPropagation(); dispatch({ type: 'UPDATE_SEGMENT', payload: { ...seg, aspectRatio: ar.id } }) }}
                      className={`flex-1 py-0.5 text-xs rounded font-medium transition-colors
                        ${seg.aspectRatio === ar.id ? 'bg-accent text-white' : 'bg-surface-3 text-slate-400 hover:text-white'}`}
                    >
                      {ar.label}
                    </button>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <button
                    onClick={e => { e.stopPropagation(); seekTo(seg.startTime) }}
                    className="flex-1 text-xs py-1.5 bg-surface-3 hover:bg-surface-4 text-slate-300 rounded-lg transition-colors"
                  >
                    Preview
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); doExport(seg) }}
                    disabled={isExporting || !sessionId}
                    className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 bg-accent/20 hover:bg-accent/30 text-accent rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isExporting ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                    Export
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); dispatch({ type: 'DELETE_SEGMENT', payload: seg.id }) }}
                    className="p-1.5 text-slate-600 hover:text-red-400 transition-colors rounded-lg hover:bg-red-950/30"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
