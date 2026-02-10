import { useCallback } from 'react'
import type { DemoProps } from './types'

export function ProgressBarDemo({
  setMachineState,
  progress,
  setProgress,
  setIsActive,
  animRef,
}: DemoProps) {
  const handleStart = useCallback(() => {
    if (animRef.current) return
    setIsActive(true)
    setMachineState('loading')

    const tick = () => {
      setProgress((prev) => {
        const next = prev + 1
        if (next >= 100) {
          setIsActive(false)
          setMachineState('complete')
          animRef.current = null
          return 100
        }
        animRef.current = setTimeout(tick, 60)
        return next
      })
    }
    tick()
  }, [animRef, setIsActive, setMachineState, setProgress])

  const handleReset = useCallback(() => {
    if (animRef.current) {
      clearTimeout(animRef.current)
      animRef.current = null
    }
    setProgress(0)
    setMachineState('idle')
    setIsActive(false)
  }, [animRef, setMachineState, setProgress, setIsActive])

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
