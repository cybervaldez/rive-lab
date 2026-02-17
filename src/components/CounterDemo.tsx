import { useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { DemoProps } from './types'

export function CounterDemo({ state, context, send }: DemoProps) {
  const count = context.count as number
  const prevCountRef = useRef(count)
  const direction = count >= prevCountRef.current ? 1 : -1

  useEffect(() => {
    prevCountRef.current = count
  }, [count])

  const handleIncrement = useCallback(() => {
    if (state === 'maxed') return
    send({ type: 'increment' })
  }, [state, send])

  const handleReset = useCallback(() => {
    send({ type: 'reset' })
  }, [send])

  const isMaxed = state === 'maxed'

  return (
    <div className="demo-counter" data-testid="demo-counter">
      <motion.div
        className="demo-counter-display"
        data-testid="counter-display"
        animate={isMaxed ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        <AnimatePresence mode="popLayout">
          <motion.span
            key={count}
            className="demo-counter-value"
            initial={{ opacity: 0, y: direction * 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: direction * -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {count}
          </motion.span>
        </AnimatePresence>
      </motion.div>
      <div className="demo-controls" data-testid="demo-controls">
        <motion.button
          className="demo-btn demo-btn-primary"
          data-testid="btn-increment"
          onClick={handleIncrement}
          whileTap={{ scale: 0.95 }}
        >
          increment
        </motion.button>
        <motion.button
          className="demo-btn"
          data-testid="btn-reset"
          onClick={handleReset}
          whileTap={{ scale: 0.95 }}
        >
          reset
        </motion.button>
      </div>
    </div>
  )
}
