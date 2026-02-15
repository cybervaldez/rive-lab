import type { MachineDocData } from '../lib/extractMachineDoc'
import { getActiveStatePaths } from '../lib/stateUtils'

interface StateGraphProps {
  data: MachineDocData
  stateValue: string
}

export function StateGraph({ data, stateValue }: StateGraphProps) {
  const activePaths = getActiveStatePaths(stateValue)

  // Build transition lookup: which transitions are available from active states
  const availableEvents = new Set<string>()
  for (const t of data.transitions) {
    if (activePaths.has(t.from)) {
      availableEvents.add(`${t.from}:${t.event}`)
    }
  }

  // Group transitions by source state for rendering
  const transitionsByState: Record<string, MachineDocData['transitions']> = {}
  for (const t of data.transitions) {
    if (!transitionsByState[t.from]) transitionsByState[t.from] = []
    transitionsByState[t.from].push(t)
  }

  return (
    <div className="state-graph" data-testid="state-graph">
      <div className="t-section-header" data-testid="state-graph-header">&gt; State Graph</div>
      <div className="state-graph-current" data-testid="state-graph-current">
        current: {stateValue}
      </div>
      <div className="state-graph-tree" data-testid="state-graph-tree">
        {data.states.map((s) => {
          const isActive = activePaths.has(s.name)
          const stateTransitions = transitionsByState[s.name] ?? []

          return (
            <div key={s.name} className="state-graph-node" data-testid={`sg-node-${s.name}`}>
              <div
                className={`state-graph-state${isActive ? ' state-graph-state--active' : ''}`}
                style={{ paddingLeft: `${s.depth * 1.2}rem` }}
              >
                <span className={`sg-dot${isActive ? ' sg-dot--active' : ''}`}>
                  {isActive ? '\u25CF' : '\u25CB'}
                </span>
                <span className="sg-name">{s.name.split('.').pop()}</span>
                {s.isInitial && <span className="sg-label">initial</span>}
              </div>
              {stateTransitions.map((t, i) => {
                const isAvailable = availableEvents.has(`${s.name}:${t.event}`)
                return (
                  <div
                    key={i}
                    className={`state-graph-edge${isAvailable ? ' state-graph-edge--available' : ''}`}
                    style={{ paddingLeft: `${(s.depth * 1.2) + 1.2}rem` }}
                    data-testid={`sg-edge-${s.name}-${t.event.toLowerCase()}`}
                  >
                    <span className="sg-edge-event">{t.event}</span>
                    <span className="sg-edge-arrow">{'\u2192'}</span>
                    <span className="sg-edge-target">{t.target}</span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
