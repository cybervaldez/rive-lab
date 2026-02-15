import { useCallback, useState } from 'react'
import type { DemoProps } from './types'

export function TestBenchDemo({ state, context, send }: DemoProps) {
  const progress = context.progress as number
  const label = context.label as string
  const isActive = context.isActive as boolean
  const mode = context.mode as string
  const sliderValue = context.sliderValue as number
  const riveEventCount = context.riveEventCount as number

  const [labelInput, setLabelInput] = useState('')

  const handleActivate = useCallback(() => {
    if (state !== 'idle') return
    send({ type: 'activate' })
  }, [state, send])

  const handleComplete = useCallback(() => {
    if (state !== 'active') return
    send({ type: 'complete' })
  }, [state, send])

  const handleReset = useCallback(() => {
    send({ type: 'reset' })
    setLabelInput('')
  }, [send])

  const handleSetProgress = useCallback(
    (value: number) => {
      if (state !== 'active') return
      send({ type: 'SET_PROGRESS', value })
    },
    [state, send],
  )

  const handleSetLabel = useCallback(() => {
    if (state !== 'active') return
    send({ type: 'SET_LABEL', value: labelInput })
  }, [state, send, labelInput])

  const handleSimulateSlider = useCallback(
    (value: number) => {
      send({ type: 'SLIDER_CHANGED', value })
    },
    [send],
  )

  const handleSimulateRiveEvent = useCallback(() => {
    send({ type: 'RIVE_COMPLETE' })
  }, [send])

  return (
    <div className="demo-test-bench" data-testid="demo-test-bench">
      {/* State readout */}
      <div className="bench-readout" data-testid="bench-readout">
        <div className="bench-readout-row">
          <span className="bench-readout-key">state</span>
          <span className="bench-readout-val" data-testid="bench-state">{state}</span>
        </div>
        <div className="bench-readout-row">
          <span className="bench-readout-key">mode</span>
          <span className="bench-readout-val" data-testid="bench-mode">{mode}</span>
        </div>
        <div className="bench-readout-row">
          <span className="bench-readout-key">progress</span>
          <span className="bench-readout-val" data-testid="bench-progress">{progress}</span>
        </div>
        <div className="bench-readout-row">
          <span className="bench-readout-key">label</span>
          <span className="bench-readout-val" data-testid="bench-label">{label || '—'}</span>
        </div>
        <div className="bench-readout-row">
          <span className="bench-readout-key">isActive</span>
          <span className="bench-readout-val" data-testid="bench-active">{String(isActive)}</span>
        </div>
        <div className="bench-readout-row">
          <span className="bench-readout-key">sliderValue</span>
          <span className="bench-readout-val" data-testid="bench-slider">{sliderValue}</span>
        </div>
        <div className="bench-readout-row">
          <span className="bench-readout-key">riveEvents</span>
          <span className="bench-readout-val" data-testid="bench-events">{riveEventCount}</span>
        </div>
      </div>

      {/* Progress bar visualization */}
      <div className="bench-progress-track" data-testid="bench-progress-track">
        <div
          className="bench-progress-fill"
          data-testid="bench-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Trigger controls */}
      <div className="bench-section" data-testid="bench-triggers">
        <span className="bench-section-label">&gt; triggers</span>
        <div className="demo-controls">
          <button
            className="demo-btn demo-btn-primary"
            data-testid="btn-activate"
            onClick={handleActivate}
            disabled={state !== 'idle'}
          >
            activate
          </button>
          <button
            className="demo-btn demo-btn-primary"
            data-testid="btn-complete"
            onClick={handleComplete}
            disabled={state !== 'active'}
          >
            complete
          </button>
          <button
            className="demo-btn"
            data-testid="btn-reset"
            onClick={handleReset}
          >
            reset
          </button>
        </div>
      </div>

      {/* Source→Target: Number */}
      <div className="bench-section" data-testid="bench-number">
        <span className="bench-section-label">&gt; number (source→target)</span>
        <div className="demo-controls">
          <input
            type="range"
            className="bench-range"
            data-testid="range-progress"
            min="0"
            max="100"
            value={progress}
            onChange={(e) => handleSetProgress(Number(e.target.value))}
            disabled={state !== 'active'}
          />
          <span className="bench-range-value" data-testid="range-progress-val">{progress}</span>
        </div>
      </div>

      {/* Source→Target: String */}
      <div className="bench-section" data-testid="bench-string">
        <span className="bench-section-label">&gt; string (source→target)</span>
        <div className="demo-controls">
          <input
            type="text"
            className="bench-text-input"
            data-testid="input-label"
            placeholder="type a label..."
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            disabled={state !== 'active'}
          />
          <button
            className="demo-btn"
            data-testid="btn-set-label"
            onClick={handleSetLabel}
            disabled={state !== 'active'}
          >
            set
          </button>
        </div>
      </div>

      {/* Target→Source simulation */}
      <div className="bench-section" data-testid="bench-target-source">
        <span className="bench-section-label">&gt; target→source (simulated)</span>
        <div className="demo-controls">
          <input
            type="range"
            className="bench-range"
            data-testid="range-slider"
            min="0"
            max="100"
            value={sliderValue}
            onChange={(e) => handleSimulateSlider(Number(e.target.value))}
          />
          <span className="bench-range-value" data-testid="range-slider-val">{sliderValue}</span>
        </div>
      </div>

      {/* Rive Event simulation */}
      <div className="bench-section" data-testid="bench-rive-events">
        <span className="bench-section-label">&gt; rive events (simulated)</span>
        <div className="demo-controls">
          <button
            className="demo-btn"
            data-testid="btn-rive-event"
            onClick={handleSimulateRiveEvent}
          >
            fire RIVE_COMPLETE
          </button>
          <span className="bench-event-count" data-testid="rive-event-count">
            received: {riveEventCount}
          </span>
        </div>
      </div>
    </div>
  )
}
