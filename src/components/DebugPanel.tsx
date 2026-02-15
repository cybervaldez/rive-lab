import type { MachineDocData } from '../lib/extractMachineDoc'
import type { EventLogEntry } from '../lib/useEventLog'
import { StateGraph } from './StateGraph'
import { ContextInspector } from './ContextInspector'
import { EventLog } from './EventLog'

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
  return (
    <div className="debug-panel" data-testid="debug-panel">
      <div className="debug-panel-body">
        <StateGraph data={machineDocData} stateValue={stateValue} />
        <hr className="t-hr" />
        <ContextInspector context={context} />
        <hr className="t-hr" />
        <EventLog entries={eventLogEntries} onClear={onClearEventLog} />
      </div>
    </div>
  )
}
