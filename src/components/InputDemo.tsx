import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { DemoProps } from './types'
import { formatKeyName, actionLabel } from '../lib/inputUtils'

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
            <motion.div
              key={action}
              className={`demo-input-action${isActive ? ' demo-input-action--active' : ''}`}
              animate={isActive
                ? { scale: 1.05, borderColor: 'var(--color-accent)', background: 'var(--color-accent-dim)' }
                : { scale: 1, borderColor: 'var(--color-border)', background: 'transparent' }
              }
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              data-testid={`input-action-${action}`}
            >
              <span className="demo-input-action-dot" />
              <span className="demo-input-action-name">{actionLabel(action)}</span>
              <span className="demo-input-action-key">[{formatKeyName(code)}]</span>
            </motion.div>
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
      <AnimatePresence>
        {mapperOpen && (
          <motion.div
            key="mapper-backdrop"
            className="demo-input-mapper-backdrop"
            data-testid="mapper-backdrop"
            onClick={handleCloseMapper}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
        {mapperOpen && (
          <motion.div
            key="mapper-overlay"
            className="demo-input-mapper"
            data-testid="mapper-overlay"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
          >
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
                    <motion.span
                      className="demo-input-mapper-row-key"
                      animate={isThisListening
                        ? { opacity: [1, 0.4, 1] }
                        : { opacity: 1 }
                      }
                      transition={isThisListening
                        ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
                        : { duration: 0 }
                      }
                    >
                      {isThisListening ? 'Press a key...' : formatKeyName(code)}
                    </motion.span>
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
