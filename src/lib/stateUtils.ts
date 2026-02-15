/**
 * Resolve the active state paths from a stateValue string.
 * Handles flat ("active"), nested ({"configuring":"idle"}), and
 * parallel ({"playback":"playing","volume":"unmuted"}) state values.
 */
export function getActiveStatePaths(stateValue: string): Set<string> {
  const paths = new Set<string>()

  try {
    const parsed = JSON.parse(stateValue)
    if (typeof parsed === 'object' && parsed !== null) {
      function walk(obj: Record<string, unknown>, prefix: string) {
        for (const [key, value] of Object.entries(obj)) {
          const path = prefix ? `${prefix}.${key}` : key
          paths.add(path)
          if (typeof value === 'string') {
            paths.add(`${path}.${value}`)
          } else if (typeof value === 'object' && value !== null) {
            walk(value as Record<string, unknown>, path)
          }
        }
      }
      walk(parsed, '')
      return paths
    }
  } catch {
    // Not JSON — simple string state
  }

  paths.add(stateValue)
  return paths
}
