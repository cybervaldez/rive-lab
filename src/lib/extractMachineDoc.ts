export interface MachineDocData {
  id: string
  description: string
  riveViewModel: string
  riveStateMachine: string
  properties: { name: string; type: string; range?: number[]; description: string }[]
  states: { name: string; isInitial: boolean; description: string }[]
  transitions: { from: string; event: string; target: string; description: string }[]
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

  // States from config.states
  const states: MachineDocData['states'] = []
  const transitions: MachineDocData['transitions'] = []
  const initialState = config.initial ?? ''

  for (const [stateName, stateDef] of Object.entries(config.states ?? {}) as [string, any][]) {
    states.push({
      name: stateName,
      isInitial: stateName === initialState,
      description: stateDef.description ?? '',
    })

    // Transitions from state.on
    const on = stateDef.on ?? {}
    for (const [eventName, handler] of Object.entries(on) as [string, any][]) {
      const handlers = Array.isArray(handler) ? handler : [handler]
      for (const h of handlers) {
        const target = h.target ? String(h.target) : '(self)'
        transitions.push({
          from: stateName,
          event: eventName,
          target,
          description: h.description ?? '',
        })
      }
    }
  }

  return { id, description, riveViewModel, riveStateMachine, properties, states, transitions }
}
