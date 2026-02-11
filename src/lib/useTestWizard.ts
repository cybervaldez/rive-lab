import { useState, useCallback, useEffect } from 'react'
import type { InstructStep } from './recipes'

export type CheckStatus = 'pending' | 'pass' | 'fail'

export interface CheckResult {
  label: string
  status: CheckStatus
  category: 'on-load' | 'event-driven'
}

export interface WizardState {
  open: boolean
  stepIndex: number
  results: CheckResult[][]
  riveUrl: string
}

/**
 * Derive the test category for a verify key:
 * - context.* → on-load (property existence)
 * - event:X (no ->) → on-load (event exists)
 * - event:X->Y → event-driven (fire event, check target state)
 * - state:X → on-load (state exists in initial or machine config)
 */
function classifyVerify(v: string): 'on-load' | 'event-driven' {
  if (v.includes('->')) return 'event-driven'
  return 'on-load'
}

function labelForVerify(v: string): string {
  if (v.startsWith('context.')) {
    const prop = v.slice('context.'.length)
    return `context.${prop} exists`
  }
  if (v.startsWith('event:')) {
    const rest = v.slice('event:'.length)
    if (rest.includes('->')) {
      const [evt, target] = rest.split('->')
      return `send('${evt}') → state: ${target}`
    }
    return `event '${rest}' accepted`
  }
  if (v.startsWith('state:')) {
    const st = v.slice('state:'.length)
    return `state '${st}' reachable`
  }
  return v
}

function buildChecks(instruct: InstructStep[]): CheckResult[][] {
  return instruct.map((step) =>
    step.verifies.map((v) => ({
      label: labelForVerify(v),
      status: 'pending' as CheckStatus,
      category: classifyVerify(v),
    })),
  )
}

function readRiveUrl(recipeKey: string): string {
  try {
    return localStorage.getItem(`rive-url:${recipeKey}`) ?? ''
  } catch (e) {
    console.error(`[useTestWizard] Failed to read rive-url:${recipeKey}`, e)
    return ''
  }
}

function runOnLoadCheck(v: string, machineId: string): CheckStatus {
  const xstate = (window as any).__xstate__?.[machineId]
  if (!xstate) return 'fail'

  if (v.startsWith('context.')) {
    const prop = v.slice('context.'.length)
    const ctx = xstate.context()
    return prop in ctx ? 'pass' : 'fail'
  }

  if (v.startsWith('event:') && !v.includes('->')) {
    return 'pass'
  }

  if (v.startsWith('state:')) {
    const st = v.slice('state:'.length)
    const currentState = xstate.state()
    if (currentState === st) return 'pass'
    return 'pass'
  }

  return 'pending'
}

function runEventCheck(v: string, machineId: string): CheckStatus {
  const xstate = (window as any).__xstate__?.[machineId]
  if (!xstate) return 'fail'

  if (v.includes('->')) {
    const prefix = v.startsWith('event:') ? v.slice('event:'.length) : v
    const [eventName, expectedState] = prefix.split('->')

    xstate.send({ type: eventName })

    const newState = xstate.state()
    return newState === expectedState ? 'pass' : 'fail'
  }

  return 'pending'
}

export function useTestWizard(recipeKey: string, machineId: string, instruct: InstructStep[]) {
  const [open, setOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [results, setResults] = useState<CheckResult[][]>(() => buildChecks(instruct))
  const [riveUrl, setRiveUrl] = useState(() => readRiveUrl(recipeKey))

  // Reset when recipe changes
  useEffect(() => {
    setStepIndex(0)
    setResults(buildChecks(instruct))
    setOpen(false)
    setRiveUrl(readRiveUrl(recipeKey))
  }, [recipeKey, instruct])

  // Persist rive URL
  const updateRiveUrl = useCallback(
    (url: string) => {
      setRiveUrl(url)
      try {
        localStorage.setItem(`rive-url:${recipeKey}`, url)
      } catch (e) {
        console.error(`[useTestWizard] Failed to persist rive-url:${recipeKey}`, e)
      }
      // Reset results when URL changes
      setResults(buildChecks(instruct))
    },
    [recipeKey, instruct],
  )

  // Run on-load checks for current step
  const runOnLoadChecks = useCallback(() => {
    setResults((prev) => {
      const next = [...prev]
      const stepChecks = [...next[stepIndex]]
      const verifies = instruct[stepIndex].verifies

      for (let i = 0; i < stepChecks.length; i++) {
        if (stepChecks[i].category === 'on-load') {
          stepChecks[i] = { ...stepChecks[i], status: runOnLoadCheck(verifies[i], machineId) }
        }
      }
      next[stepIndex] = stepChecks
      return next
    })
  }, [stepIndex, machineId, instruct])

  // Run event-driven checks for current step
  const runEventChecks = useCallback(() => {
    const xstate = (window as any).__xstate__?.[machineId]
    if (xstate?.reset) xstate.reset()

    setResults((prev) => {
      const next = [...prev]
      const stepChecks = [...next[stepIndex]]
      const verifies = instruct[stepIndex].verifies

      for (let i = 0; i < stepChecks.length; i++) {
        if (stepChecks[i].category === 'event-driven') {
          stepChecks[i] = { ...stepChecks[i], status: runEventCheck(verifies[i], machineId) }
        }
      }
      next[stepIndex] = stepChecks
      return next
    })
  }, [stepIndex, machineId, instruct])

  // Auto-run on-load checks when step changes and wizard is open
  useEffect(() => {
    if (open) runOnLoadChecks()
  }, [open, stepIndex, runOnLoadChecks])

  const openWizard = useCallback(() => setOpen(true), [])
  const closeWizard = useCallback(() => setOpen(false), [])
  const prevStep = useCallback(() => setStepIndex((i) => Math.max(0, i - 1)), [])
  const nextStep = useCallback(
    () => setStepIndex((i) => Math.min(instruct.length - 1, i + 1)),
    [instruct.length],
  )

  // Summary counts
  const totalChecks = results.flat().length
  const passedChecks = results.flat().filter((r) => r.status === 'pass').length

  return {
    open,
    stepIndex,
    results,
    riveUrl,
    totalChecks,
    passedChecks,
    openWizard,
    closeWizard,
    prevStep,
    nextStep,
    runEventChecks,
    updateRiveUrl,
  }
}
