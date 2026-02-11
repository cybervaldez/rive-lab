import type { MachineDocData } from '../lib/extractMachineDoc'

interface MachineDocProps {
  data: MachineDocData
  stateValue: string
}

export function MachineDoc({ data, stateValue }: MachineDocProps) {
  // Group transitions by source state
  const transitionGroups: Record<string, MachineDocData['transitions']> = {}
  for (const t of data.transitions) {
    if (!transitionGroups[t.from]) transitionGroups[t.from] = []
    transitionGroups[t.from].push(t)
  }

  return (
    <div className="machine-doc" data-testid="machine-doc">
      <div className="machine-doc-window" data-testid="machine-doc-window">
        <div className="machine-doc-titlebar">
          <span className="machine-doc-dot" />
          <span className="machine-doc-dot" />
          <span className="machine-doc-dot" />
          <span className="machine-doc-title">machine.describe</span>
        </div>

        <div className="machine-doc-body" data-testid="machine-doc-body">
          {/* Prompt */}
          <div className="t-prompt" data-testid="terminal-prompt">
            <span>$ </span>
            <span className="t-cmd">machine.describe</span>(<span className="t-arg">{data.id}</span>)
          </div>

          {/* Meta */}
          <div className="t-section-header" data-testid="section-meta">&gt; Meta</div>
          <div className="t-line">
            <span className="t-indent" />
            <span className="t-key">description</span>
            <span className="t-value">{data.description}</span>
          </div>
          <div className="t-line" data-testid="meta-viewmodel">
            <span className="t-indent" />
            <span className="t-key">riveViewModel</span>
            <span className="t-value">{data.riveViewModel}</span>
          </div>
          <div className="t-line" data-testid="meta-statemachine">
            <span className="t-indent" />
            <span className="t-key">riveStateMachine</span>
            <span className="t-value">{data.riveStateMachine}</span>
          </div>

          <hr className="t-hr" />

          {/* Properties */}
          <div className="t-section-header" data-testid="section-properties">&gt; Properties</div>
          {data.properties.map((prop) => (
            <div className="t-prop-line" key={prop.name} data-testid={`prop-${prop.name}`}>
              <span className="t-indent" />
              <span className="t-prop-name">{prop.name}</span>
              <span className={`t-prop-type t-prop-type--${prop.type}`}>{prop.type}</span>
              <span className="t-prop-range">
                {prop.range ? `[${prop.range[0]},${prop.range[1]}]` : ''}
              </span>
              <span className="t-prop-desc">{prop.description}</span>
            </div>
          ))}

          <hr className="t-hr" />

          {/* States */}
          <div className="t-section-header" data-testid="section-states">&gt; States</div>
          {data.states.map((s) => {
            const isActive = s.name === stateValue
            return (
              <div className="t-state-line" key={s.name} data-testid={`state-${s.name}`}>
                <span className="t-indent" />
                <span className={`t-state-dot${isActive ? ' t-state-dot--active' : ''}`}>
                  &#9679;
                </span>
                <span className={`t-state-name${isActive ? ' t-state-name--active' : ''}`}>
                  {s.name}
                </span>
                <span className="t-state-label">{s.isInitial ? 'initial' : ''}</span>
                <span className="t-state-desc">{s.description}</span>
              </div>
            )
          })}

          <hr className="t-hr" />

          {/* Transitions */}
          <div className="t-section-header" data-testid="section-transitions">&gt; Transitions</div>
          {Object.entries(transitionGroups).map(([from, transitions]) => (
            <div key={from}>
              <div className="t-transition-group-label" data-testid={`transitions-${from}-label`}>
                <span className="t-indent" />from {from}:
              </div>
              {transitions.map((t, i) => (
                <div className="t-transition-line" key={i} data-testid={`transition-${from}-${t.event.toLowerCase()}`}>
                  <span className="t-indent" />
                  <span className="t-indent" />
                  <span className="t-trans-event">{t.event}</span>
                  <span className="t-trans-arrow">-&gt;</span>
                  <span className="t-trans-target">{t.target}</span>
                  <span className="t-trans-desc">{t.description}</span>
                </div>
              ))}
            </div>
          ))}

          {/* Trailing cursor */}
          <div className="t-cursor-line">
            <span className="t-cursor-prompt">$ </span>
            <span className="t-cursor" />
          </div>
        </div>
      </div>
    </div>
  )
}
