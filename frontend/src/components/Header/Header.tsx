import { Upload, Layers, Clock } from 'lucide-react'
import { useApp } from '../../context/AppContext'

interface Props { onUploadClick: () => void }

function fmtDur(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60)
  return h ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${m}:${String(sec).padStart(2,'0')}`
}

export function Header({ onUploadClick }: Props) {
  const { state } = useApp()

  return (
    <header className="flex items-center justify-between px-5 py-3 bg-surface-1 border-b border-border flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
          <Layers size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-white leading-tight">Transcript Video Matcher</h1>
          <p className="text-xs text-slate-500 leading-tight">AI-powered video segmentation</p>
        </div>
      </div>

      {/* Session info */}
      {state.filename && (
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="truncate max-w-[200px] text-slate-300">{state.filename}</span>
          </div>
          {state.videoDuration > 0 && (
            <div className="flex items-center gap-1">
              <Clock size={11} />
              <span>{fmtDur(state.videoDuration)}</span>
            </div>
          )}
          {state.transcript.length > 0 && (
            <span>{state.transcript.length} segments</span>
          )}
        </div>
      )}

      <button onClick={onUploadClick} className="btn-primary flex items-center gap-2 text-sm">
        <Upload size={15} />
        {state.sessionId ? 'New Session' : 'Upload Files'}
      </button>
    </header>
  )
}
