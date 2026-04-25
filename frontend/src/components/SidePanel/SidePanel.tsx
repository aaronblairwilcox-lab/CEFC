import { Sparkles, Wand2 } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { ClipRecommendations } from './ClipRecommendations'
import { ContentGenerator } from './ContentGenerator'

export function SidePanel() {
  const { state, dispatch } = useApp()
  const { sidePanelTab } = state

  const tabs = [
    { id: 'clips' as const,   label: 'Clips',   icon: Sparkles },
    { id: 'content' as const, label: 'Content', icon: Wand2 },
  ]

  return (
    <div className="panel flex flex-col min-h-0" style={{ width: '30%', flexShrink: 0 }}>
      {/* Tabs */}
      <div className="flex border-b border-border flex-shrink-0">
        {tabs.map(tab => {
          const Icon = tab.icon
          const active = sidePanelTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => dispatch({ type: 'SET_SIDE_TAB', payload: tab.id })}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2
                ${active ? 'border-accent text-accent' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-3.5">
        {sidePanelTab === 'clips'   && <ClipRecommendations />}
        {sidePanelTab === 'content' && <ContentGenerator />}
      </div>
    </div>
  )
}
