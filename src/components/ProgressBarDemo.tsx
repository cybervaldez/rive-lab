import { useCallback, useEffect, useRef } from 'react'
import type { DemoProps } from './types'

export function ProgressBarDemo({ state, context, send }: DemoProps) {
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const progress = context.progress as number

  // Auto-tick progress when in loading state
  useEffect(() => {
    if (state !== 'loading') return
    if (animRef.current) return

    const tick = () => {
      animRef.current = setTimeout(() => {
        // Read current progress via the context the machine provides
        // We send SET_PROGRESS, machine updates context, component re-renders
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
    <div className="demo-progress" data-testid="demo-progress">
      <div className="demo-progress-track" data-testid="progress-track">
        <div
          className="demo-progress-fill"
          data-testid="progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="demo-controls" data-testid="demo-controls">
        <button
          className="demo-btn demo-btn-primary"
          data-testid="btn-start"
          onClick={handleStart}
        >
          start
        </button>
        <button className="demo-btn" data-testid="btn-reset" onClick={handleReset}>
          reset
        </button>
      </div>
    </div>
  )
}
