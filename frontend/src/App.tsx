import { useState } from 'react'
import { Header } from './components/Header/Header'
import { TranscriptPanel } from './components/TranscriptPanel/TranscriptPanel'
import { VideoPlayer } from './components/VideoPlayer/VideoPlayer'
import { SidePanel } from './components/SidePanel/SidePanel'
import { SegmentEditor } from './components/SegmentEditor/SegmentEditor'
import { UploadModal } from './components/UploadModal/UploadModal'
import { useApp } from './context/AppContext'
import { Layers, Upload, Scissors } from 'lucide-react'

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center px-8">
      <div className="w-20 h-20 rounded-2xl bg-surface-2 border border-border flex items-center justify-center">
        <Layers size={36} className="text-slate-600" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-white">Transcript Video Matcher</h2>
        <p className="text-slate-400 text-sm max-w-md leading-relaxed">
          Upload a video and transcript to sync them, discover high-impact clips with AI,
          segment for social media, and generate optimized titles, descriptions, and hashtags.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 text-left max-w-sm w-full">
        {[
          ['Hover-to-Seek', 'Click any transcript line to jump to that moment in the video'],
          ['AI Clip Finder', 'Discover the best 10–30s clips automatically from your content'],
          ['Social Segmentation', 'Cut clips for TikTok, Reels, Shorts & more with correct ratios'],
          ['Closed Captions', 'Every exported clip includes styled, burned-in captions'],
        ].map(([title, desc]) => (
          <div key={title} className="bg-surface-2 border border-border rounded-xl p-3.5">
            <p className="text-xs font-semibold text-white mb-1">{title}</p>
            <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
      <button onClick={onUpload} className="btn-primary flex items-center gap-2 px-6 py-2.5">
        <Upload size={16} /> Upload Video + Transcript
      </button>
    </div>
  )
}

export default function App() {
  const { state, dispatch } = useApp()
  const [showUpload, setShowUpload] = useState(false)

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-surface-0">
      <Header onUploadClick={() => setShowUpload(true)} />

      {state.sessionId ? (
        <>
          {/* 3-panel workspace */}
          <div className="flex flex-1 gap-2 p-2 min-h-0 overflow-hidden">
            <TranscriptPanel />
            <VideoPlayer />
            <SidePanel />
          </div>

          {/* Segment editor */}
          {state.showSegmentEditor ? (
            <div className="flex-shrink-0 border-t border-border mx-2 mb-2">
              <SegmentEditor />
            </div>
          ) : (
            <div className="flex-shrink-0 px-2 pb-2">
              <button
                onClick={() => dispatch({ type: 'TOGGLE_SEGMENT_EDITOR' })}
                className="w-full flex items-center justify-center gap-2 py-2 bg-surface-1 border border-border rounded-xl text-xs text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
              >
                <Scissors size={13} /> Segment Editor
              </button>
            </div>
          )}
        </>
      ) : (
        <EmptyState onUpload={() => setShowUpload(true)} />
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
    </div>
  )
}
