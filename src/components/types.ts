export interface DemoProps {
  state: string
  context: Record<string, any>
  send: (event: any) => void
}
