import { useEffect, useCallback } from 'react'
import type { DemoProps } from './types'

function formatKeyName(code: string): string {
  if (!code) return '—'
  return code
    .replace('Key', '')
    .replace('Digit', '')
    .replace('ShiftLeft', 'L-Shift')
    .replace('ShiftRight', 'R-Shift')
    .replace('ControlLeft', 'L-Ctrl')
    .replace('ControlRight', 'R-Ctrl')
    .replace('AltLeft', 'L-Alt')
    .replace('AltRight', 'R-Alt')
    .replace('ArrowUp', 'Up')
    .replace('ArrowDown', 'Down')
    .replace('ArrowLeft', 'Left')
    .replace('ArrowRight', 'Right')
}

function actionLabel(action: string): string {
  return action.replace(/^INPUT_/, '')
}

export function InputDemo({ state, context, send }: DemoProps) {
  const bindings = context.bindings as Record<string, string>
  const activeInputs = context.activeInputs as string[]
  const mapperOpen = context.mapperOpen as boolean
  const listeningAction = context.listeningAction as string | null
  const boundCodes = new Set(Object.values(bindings))

  // Keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (boundCodes.has(e.code)) e.preventDefault()
      send({ type: 'KEY_DOWN', code: e.code })
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (boundCodes.has(e.code)) e.preventDefault()
      send({ type: 'KEY_UP', code: e.code })
    }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [send, boundCodes])

  const handleOpenMapper = useCallback(() => send({ type: 'OPEN_MAPPER' }), [send])
  const handleCloseMapper = useCallback(() => send({ type: 'CLOSE_MAPPER' }), [send])
  const handleStartRebind = useCallback((action: string) => send({ type: 'START_REBIND', action }), [send])
  const handleCancelRebind = useCallback(() => send({ type: 'CANCEL_REBIND' }), [send])
  const handleReset = useCallback(() => send({ type: 'reset' }), [send])

  const isListening = typeof state === 'string'
    ? false
    : (state as any)?.configuring === 'listening'

  return (
    <div className="demo-input" data-testid="demo-input">
      {/* Input Receiver */}
      <div className="demo-input-receiver" data-testid="input-receiver">
        {Object.entries(bindings).map(([action, code]) => {
          const isActive = activeInputs.includes(action)
          return (
            <div
              key={action}
              className={`demo-input-action${isActive ? ' demo-input-action--active' : ''}`}
              data-testid={`input-action-${action}`}
            >
              <span className="demo-input-action-dot" />
              <span className="demo-input-action-name">{actionLabel(action)}</span>
              <span className="demo-input-action-key">[{formatKeyName(code)}]</span>
            </div>
          )
        })}
      </div>

      {/* Controls */}
      <div className="demo-controls" data-testid="demo-controls">
        <button
          className="demo-btn demo-btn-primary"
          data-testid="btn-open-mapper"
          onClick={handleOpenMapper}
        >
          configure keys
        </button>
        <button className="demo-btn" data-testid="btn-reset" onClick={handleReset}>
          reset
        </button>
      </div>

      {/* Mapper Overlay */}
      {mapperOpen && (
        <>
          <div
            className="demo-input-mapper-backdrop"
            data-testid="mapper-backdrop"
            onClick={handleCloseMapper}
          />
          <div className="demo-input-mapper" data-testid="mapper-overlay">
            <div className="demo-input-mapper-header">
              <span className="demo-input-mapper-title">KEY BINDINGS</span>
              <button
                className="demo-input-mapper-close"
                data-testid="mapper-close"
                onClick={handleCloseMapper}
              >
                &times;
              </button>
            </div>
            <div className="demo-input-mapper-body">
              {Object.entries(bindings).map(([action, code]) => {
                const isThisListening = isListening && listeningAction === action
                return (
                  <div
                    key={action}
                    className={`demo-input-mapper-row${isThisListening ? ' demo-input-mapper-row--listening' : ''}`}
                    data-testid={`mapper-row-${action}`}
                  >
                    <span className="demo-input-mapper-row-name">{actionLabel(action)}</span>
                    <span className="demo-input-mapper-row-key">
                      {isThisListening ? 'Press a key...' : formatKeyName(code)}
                    </span>
                    {isThisListening ? (
                      <button
                        className="demo-btn"
                        data-testid={`mapper-cancel-${action}`}
                        onClick={handleCancelRebind}
                      >
                        cancel
                      </button>
                    ) : (
                      <button
                        className="demo-btn"
                        data-testid={`mapper-rebind-${action}`}
                        onClick={() => handleStartRebind(action)}
                        disabled={isListening}
                      >
                        rebind
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
