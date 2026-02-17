export const DEFAULT_BINDINGS: Record<string, string> = {
  INPUT_JUMP: 'Space',
  INPUT_ATTACK: 'KeyX',
  INPUT_DEFEND: 'KeyZ',
  INPUT_DASH: 'ShiftLeft',
}

export function formatKeyName(code: string): string {
  if (!code) return '—'
  return code
    .replace('Key', '')
    .replace('Digit', '')
    .replace('ShiftLeft', 'L-Shift')
    .replace('ShiftRight', 'R-Shift')
    .replace('ControlLeft', 'L-Ctrl')
    .replace('ControlRight', 'R-Ctrl')
    .replace('AltLeft', 'L-Alt')
    .replace('AltRight', 'R-Alt')
    .replace('ArrowUp', 'Up')
    .replace('ArrowDown', 'Down')
    .replace('ArrowLeft', 'Left')
    .replace('ArrowRight', 'Right')
}

export function actionLabel(action: string): string {
  return action.replace(/^INPUT_/, '')
}
