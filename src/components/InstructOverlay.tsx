import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'

interface InstructOverlayProps {
  mode: 'closed' | 'overlay' | 'pinned'
  onClose: () => void
  onPin: () => void
  width: number
  onResizeStart: (e: React.MouseEvent) => void
  zIndex: number
  onFocus: () => void
  children: React.ReactNode
}

/**
 * Right-side panel for instructions/recipe content.
 *
 * - open/close: slides in/out (animated via AnimatePresence)
 * - overlay ↔ pinned: instant snap (no animation)
 * - click-outside (overlay mode): closes panel
 * - click-to-focus: brings panel to front via z-index
 *
 * Handles AnimatePresence internally so routes render a single instance.
 */
export function InstructOverlay({
  mode,
  onClose,
  onPin,
  width,
  onResizeStart,
  zIndex,
  onFocus,
  children,
}: InstructOverlayProps) {
  const isOpen = mode !== 'closed'

  // Pin toggle (overlay↔pinned) should snap instantly, not slide
  const prevModeRef = useRef(mode)
  const isPinToggle =
    (prevModeRef.current === 'overlay' && mode === 'pinned') ||
    (prevModeRef.current === 'pinned' && mode === 'overlay')
  useEffect(() => { prevModeRef.current = mode }, [mode])

  // Click-outside to close (overlay mode only)
  useEffect(() => {
    if (mode !== 'overlay') return
    const handler = (e: MouseEvent) => {
      const target = e.target as Element
      // Don't close if click is inside this panel, its toggle, or the other panel
      if (target.closest('[data-testid="instruct-overlay"]')) return
      if (target.closest('[data-testid="toggle-instruct"]')) return
      if (target.closest('[data-testid="debug-footer"]')) return
      if (target.closest('[data-testid="test-wizard"]')) return
      if (target.closest('[data-testid="test-wizard-backdrop"]')) return
      onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [mode, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={`instruct-overlay instruct-overlay--${mode}`}
          data-testid="instruct-overlay"
          style={{ width, zIndex }}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: isPinToggle ? 0 : 0.2 }}
          onMouseDown={onFocus}
        >
          <div
            className="instruct-overlay-resize"
            data-testid="instruct-resize"
            onMouseDown={onResizeStart}
          />
          <div className="instruct-overlay-header">
            <button
              className={`instruct-overlay-btn${mode === 'pinned' ? ' instruct-overlay-btn--active' : ''}`}
              data-testid="instruct-pin"
              onClick={onPin}
              title={mode === 'pinned' ? 'Unpin panel' : 'Pin panel'}
            >
              {'\u29C9'}
            </button>
            <button
              className="instruct-overlay-btn"
              data-testid="instruct-close"
              onClick={onClose}
            >
              &times;
            </button>
          </div>
          <div className="instruct-overlay-body">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
