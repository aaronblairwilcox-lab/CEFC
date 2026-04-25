import { useState, useRef, type DragEvent, type ChangeEvent } from 'react'
import { X, Upload, FileVideo, FileText, ChevronRight } from 'lucide-react'
import { uploadFiles } from '../../api/client'
import { useApp } from '../../context/AppContext'

interface Props { onClose: () => void }

export function UploadModal({ onClose }: Props) {
  const { dispatch } = useApp()
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null)
  const [transcriptText, setTranscriptText] = useState('')
  const [transcriptMode, setTranscriptMode] = useState<'file' | 'paste'>('file')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [videoDrag, setVideoDrag] = useState(false)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const transcriptInputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: DragEvent, type: 'video' | 'transcript') => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file) return
    if (type === 'video') { setVideoFile(file); setVideoDrag(false) }
    else setTranscriptFile(file)
  }

  const handleSubmit = async () => {
    if (!videoFile) { setError('Please select a video file.'); return }
    if (transcriptMode === 'file' && !transcriptFile && !transcriptText) {
      setError('Please provide a transcript.'); return
    }
    setLoading(true)
    setError('')
    try {
      const result = await uploadFiles(
        videoFile,
        transcriptMode === 'file' ? transcriptFile : null,
        transcriptMode === 'paste' ? transcriptText : undefined,
      )
      dispatch({
        type: 'SET_SESSION',
        payload: {
          sessionId: result.sessionId,
          videoUrl: result.videoUrl,
          captionsUrl: result.captionsUrl,
          duration: result.duration,
          filename: result.filename,
          transcript: result.segments,
        },
      })
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-surface-1 border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-white">Import Files</h2>
            <p className="text-sm text-slate-400 mt-0.5">Upload your video and transcript to get started</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Video drop zone */}
          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Video File</label>
            <div
              onDragOver={e => { e.preventDefault(); setVideoDrag(true) }}
              onDragLeave={() => setVideoDrag(false)}
              onDrop={e => handleDrop(e, 'video')}
              onClick={() => videoInputRef.current?.click()}
              className={`mt-2 border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-colors
                ${videoDrag ? 'border-accent bg-accent-dim' : 'border-border hover:border-slate-500 hover:bg-surface-2'}`}
            >
              <input
                ref={videoInputRef} type="file" className="hidden"
                accept="video/*,.mp4,.mov,.avi,.mkv,.webm,.m4v"
                onChange={(e: ChangeEvent<HTMLInputElement>) => setVideoFile(e.target.files?.[0] ?? null)}
              />
              {videoFile ? (
                <div className="flex items-center gap-2 text-accent">
                  <FileVideo size={20} />
                  <span className="font-medium truncate max-w-xs">{videoFile.name}</span>
                  <span className="text-slate-400 text-sm">({(videoFile.size / 1024 / 1024).toFixed(1)} MB)</span>
                </div>
              ) : (
                <>
                  <Upload size={24} className="text-slate-500" />
                  <p className="text-sm text-slate-400">Drop video here or <span className="text-accent">browse</span></p>
                  <p className="text-xs text-slate-500">MP4, MOV, AVI, MKV, WebM, M4V</p>
                </>
              )}
            </div>
          </div>

          {/* Transcript */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Transcript</label>
              <div className="flex bg-surface-2 rounded-lg p-0.5">
                {(['file', 'paste'] as const).map(m => (
                  <button
                    key={m} onClick={() => setTranscriptMode(m)}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                      transcriptMode === m ? 'bg-surface-4 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {m === 'file' ? 'Upload File' : 'Paste Text'}
                  </button>
                ))}
              </div>
            </div>

            {transcriptMode === 'file' ? (
              <div
                onClick={() => transcriptInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-5 flex items-center gap-3 cursor-pointer hover:border-slate-500 hover:bg-surface-2 transition-colors"
                onDrop={e => handleDrop(e, 'transcript')}
                onDragOver={e => e.preventDefault()}
              >
                <input
                  ref={transcriptInputRef} type="file" className="hidden"
                  accept=".txt,.srt,.vtt,.doc,.docx"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setTranscriptFile(e.target.files?.[0] ?? null)}
                />
                <FileText size={20} className={transcriptFile ? 'text-green-400' : 'text-slate-500'} />
                {transcriptFile ? (
                  <span className="text-sm text-green-400 font-medium">{transcriptFile.name}</span>
                ) : (
                  <span className="text-sm text-slate-400">Drop transcript or <span className="text-accent">browse</span> — SRT, VTT, TXT</span>
                )}
              </div>
            ) : (
              <textarea
                value={transcriptText}
                onChange={e => setTranscriptText(e.target.value)}
                placeholder={`Paste your transcript here. Supports:\n[00:00:01] Text...\n00:00:01 --> 00:00:05 Text...\nSpeaker [00:00:01]: Text...`}
                rows={6}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-accent resize-none font-mono"
              />
            )}
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-800/50 rounded-lg px-4 py-2.5 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !videoFile}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Process Files <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
