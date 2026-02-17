import type { MachineDocData } from './extractMachineDoc'

/**
 * Generates a designer-ready Rive wiring prompt from machine documentation.
 * Output is a structured text block that tells a Rive designer exactly what
 * data bindings, states, and transitions to wire up.
 */
export function generateRivePrompt(data: MachineDocData): string {
  const lines: string[] = []

  lines.push(`# Rive Wiring Prompt — ${data.id}`)
  lines.push('')
  lines.push(data.description)
  lines.push('')

  // View model + state machine
  lines.push(`## Rive Setup`)
  lines.push(`- View Model: \`${data.riveViewModel || '(not set)'}\``)
  lines.push(`- State Machine: \`${data.riveStateMachine || '(not set)'}\``)
  lines.push('')

  // Direction key
  const hasDirections = data.properties.some((p) => p.direction)
  if (hasDirections) {
    lines.push(`## Direction Key`)
    lines.push(`- **source-to-target**: JavaScript sets this value → Rive reads it (bind as input)`)
    lines.push(`- **target-to-source**: Rive sets this value → JavaScript reads it (bind as output)`)
    lines.push('')
  }

  // Data bindings (properties)
  if (data.properties.length > 0) {
    lines.push(`## Data Bindings`)
    lines.push(`Create these properties in the Rive View Model:`)
    lines.push('')
    for (const prop of data.properties) {
      const range = prop.range ? ` [${prop.range[0]}–${prop.range[1]}]` : ''
      const dir = prop.direction ? ` [${prop.direction}]` : ''
      lines.push(`- \`${prop.name}\` (${prop.type}${range})${dir} — ${prop.description}`)
    }
    lines.push('')
  }

  // States
  if (data.states.length > 0) {
    lines.push(`## States`)
    lines.push(`The state machine has these states (indent = nesting depth):`)
    lines.push('')
    for (const s of data.states) {
      const indent = '  '.repeat(s.depth)
      const initial = s.isInitial ? ' ← initial' : ''
      const desc = s.description ? ` — ${s.description}` : ''
      lines.push(`${indent}- \`${s.name}\`${initial}${desc}`)
    }
    lines.push('')
  }

  // Transitions
  if (data.transitions.length > 0) {
    lines.push(`## Transitions`)
    lines.push(`Wire these transitions between states:`)
    lines.push('')
    for (const t of data.transitions) {
      const desc = t.description ? ` — ${t.description}` : ''
      lines.push(`- \`${t.from}\` → \`${t.target}\` on \`${t.event}\`${desc}`)
    }
    lines.push('')
  }

  // Constraints
  lines.push(`## Constraints`)
  lines.push(`- Property names MUST match exactly (case-sensitive) — do NOT rename`)
  lines.push(`- Do NOT add states not listed above — XState owns the state graph`)
  lines.push(`- Do NOT handle logic in Rive that transitions describe — XState owns state flow`)
  lines.push(`- Trigger names match event types exactly (no renaming)`)
  lines.push(`- Every state must support a \`reset\` trigger back to the initial state`)
  lines.push('')

  // Integration
  lines.push(`## Integration`)
  lines.push(`Rive owns points 1 (sender) and 4 (receiver) of the round-trip logging handshake.`)
  lines.push(`See \`techs/rive/README.md\` for the full 4-point protocol.`)
  lines.push('')

  // Summary
  lines.push(`## Summary`)
  lines.push(`- ${data.properties.length} data binding(s)`)
  lines.push(`- ${data.states.length} state(s)`)
  lines.push(`- ${data.transitions.length} transition(s)`)

  return lines.join('\n')
}
