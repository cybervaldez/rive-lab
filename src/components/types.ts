export interface DemoProps {
  machineState: string
  setMachineState: (s: string) => void
  progress: number
  setProgress: (v: number | ((prev: number) => number)) => void
  isActive: boolean
  setIsActive: (v: boolean) => void
  animRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
}
