import { motion } from 'motion/react'
import { formatKeyName, actionLabel } from '../lib/inputUtils'

interface StreamLiveViewProps {
  activeInputs: string[]
  bindings: Record<string, string>
}

export function StreamLiveView({ activeInputs, bindings }: StreamLiveViewProps) {
  return (
    <div className="stream-live-view" data-testid="stream-live-view">
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
            data-testid={`stream-action-${action}`}
          >
            <span className="demo-input-action-dot" />
            <span className="demo-input-action-name">{actionLabel(action)}</span>
            <span className="demo-input-action-key">[{formatKeyName(code)}]</span>
          </motion.div>
        )
      })}
    </div>
  )
}
