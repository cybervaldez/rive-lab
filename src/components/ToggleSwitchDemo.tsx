import { useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { DemoProps } from './types'

export function ToggleSwitchDemo({ state, send }: DemoProps) {
  const isOn = state === 'on'

  const handleToggle = useCallback(() => {
    send({ type: 'toggle' })
  }, [send])

  return (
    <div className="demo-toggle" data-testid="demo-toggle">
      <motion.div
        className="demo-toggle-track"
        data-testid="toggle-track"
        onClick={handleToggle}
        animate={{
          backgroundColor: isOn ? 'var(--color-accent)' : 'var(--color-border)',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <motion.div
          className="demo-toggle-thumb"
          layout
          animate={{ x: isOn ? 22 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </motion.div>
      <div className="demo-toggle-label" data-testid="toggle-label">
        <AnimatePresence mode="wait">
          <motion.span
            key={isOn ? 'on' : 'off'}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.12 }}
          >
            {isOn ? 'ON' : 'OFF'}
          </motion.span>
        </AnimatePresence>
      </div>
      <div className="demo-controls" data-testid="demo-controls">
        <motion.button
          className="demo-btn demo-btn-primary"
          data-testid="btn-toggle"
          onClick={handleToggle}
          whileTap={{ scale: 0.95 }}
        >
          toggle
        </motion.button>
      </div>
    </div>
  )
}
