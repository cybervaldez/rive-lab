import type { InspectionEvent } from 'xstate'

export function createXStateInspector() {
  return (event: InspectionEvent) => {
    if (event.type === '@xstate.event') {
      const id = (event.actorRef as any).id
      const eventType = (event.event as any).type
      if (eventType?.startsWith('xstate.')) return
      console.log(`[XSTATE:${id}] \u2190 event: ${JSON.stringify(event.event)}`)
    }
    if (event.type === '@xstate.snapshot') {
      const id = (event.actorRef as any).id
      const snapshot = event.snapshot as any
      if (snapshot?.value !== undefined) {
        console.log(`[XSTATE:${id}] \u2192 state: ${JSON.stringify(snapshot.value)}`)
      }
    }
  }
}
