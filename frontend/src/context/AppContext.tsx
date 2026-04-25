import { createContext, useContext, useReducer, useRef, useCallback, type RefObject, type ReactNode } from 'react'
import type { AppState, AppAction, TranscriptSegment } from '../types'

const SEGMENT_COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#06b6d4','#f97316']
export { SEGMENT_COLORS }

const initial: AppState = {
  sessionId: null,
  videoUrl: null,
  captionsUrl: null,
  videoDuration: 0,
  filename: null,
  transcript: [],
  currentTime: 0,
  isPlaying: false,
  activeTranscriptId: null,
  recommendations: [],
  isAnalyzing: false,
  segments: [],
  selectedSegmentId: null,
  generatedContent: null,
  isGenerating: false,
  isExporting: null,
  sidePanelTab: 'clips',
  showSegmentEditor: false,
}

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_SESSION':
      return { ...initial, ...action.payload, showSegmentEditor: false }
    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: action.payload }
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload }
    case 'SET_ACTIVE_TRANSCRIPT':
      return { ...state, activeTranscriptId: action.payload }
    case 'SET_RECOMMENDATIONS':
      return { ...state, recommendations: action.payload }
    case 'SET_ANALYZING':
      return { ...state, isAnalyzing: action.payload }
    case 'ADD_SEGMENT':
      return { ...state, segments: [...state.segments, action.payload], selectedSegmentId: action.payload.id }
    case 'UPDATE_SEGMENT':
      return { ...state, segments: state.segments.map(s => s.id === action.payload.id ? action.payload : s) }
    case 'DELETE_SEGMENT':
      return {
        ...state,
        segments: state.segments.filter(s => s.id !== action.payload),
        selectedSegmentId: state.selectedSegmentId === action.payload ? null : state.selectedSegmentId,
      }
    case 'SELECT_SEGMENT':
      return { ...state, selectedSegmentId: action.payload }
    case 'SET_GENERATED_CONTENT':
      return { ...state, generatedContent: action.payload }
    case 'SET_GENERATING':
      return { ...state, isGenerating: action.payload }
    case 'SET_EXPORTING':
      return { ...state, isExporting: action.payload }
    case 'SET_SIDE_TAB':
      return { ...state, sidePanelTab: action.payload }
    case 'TOGGLE_SEGMENT_EDITOR':
      return { ...state, showSegmentEditor: !state.showSegmentEditor }
    default:
      return state
  }
}

function findActiveSegment(segments: TranscriptSegment[], t: number): string | null {
  let lo = 0, hi = segments.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const s = segments[mid]
    if (s.endTime <= t) lo = mid + 1
    else if (s.startTime > t) hi = mid - 1
    else return s.id
  }
  return segments.length > 0 ? segments[Math.min(lo, segments.length - 1)].id : null
}

interface Ctx {
  state: AppState
  dispatch: React.Dispatch<AppAction>
  videoRef: RefObject<HTMLVideoElement>
  seek: (time: number) => void
}

const AppContext = createContext<Ctx>(null!)
export const useApp = () => useContext(AppContext)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial)
  const videoRef = useRef<HTMLVideoElement>(null!)

  const seek = useCallback((time: number) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = time
    // state is stale in useCallback — read transcript directly from the reducer ref via a stable getter
    dispatch({ type: 'SET_CURRENT_TIME', payload: time })
  }, [dispatch, videoRef])

  return (
    <AppContext.Provider value={{ state, dispatch, videoRef, seek }}>
      {children}
    </AppContext.Provider>
  )
}

export { findActiveSegment }
