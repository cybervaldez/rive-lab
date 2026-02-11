import { useEffect } from 'react'
import type { ActorRefFrom, AnyStateMachine } from 'xstate'

declare global {
  interface Window {
    __xstate__: Record<
      string,
      {
        state: () => any
        context: () => any
        send: (event: any) => void
      }
    >
  }
}

export function useXStateDebug(name: string, actorRef: ActorRefFrom<AnyStateMachine>) {
  useEffect(() => {
    if (!window.__xstate__) window.__xstate__ = {} as any
    window.__xstate__[name] = {
      state: () => actorRef.getSnapshot().value,
      context: () => actorRef.getSnapshot().context,
      send: actorRef.send.bind(actorRef),
    }
    return () => {
      delete window.__xstate__[name]
    }
  }, [name, actorRef])
}
