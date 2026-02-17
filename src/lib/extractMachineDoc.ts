export interface MachineDocData {
  id: string
  description: string
  riveViewModel: string
  riveStateMachine: string
  properties: { name: string; type: string; range?: number[]; description: string }[]
  states: { name: string; isInitial: boolean; description: string; depth: number }[]
  transitions: { from: string; event: string; target: string; description: string }[]
}

/**
 * Reads machine documentation from the meta block.
 * All state nodes, transitions, and properties are declared explicitly
 * in each machine's meta — no config parsing needed.
 */
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

  // States and transitions directly from meta
  const states: MachineDocData['states'] = (meta.stateNodes ?? []).map((s: any) => ({
    name: s.name,
    isInitial: s.initial ?? false,
    description: s.description ?? '',
    depth: s.depth ?? 0,
  }))

  const transitions: MachineDocData['transitions'] = (meta.transitions ?? []).map((t: any) => ({
    from: t.from,
    event: t.event,
    target: t.target,
    description: t.description ?? '',
  }))

  return { id, description, riveViewModel, riveStateMachine, properties, states, transitions }
}
