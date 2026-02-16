import { AnimatePresence, motion } from 'motion/react'
import { DebugPanel } from './DebugPanel'
import type { MachineDocData } from '../lib/extractMachineDoc'
import type { EventLogEntry } from '../lib/useEventLog'

interface DebugFooterProps {
  stateValue: string
  context: Record<string, any>
  machineDocData: MachineDocData
  eventLogEntries: EventLogEntry[]
  onClearEventLog: () => void
  mode: 'collapsed' | 'expanded' | 'pinned'
  onToggle: () => void
  onPin: () => void
}

export function DebugFooter({
  stateValue,
  context,
  machineDocData,
  eventLogEntries,
  onClearEventLog,
  mode,
  onToggle,
  onPin,
}: DebugFooterProps) {
  const bindingCount = context.bindings ? Object.keys(context.bindings).length : 0
  const activeInputCount = context.activeInputs ? Object.keys(context.activeInputs).filter((k: string) => context.activeInputs[k]).length : 0
  const activeTab = context.activeTab ?? ''
  const isOpen = mode === 'expanded' || mode === 'pinned'

  return (
    <div
      className={`debug-footer debug-footer--${mode}`}
      data-testid="debug-footer"
    >
      <div className="debug-footer-bar" data-testid="debug-footer-bar">
        <div className="debug-footer-bar-values">
          <span className="debug-footer-state-badge">{stateValue}</span>
          <span className="debug-footer-bar-stat">bindings: {bindingCount}</span>
          <span className="debug-footer-bar-stat">inputs: {activeInputCount}</span>
          <span className="debug-footer-bar-stat">tab: {activeTab}</span>
        </div>
        <div className="debug-footer-bar-actions">
          <button
            className="debug-footer-btn"
            data-testid="debug-footer-toggle"
            onClick={onToggle}
            title={isOpen ? 'Collapse debug' : 'Expand debug'}
          >
            {isOpen ? '\u25BC' : '\u25B2'}
          </button>
          {isOpen && (
            <button
              className={`debug-footer-btn${mode === 'pinned' ? ' debug-footer-btn--active' : ''}`}
              data-testid="debug-footer-pin"
              onClick={onPin}
              title={mode === 'pinned' ? 'Unpin debug panel' : 'Pin debug panel'}
            >
              {'\u{1F4CC}'}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="debug-footer-body"
            data-testid="debug-footer-body"
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="debug-footer-body-inner">
              <DebugPanel
                machineDocData={machineDocData}
                stateValue={stateValue}
                context={context}
                eventLogEntries={eventLogEntries}
                onClearEventLog={onClearEventLog}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
