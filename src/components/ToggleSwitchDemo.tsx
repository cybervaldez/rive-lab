import { useCallback } from 'react'
import type { DemoProps } from './types'

export function ToggleSwitchDemo({
  machineState,
  setMachineState,
  setIsActive,
}: DemoProps) {
  const isOn = machineState === 'on'

  const handleToggle = useCallback(() => {
    if (isOn) {
      setMachineState('off')
      setIsActive(false)
    } else {
      setMachineState('on')
      setIsActive(true)
    }
  }, [isOn, setMachineState, setIsActive])

  return (
    <div className="demo-toggle" data-testid="demo-toggle">
      <div
        className={`demo-toggle-track${isOn ? ' demo-toggle-track--on' : ''}`}
        data-testid="toggle-track"
        onClick={handleToggle}
      >
        <div className="demo-toggle-thumb" />
      </div>
      <div className="demo-toggle-label" data-testid="toggle-label">
        {isOn ? 'ON' : 'OFF'}
      </div>
      <div className="demo-controls" data-testid="demo-controls">
        <button
          className="demo-btn demo-btn-primary"
          data-testid="btn-toggle"
          onClick={handleToggle}
        >
          toggle
        </button>
      </div>
    </div>
  )
}
