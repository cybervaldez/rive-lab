import { progressBarMachine } from './progressBar'
import { toggleSwitchMachine } from './toggleSwitch'
import { counterMachine } from './counter'

const machineMap: Record<string, any> = {
  'progress-bar': progressBarMachine,
  'toggle-switch': toggleSwitchMachine,
  counter: counterMachine,
}

export function getMachine(key: string) {
  const machine = machineMap[key]
  if (!machine) throw new Error(`No machine defined for recipe key: ${key}`)
  return machine
}

export { progressBarMachine, toggleSwitchMachine, counterMachine }
