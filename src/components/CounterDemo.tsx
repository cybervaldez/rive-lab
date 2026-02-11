import { useCallback } from 'react'
import type { DemoProps } from './types'

export function CounterDemo({ state, context, send }: DemoProps) {
  const count = context.count as number

  const handleIncrement = useCallback(() => {
    if (state === 'maxed') return
    send({ type: 'increment' })
  }, [state, send])

  const handleReset = useCallback(() => {
    send({ type: 'reset' })
  }, [send])

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
