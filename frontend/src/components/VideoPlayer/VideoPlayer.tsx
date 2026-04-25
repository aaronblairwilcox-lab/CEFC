import { useEffect, useRef, useState, useCallback } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Subtitles } from 'lucide-react'
import { useApp, findActiveSegment } from '../../context/AppContext'

function fmt(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60)
  return h ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${m}:${String(sec).padStart(2,'0')}`
}

export function VideoPlayer() {
  const { state, dispatch, videoRef } = useApp()
  const { videoUrl, captionsUrl, videoDuration, transcript, isPlaying } = state

  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [captionsOn, setCaptionsOn] = useState(true)
  const [buffered, setBuffered] = useState(0)
  const progressRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)

  // RAF-based time tracking for smooth progress
  const trackTime = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    const t = v.currentTime
    dispatch({ type: 'SET_CURRENT_TIME', payload: t })
    dispatch({ type: 'SET_ACTIVE_TRANSCRIPT', payload: findActiveSegment(transcript, t) })
    if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1))
    rafRef.current = requestAnimationFrame(trackTime)
  }, [dispatch, videoRef, transcript])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onPlay = () => { dispatch({ type: 'SET_PLAYING', payload: true }); rafRef.current = requestAnimationFrame(trackTime) }
    const onPause = () => { dispatch({ type: 'SET_PLAYING', payload: false }); cancelAnimationFrame(rafRef.current) }
    const onEnded = () => { dispatch({ type: 'SET_PLAYING', payload: false }); cancelAnimationFrame(rafRef.current) }
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('ended', onEnded)
    return () => { v.removeEventListener('play', onPlay); v.removeEventListener('pause', onPause); v.removeEventListener('ended', onEnded); cancelAnimationFrame(rafRef.current) }
  }, [dispatch, videoRef, trackTime])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.volume = volume
    v.muted = muted
  }, [videoRef, volume, muted])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const tracks = v.textTracks
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = captionsOn ? 'showing' : 'hidden'
    }
  }, [videoRef, captionsOn, captionsUrl])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    isPlaying ? v.pause() : v.play()
  }

  const seekByClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current
    const v = videoRef.current
    if (!bar || !v || !videoDuration) return
    const rect = bar.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    v.currentTime = pct * videoDuration
  }

  const toggleFullscreen = () => {
    const container = videoRef.current?.parentElement
    if (!container) return
    if (!document.fullscreenElement) container.requestFullscreen()
    else document.exitFullscreen()
  }

  const duration = videoDuration || 0
  const currentTime = state.currentTime
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0

  if (!videoUrl) {
    return (
      <div className="flex-1 panel flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center mx-auto">
            <Play size={28} className="text-slate-600 ml-1" />
          </div>
          <p className="text-slate-500 text-sm">No video loaded</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 panel flex flex-col overflow-hidden min-h-0">
      {/* Video */}
      <div className="relative flex-1 bg-black min-h-0 group">
        <video
          ref={videoRef}
          src={videoUrl}
          crossOrigin="anonymous"
          className="w-full h-full object-contain"
          onClick={togglePlay}
          playsInline
        >
          {captionsUrl && (
            <track kind="subtitles" src={captionsUrl} srcLang="en" label="English" default />
          )}
        </video>

        {/* Big play overlay */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <div className="w-16 h-16 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm">
              <Play size={28} className="text-white ml-1" />
            </div>
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="px-4 pt-3 pb-3 bg-surface-2 space-y-2 flex-shrink-0">
        {/* Progress bar */}
        <div
          ref={progressRef}
          className="relative h-1.5 bg-surface-4 rounded-full cursor-pointer group/bar"
          onClick={seekByClick}
        >
          {/* Buffered */}
          <div className="absolute inset-y-0 left-0 bg-slate-600 rounded-full" style={{ width: `${bufferedPct}%` }} />
          {/* Played */}
          <div className="absolute inset-y-0 left-0 bg-accent rounded-full" style={{ width: `${progress}%` }} />
          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow opacity-0 group-hover/bar:opacity-100 transition-opacity"
            style={{ left: `calc(${progress}% - 7px)` }}
          />
        </div>

        {/* Buttons row */}
        <div className="flex items-center gap-3">
          <button onClick={togglePlay} className="text-white hover:text-accent transition-colors">
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>

          <span className="text-xs text-slate-400 font-mono tabular-nums">
            {fmt(currentTime)} / {fmt(duration)}
          </span>

          <div className="flex-1" />

          {/* Captions */}
          <button
            onClick={() => setCaptionsOn(p => !p)}
            className={`transition-colors ${captionsOn ? 'text-accent' : 'text-slate-500 hover:text-slate-300'}`}
            title="Toggle captions"
          >
            <Subtitles size={18} />
          </button>

          {/* Volume */}
          <button onClick={() => setMuted(p => !p)} className="text-slate-400 hover:text-white transition-colors">
            {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume}
            onChange={e => { setVolume(+e.target.value); setMuted(false) }}
            className="w-20 accent-accent"
          />

          <button onClick={toggleFullscreen} className="text-slate-400 hover:text-white transition-colors">
            <Maximize size={17} />
          </button>
        </div>
      </div>
    </div>
  )
}
