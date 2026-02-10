import { useCallback } from 'react'
import type { DemoProps } from './types'

const MAX_COUNT = 10

export function CounterDemo({
  machineState,
  setMachineState,
  progress,
  setProgress,
  setIsActive,
  animRef,
}: DemoProps) {
  const count = progress

  const handleIncrement = useCallback(() => {
    if (machineState === 'maxed') return
    if (animRef.current) {
      clearTimeout(animRef.current)
      animRef.current = null
    }

    setProgress((prev) => {
      const next = prev + 1
      if (next >= MAX_COUNT) {
        setMachineState('maxed')
        setIsActive(false)
        return MAX_COUNT
      }
      setMachineState('counting')
      setIsActive(true)
      return next
    })
  }, [machineState, animRef, setProgress, setMachineState, setIsActive])

  const handleReset = useCallback(() => {
    if (animRef.current) {
      clearTimeout(animRef.current)
      animRef.current = null
    }
    setProgress(0)
    setMachineState('idle')
    setIsActive(false)
  }, [animRef, setProgress, setMachineState, setIsActive])

  return (
    <div className="demo-counter" data-testid="demo-counter">
      <div className="demo-counter-display" data-testid="counter-display">
        <span className="demo-counter-value">{count}</span>
      </div>
      <div className="demo-controls" data-testid="demo-controls">
        <button
          className="demo-btn demo-btn-primary"
          data-testid="btn-increment"
          onClick={handleIncrement}
        >
          increment
        </button>
        <button className="demo-btn" data-testid="btn-reset" onClick={handleReset}>
          reset
        </button>
      </div>
    </div>
  )
}
