import { useCallback, useEffect, useRef } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'motion/react'
import type { DemoProps } from './types'

export function ProgressBarDemo({ state, context, send }: DemoProps) {
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const progress = context.progress as number
  const prevStateRef = useRef(state)

  // Animated progress value for smooth number morphing
  const motionProgress = useMotionValue(progress)
  const displayProgress = useTransform(motionProgress, (v) => Math.round(v))

  // Sync motionProgress with actual progress
  useEffect(() => {
    animate(motionProgress, progress, {
      type: 'spring',
      stiffness: 200,
      damping: 25,
    })
  }, [progress, motionProgress])

  // Track state changes for pulse animation
  const stateChanged = prevStateRef.current !== state
  useEffect(() => {
    prevStateRef.current = state
  }, [state])

  // Auto-tick progress when in loading state
  useEffect(() => {
    if (state !== 'loading') return
    if (animRef.current) return

    const tick = () => {
      animRef.current = setTimeout(() => {
        send({ type: 'SET_PROGRESS', value: progress + 1 })
        animRef.current = null
      }, 60)
    }

    if (progress < 100) {
      tick()
    } else {
      send({ type: 'complete' })
    }

    return () => {
      if (animRef.current) {
        clearTimeout(animRef.current)
        animRef.current = null
      }
    }
  }, [state, progress, send])

  const handleStart = useCallback(() => {
    if (state === 'loading') return
    send({ type: 'start' })
  }, [state, send])

  const handleReset = useCallback(() => {
    if (animRef.current) {
      clearTimeout(animRef.current)
      animRef.current = null
    }
    send({ type: 'reset' })
  }, [send])

  return (
    <motion.div
      className="demo-progress"
      data-testid="demo-progress"
      animate={stateChanged ? { scale: [1, 1.01, 1] } : {}}
      transition={{ duration: 0.25 }}
    >
      <div className="demo-progress-track" data-testid="progress-track">
        <motion.div
          className="demo-progress-fill"
          data-testid="progress-fill"
          animate={{ width: `${progress}%` }}
          transition={{
            type: 'spring',
            stiffness: 120,
            damping: 14,
            mass: 0.8,
          }}
        />
      </div>
      <div className="demo-progress-number" data-testid="progress-number">
        <motion.span>{displayProgress}</motion.span>%
      </div>
      <div className="demo-controls" data-testid="demo-controls">
        <motion.button
          className="demo-btn demo-btn-primary"
          data-testid="btn-start"
          onClick={handleStart}
          whileTap={{ scale: 0.95 }}
        >
          start
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
    </motion.div>
  )
}
