import { useCallback } from 'react'
import { formatKeyName, actionLabel } from '../lib/inputUtils'
import type { DemoProps } from './types'

export function StreamMapper({ state, context, send }: DemoProps) {
  const bindings = context.bindings as Record<string, string>
  const listeningAction = context.listeningAction as string | null
  const mapperOpen = context.mapperOpen as boolean

  const isListening = typeof state === 'string'
    ? false
    : (state as any)?.configuring === 'listening'

  const handleStartRebind = useCallback(
    (action: string) => send({ type: 'START_REBIND', action }),
    [send],
  )
  const handleCancelRebind = useCallback(() => send({ type: 'CANCEL_REBIND' }), [send])
  const handleOpenMapper = useCallback(() => send({ type: 'OPEN_MAPPER' }), [send])
  const handleCloseMapper = useCallback(() => send({ type: 'CLOSE_MAPPER' }), [send])

  return (
    <div className="stream-mapper" data-testid="stream-mapper">
      <div className="stream-mapper-header">
        <span className="stream-mapper-title">KEY BINDINGS</span>
        {!mapperOpen ? (
          <button
            className="demo-btn demo-btn-primary"
            data-testid="stream-mapper-edit"
            onClick={handleOpenMapper}
          >
            edit
          </button>
        ) : (
          <button
            className="demo-btn"
            data-testid="stream-mapper-done"
            onClick={handleCloseMapper}
          >
            done
          </button>
        )}
      </div>
      <div className="stream-mapper-body" data-testid="stream-mapper-body">
        {Object.entries(bindings).map(([action, code]) => {
          const isThisListening = isListening && listeningAction === action
          return (
            <div
              key={action}
              className={`stream-mapper-row${isThisListening ? ' stream-mapper-row--listening' : ''}`}
              data-testid={`stream-mapper-row-${action}`}
            >
              <span className="stream-mapper-row-name">{actionLabel(action)}</span>
              <span className="stream-mapper-row-key">
                {isThisListening ? 'Press a key...' : formatKeyName(code)}
              </span>
              {mapperOpen && (
                <>
                  {isThisListening ? (
                    <button
                      className="demo-btn"
                      data-testid={`stream-mapper-cancel-${action}`}
                      onClick={handleCancelRebind}
                    >
                      cancel
                    </button>
                  ) : (
                    <button
                      className="demo-btn"
                      data-testid={`stream-mapper-rebind-${action}`}
                      onClick={() => handleStartRebind(action)}
                      disabled={isListening}
                    >
                      rebind
                    </button>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
