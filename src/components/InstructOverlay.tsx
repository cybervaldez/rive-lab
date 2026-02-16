import { motion } from 'motion/react'

interface InstructOverlayProps {
  mode: 'overlay' | 'pinned'
  onClose: () => void
  onPin: () => void
  width: number
  onResizeStart: (e: React.MouseEvent) => void
  children: React.ReactNode
}

export function InstructOverlay({
  mode,
  onClose,
  onPin,
  width,
  onResizeStart,
  children,
}: InstructOverlayProps) {
  return (
    <motion.div
      className={`instruct-overlay instruct-overlay--${mode}`}
      data-testid="instruct-overlay"
      style={{ width }}
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ duration: 0.2 }}
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
          {'\u{1F4CC}'}
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
  )
}
