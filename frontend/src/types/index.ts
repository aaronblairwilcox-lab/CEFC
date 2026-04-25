export interface TranscriptSegment {
  id: string
  startTime: number
  endTime: number
  text: string
  speaker?: string | null
}

export interface ClipRecommendation {
  id: string
  startTime: number
  endTime: number
  theme: string
  description: string
  score: number
}

export interface VideoSegment {
  id: string
  startTime: number
  endTime: number
  label: string
  aspectRatio: AspectRatio
  color: string
}

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5'

export type Platform = 'youtube' | 'tiktok' | 'instagram' | 'general'

export interface GeneratedContent {
  platform: Platform
  title: string
  description: string
  hashtags: string[]
  hooks: string[]
}

export interface AppState {
  sessionId: string | null
  videoUrl: string | null
  captionsUrl: string | null
  videoDuration: number
  filename: string | null
  transcript: TranscriptSegment[]
  currentTime: number
  isPlaying: boolean
  activeTranscriptId: string | null
  recommendations: ClipRecommendation[]
  isAnalyzing: boolean
  segments: VideoSegment[]
  selectedSegmentId: string | null
  generatedContent: GeneratedContent | null
  isGenerating: boolean
  isExporting: string | null
  sidePanelTab: 'clips' | 'content'
  showSegmentEditor: boolean
}

export type AppAction =
  | { type: 'SET_SESSION'; payload: { sessionId: string; videoUrl: string; captionsUrl: string | null; duration: number; filename: string; transcript: TranscriptSegment[] } }
  | { type: 'SET_CURRENT_TIME'; payload: number }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_ACTIVE_TRANSCRIPT'; payload: string | null }
  | { type: 'SET_RECOMMENDATIONS'; payload: ClipRecommendation[] }
  | { type: 'SET_ANALYZING'; payload: boolean }
  | { type: 'ADD_SEGMENT'; payload: VideoSegment }
  | { type: 'UPDATE_SEGMENT'; payload: VideoSegment }
  | { type: 'DELETE_SEGMENT'; payload: string }
  | { type: 'SELECT_SEGMENT'; payload: string | null }
  | { type: 'SET_GENERATED_CONTENT'; payload: GeneratedContent }
  | { type: 'SET_GENERATING'; payload: boolean }
  | { type: 'SET_EXPORTING'; payload: string | null }
  | { type: 'SET_SIDE_TAB'; payload: 'clips' | 'content' }
  | { type: 'TOGGLE_SEGMENT_EDITOR' }
