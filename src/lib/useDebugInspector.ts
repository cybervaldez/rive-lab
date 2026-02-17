import { useCallback, useState } from 'react'
import { useResizable } from './useResizable'
import { useResizableHeight } from './useResizableHeight'
import { useEventLog } from './useEventLog'

/**
 * Consolidates all debug/instruct panel state management.
 * Used by every route that renders DebugFooter + InstructOverlay.
 */
export function useDebugInspector() {
  const [instructMode, setInstructMode] = useState<'closed' | 'overlay' | 'pinned'>('closed')
  const [debugOpen, setDebugOpen] = useState(false)
  const [debugPinned, setDebugPinned] = useState(true)
  const [lastFocused, setLastFocused] = useState<'instruct' | 'debug'>('instruct')

  const debugMode: 'collapsed' | 'expanded' | 'pinned' = !debugOpen ? 'collapsed' : debugPinned ? 'pinned' : 'expanded'

  const { width: instructWidth, handleMouseDown: instructResizeStart } = useResizable('instruct-panel-width')
  const { height: debugHeight, isResizing: debugResizing, handleMouseDown: debugResizeStart } = useResizableHeight('debug-panel-height')
  const eventLog = useEventLog()

  // Z-index: last-focused panel gets z-30, other gets z-20
  const instructZIndex = lastFocused === 'instruct' ? 30 : 20
  const debugZIndex = lastFocused === 'debug' ? 30 : 20

  const focusInstruct = useCallback(() => setLastFocused('instruct'), [])
  const focusDebug = useCallback(() => setLastFocused('debug'), [])

  const toggleInstruct = useCallback(() => {
    setInstructMode((prev) => (prev === 'closed' ? 'overlay' : 'closed'))
    setLastFocused('instruct')
  }, [])

  const toggleDebug = useCallback(() => {
    setDebugOpen((prev) => !prev)
    setLastFocused('debug')
  }, [])

  const togglePin = useCallback(() => {
    setInstructMode((prev) => (prev === 'pinned' ? 'overlay' : 'pinned'))
    setLastFocused('instruct')
  }, [])

  const toggleDebugPin = useCallback(() => {
    setDebugPinned((prev) => !prev)
    setLastFocused('debug')
  }, [])

  const resetPanels = useCallback(() => {
    setInstructMode('closed')
    setDebugOpen(false)
  }, [])

  return {
    instructMode,
    toggleInstruct,
    togglePin,
    instructWidth,
    instructResizeStart,
    instructZIndex,
    focusInstruct,
    debugMode,
    toggleDebug,
    toggleDebugPin,
    debugZIndex,
    focusDebug,
    debugHeight,
    debugResizing,
    debugResizeStart,
    eventLog,
    resetPanels,
  }
}
