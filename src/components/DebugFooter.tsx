import { useEffect, useRef } from 'react'
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
  zIndex: number
  onFocus: () => void
  height: number
  onResizeStart: (e: React.MouseEvent) => void
  isResizing: boolean
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
  zIndex,
  onFocus,
  height,
  onResizeStart,
  isResizing,
}: DebugFooterProps) {
  const bindingCount = context.bindings ? Object.keys(context.bindings).length : 0
  const activeInputCount = context.activeInputs ? Object.keys(context.activeInputs).filter((k: string) => context.activeInputs[k]).length : 0
  const activeTab = context.activeTab ?? ''
  const isOpen = mode === 'expanded' || mode === 'pinned'

  // Pin toggle (expanded↔pinned) should snap instantly, not animate
  const prevModeRef = useRef(mode)
  const isPinToggle =
    (prevModeRef.current === 'expanded' && mode === 'pinned') ||
    (prevModeRef.current === 'pinned' && mode === 'expanded')
  useEffect(() => { prevModeRef.current = mode }, [mode])

  // Click-outside to collapse (expanded/unpinned mode only)
  useEffect(() => {
    if (mode !== 'expanded') return
    const handler = (e: MouseEvent) => {
      const target = e.target as Element
      if (target.closest('[data-testid="debug-footer"]')) return
      if (target.closest('[data-testid="toggle-debug"]')) return
      if (target.closest('[data-testid="instruct-overlay"]')) return
      if (target.closest('[data-testid="test-wizard"]')) return
      if (target.closest('[data-testid="test-wizard-backdrop"]')) return
      onToggle()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [mode, onToggle])

  return (
    <div
      className={`debug-footer debug-footer--${mode}${isResizing ? ' debug-footer--resizing' : ''}`}
      data-testid="debug-footer"
      style={{ zIndex }}
      onMouseDown={onFocus}
    >
      {/* Resize handle at top edge of footer — only when body is open */}
      {isOpen && (
        <div
          className="debug-footer-resize"
          data-testid="debug-footer-resize"
          onMouseDown={onResizeStart}
        />
      )}

      <div
        className="debug-footer-bar"
        data-testid="debug-footer-bar"
        onClick={isResizing ? undefined : onToggle}
      >
        <div className="debug-footer-bar-values">
          <span className="debug-footer-label" data-testid="debug-footer-toggle">
            debug {isOpen ? '\u25BC' : '\u25B2'}
          </span>
          {bindingCount > 0 && (
            <span className="debug-footer-bar-stat">bindings: {bindingCount}</span>
          )}
          {activeInputCount > 0 && (
            <span className="debug-footer-bar-stat">inputs: {activeInputCount}</span>
          )}
          {activeTab !== '' && (
            <span className="debug-footer-bar-stat">tab: {activeTab}</span>
          )}
        </div>
        <div className="debug-footer-bar-actions">
          {isOpen && (
            <button
              className={`debug-footer-btn${mode === 'pinned' ? ' debug-footer-btn--active' : ''}`}
              data-testid="debug-footer-pin"
              onClick={(e) => { e.stopPropagation(); onPin() }}
              title={mode === 'pinned' ? 'Unpin debug panel' : 'Pin debug panel'}
            >
              {'\u29C9'}
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
            animate={{ height }}
            exit={{ height: 0 }}
            transition={{ duration: (isPinToggle || isResizing) ? 0 : 0.2 }}
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
