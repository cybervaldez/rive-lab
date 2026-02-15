import { progressBarMachine } from './progressBar'
import { toggleSwitchMachine } from './toggleSwitch'
import { counterMachine } from './counter'
import { inputDemoMachine } from './inputDemo'
import { testBenchMachine } from './testBench'

const machineMap: Record<string, any> = {
  'progress-bar': progressBarMachine,
  'toggle-switch': toggleSwitchMachine,
  counter: counterMachine,
  'input-demo': inputDemoMachine,
  'test-bench': testBenchMachine,
}

export function getMachine(key: string) {
  const machine = machineMap[key]
  if (!machine) throw new Error(`No machine defined for recipe key: ${key}`)
  return machine
}

export { progressBarMachine, toggleSwitchMachine, counterMachine, inputDemoMachine, testBenchMachine }
