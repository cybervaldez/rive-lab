import { useState } from 'react'
import type { MachineDocData } from '../lib/extractMachineDoc'
import type { EventLogEntry } from '../lib/useEventLog'
import { StateGraph } from './StateGraph'
import { ContextInspector } from './ContextInspector'
import { EventLog } from './EventLog'

const DEBUG_TABS = ['State', 'Context', 'Events'] as const
type DebugTab = typeof DEBUG_TABS[number]

interface DebugPanelProps {
  machineDocData: MachineDocData
  stateValue: string
  context: Record<string, any>
  eventLogEntries: EventLogEntry[]
  onClearEventLog: () => void
}

export function DebugPanel({
  machineDocData,
  stateValue,
  context,
  eventLogEntries,
  onClearEventLog,
}: DebugPanelProps) {
  const [activeTab, setActiveTab] = useState<DebugTab>('Context')

  return (
    <div className="debug-panel" data-testid="debug-panel">
      <div className="debug-panel-tabs" data-testid="debug-panel-tabs">
        {DEBUG_TABS.map((tab) => (
          <button
            key={tab}
            className={`debug-panel-tab${activeTab === tab ? ' debug-panel-tab--active' : ''}`}
            data-testid={`debug-tab-${tab.toLowerCase()}`}
            onClick={(e) => { e.stopPropagation(); setActiveTab(tab) }}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="debug-panel-body">
        {activeTab === 'State' && (
          <StateGraph data={machineDocData} stateValue={stateValue} />
        )}
        {activeTab === 'Context' && (
          <ContextInspector context={context} />
        )}
        {activeTab === 'Events' && (
          <EventLog entries={eventLogEntries} onClear={onClearEventLog} />
        )}
      </div>
    </div>
  )
}
