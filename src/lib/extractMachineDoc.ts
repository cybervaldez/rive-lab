export interface MachineDocData {
  id: string
  description: string
  riveViewModel: string
  riveStateMachine: string
  properties: { name: string; type: string; range?: number[]; description: string }[]
  states: { name: string; isInitial: boolean; description: string; depth: number }[]
  transitions: { from: string; event: string; target: string; description: string }[]
}

function extractStatesAndTransitions(
  statesDef: Record<string, any>,
  initialState: string,
  prefix: string,
  depth: number,
  isParentParallel: boolean,
): { states: MachineDocData['states']; transitions: MachineDocData['transitions'] } {
  const states: MachineDocData['states'] = []
  const transitions: MachineDocData['transitions'] = []

  for (const [stateName, stateDef] of Object.entries(statesDef) as [string, any][]) {
    const fullName = prefix ? `${prefix}.${stateName}` : stateName

    states.push({
      name: fullName,
      isInitial: isParentParallel || stateName === initialState,
      description: stateDef.description ?? '',
      depth,
    })

    // Transitions from state.on
    const on = stateDef.on ?? {}
    for (const [eventName, handler] of Object.entries(on) as [string, any][]) {
      const handlers = Array.isArray(handler) ? handler : [handler]
      for (const h of handlers) {
        if (typeof h === 'string') {
          transitions.push({ from: fullName, event: eventName, target: h, description: '' })
          continue
        }
        const target = h.target ? String(h.target) : '(self)'
        transitions.push({
          from: fullName,
          event: eventName,
          target,
          description: h.description ?? '',
        })
      }
    }

    // Recurse into nested states
    if (stateDef.states) {
      const isParallel = stateDef.type === 'parallel'
      const childInitial = isParallel ? '' : (stateDef.initial ?? '')
      const { states: childStates, transitions: childTransitions } =
        extractStatesAndTransitions(stateDef.states, childInitial, fullName, depth + 1, isParallel)
      states.push(...childStates)
      transitions.push(...childTransitions)
    }
  }

  return { states, transitions }
}

export function extractMachineDoc(machine: any): MachineDocData {
  const config = machine.config
  const meta = config.meta ?? {}

  const id = config.id ?? 'unknown'
  const description = meta.description ?? ''
  const riveViewModel = meta.riveViewModel ?? ''
  const riveStateMachine = meta.riveStateMachine ?? ''

  // Properties from meta.contextProperties
  const properties: MachineDocData['properties'] = []
  const contextProps = meta.contextProperties ?? {}
  for (const [name, def] of Object.entries(contextProps) as [string, any][]) {
    properties.push({
      name,
      type: def.type ?? 'unknown',
      range: def.range,
      description: def.description ?? '',
    })
  }

  // States and transitions (recursive)
  const isParallel = config.type === 'parallel'
  const initialState = isParallel ? '' : (config.initial ?? '')
  const { states, transitions } = extractStatesAndTransitions(
    config.states ?? {},
    initialState,
    '',
    0,
    isParallel,
  )

  // Root-level transitions (on handlers at machine root)
  const rootOn = config.on ?? {}
  for (const [eventName, handler] of Object.entries(rootOn) as [string, any][]) {
    const handlers = Array.isArray(handler) ? handler : [handler]
    for (const h of handlers) {
      if (typeof h === 'string') {
        transitions.push({ from: '(root)', event: eventName, target: h, description: '' })
        continue
      }
      const target = h.target ? String(h.target) : '(self)'
      transitions.push({
        from: '(root)',
        event: eventName,
        target,
        description: h.description ?? '',
      })
    }
  }

  return { id, description, riveViewModel, riveStateMachine, properties, states, transitions }
}
