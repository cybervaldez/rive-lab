import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useMachine } from '@xstate/react'
import { setup } from 'xstate'
import { getApps } from '../../lib/recipes'
import { getMachine } from '../../machines'
import { useXStateDebug } from '../../lib/useXStateDebug'
import { useDebugInspector } from '../../lib/useDebugInspector'
import { useTheme } from '../../lib/useTheme'
import { useChecklist } from '../../lib/useChecklist'
import { useTestWizard, readRiveUrl } from '../../lib/useTestWizard'
import { extractMachineDoc } from '../../lib/extractMachineDoc'
import { RecipePanel } from '../../components/RecipePanel'
import { DebugFooter } from '../../components/DebugFooter'
import { InstructOverlay } from '../../components/InstructOverlay'
import { InputDemo } from '../../components/InputDemo'
import { RiveRenderer } from '../../components/RiveRenderer'
import type { DemoProps } from '../../components/types'

const apps = getApps()

// No-op machine for apps that don't have a real machine yet
const nullMachine = setup({
  types: {
    context: {} as Record<string, never>,
    events: {} as { type: 'reset' },
  },
}).createMachine({
  id: 'NullSM',
  initial: 'idle',
  context: {},
  states: { idle: {} },
})

function getAppMachine(appKey: string) {
  try {
    return getMachine(appKey)
  } catch {
    return nullMachine
  }
}

export const Route = createFileRoute('/apps/$appKey')({
  beforeLoad: ({ params }) => {
    if (!apps.some((r) => r.key === params.appKey)) {
      throw redirect({ to: '/apps' })
    }
  },
  component: AppDetailPage,
})

function AppDetailPage() {
  const { appKey } = Route.useParams()
  const [theme, toggleTheme] = useTheme()
  const [checkedSteps, toggleStep] = useChecklist(appKey)
  const inspector = useDebugInspector()
  const [renderer, setRenderer] = useState<'html' | 'rive'>('html')

  const app = apps.find((r) => r.key === appKey)!

  // XState machine
  const machine = getAppMachine(appKey)
  const isRealMachine = machine !== nullMachine
  const [snapshot, send, actorRef] = useMachine(machine, { inspect: inspector.eventLog.inspect })

  // Expose to window.__xstate__ when a real machine exists
  const machineId = machine.id
  useXStateDebug(machineId, actorRef)

  const stateValue = typeof snapshot.value === 'string'
    ? snapshot.value
    : JSON.stringify(snapshot.value)
  const ctx = snapshot.context as Record<string, any>

  // Machine doc data for panels
  const machineDocData = isRealMachine ? extractMachineDoc(machine) : null

  // Test wizard
  const wizard = useTestWizard(appKey, machineId, app.instruct)

  // Rive renderer
  const riveUrl = readRiveUrl(appKey)
  const riveMeta = machine.config?.meta as Record<string, any> | undefined
  const riveViewModel = (riveMeta?.riveViewModel as string) ?? ''
  const riveStateMachine = (riveMeta?.riveStateMachine as string) ?? ''

  // Close overlays on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        inspector.resetPanels()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [inspector.resetPanels])

  // Reset machine when switching renderers — Rive can't catch up to mid-flight state
  const switchRenderer = (next: 'html' | 'rive') => {
    if (next !== renderer) {
      send({ type: 'reset' })
      setRenderer(next)
    }
  }

  const demoProps: DemoProps = {
    state: snapshot.value as any,
    context: ctx,
    send,
  }

  const instructContent = machineDocData ? (
    <RecipePanel
      recipe={app}
      machineDocData={machineDocData}
      stateValue={stateValue}
      checkedSteps={checkedSteps}
      toggleStep={toggleStep}
      onOpenWizard={wizard.openWizard}
    />
  ) : (
    <div className="instruct-panel" data-testid="instruct-panel">
      <ol className="instruct-list" data-testid="instruct-list">
        {app.instruct.map((item, i) => (
          <li
            key={i}
            className={`instruct-step${checkedSteps.has(i) ? ' instruct-step--checked' : ''}`}
            data-testid={`instruct-step-${i}`}
            onClick={() => toggleStep(i)}
          >
            <span className="instruct-step-title">{item.step}</span>
            <span className="instruct-step-detail">{item.detail}</span>
          </li>
        ))}
      </ol>
      <p className="instruct-hint" data-testid="instruct-hint">
        Click on an item to mark it as complete
      </p>
      <button
        className="instruct-test-btn"
        data-testid="instruct-test-btn"
        onClick={wizard.openWizard}
      >
        test
      </button>
    </div>
  )

  return (
    <div className="app-theater" data-testid="app-theater">
      {/* Floating toggle buttons */}
      <div className="stream-float-btns">
        <button
          className={`stream-float-btn${inspector.instructMode !== 'closed' ? ' stream-float-btn--active' : ''}`}
          data-testid="toggle-instruct"
          onClick={inspector.toggleInstruct}
        >
          instructions
        </button>
      </div>

      {/* Top bar */}
      <header className="app-topbar" data-testid="app-topbar">
        <Link to="/apps" className="app-topbar-back" data-testid="app-back">
          &larr; apps
        </Link>
        <span className="app-topbar-name" data-testid="app-name">
          {app.name}
          <span className="app-topbar-state" data-testid="app-state">
            {isRealMachine ? stateValue : app.state}
          </span>
        </span>
        <div className="renderer-toggle" data-testid="renderer-toggle">
          <button
            className={`renderer-toggle-btn${renderer === 'html' ? ' renderer-toggle-btn--active' : ''}`}
            data-testid="renderer-html"
            onClick={() => switchRenderer('html')}
          >
            html
          </button>
          <button
            className={`renderer-toggle-btn${renderer === 'rive' ? ' renderer-toggle-btn--active' : ''}`}
            data-testid="renderer-rive"
            onClick={() => switchRenderer('rive')}
            disabled={!riveUrl}
            title={!riveUrl ? 'Add .riv URL via test wizard' : riveUrl}
          >
            rive{riveUrl ? ' \u2713' : ''}
          </button>
        </div>
        <button
          className="theme-toggle"
          data-testid="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          <span data-testid="theme-label" className="sr-only">
            {theme}
          </span>
          <span className="theme-toggle-icon" aria-hidden="true">
            {theme === 'dark' ? '\u263C' : '\u263E'}
          </span>
        </button>
      </header>

      {/* Stage + instruct row */}
      <div className="app-body">
        <main className="app-stage" data-testid="app-stage">
          {renderer === 'html' && (
            <>
              {isRealMachine && appKey === 'input-demo' ? (
                <InputDemo {...demoProps} />
              ) : (
                <div className="app-placeholder" data-testid="app-placeholder">
                  <span className="app-placeholder-icon">&#9654;</span>
                  <span className="app-placeholder-label">{app.name}</span>
                  <span className="app-placeholder-status">[{app.status}] — demo coming soon</span>
                </div>
              )}
            </>
          )}
          {renderer === 'rive' && riveUrl && (
            <RiveRenderer
              {...demoProps}
              riveUrl={riveUrl}
              riveViewModel={riveViewModel}
              riveStateMachine={riveStateMachine}
            />
          )}
        </main>

        {/* Instruct overlay — single instance handles overlay/pinned/closed */}
        <InstructOverlay
          mode={inspector.instructMode}
          onClose={inspector.toggleInstruct}
          onPin={inspector.togglePin}
          width={inspector.instructWidth}
          onResizeStart={inspector.instructResizeStart}
          zIndex={inspector.instructZIndex}
          onFocus={inspector.focusInstruct}
        >
          {instructContent}
        </InstructOverlay>
      </div>

      {/* Debug footer */}
      {isRealMachine && machineDocData && (
        <DebugFooter
          stateValue={stateValue}
          context={ctx}
          machineDocData={machineDocData}
          eventLogEntries={inspector.eventLog.entries}
          onClearEventLog={inspector.eventLog.clear}
          mode={inspector.debugMode}
          onToggle={inspector.toggleDebug}
          onPin={inspector.toggleDebugPin}
          zIndex={inspector.debugZIndex}
          onFocus={inspector.focusDebug}
          height={inspector.debugHeight}
          onResizeStart={inspector.debugResizeStart}
          isResizing={inspector.debugResizing}
        />
      )}

      {/* Test Wizard Modal */}
      {wizard.open && (
        <>
          <div className="test-wizard-backdrop" data-testid="test-wizard-backdrop" onClick={wizard.closeWizard} />
          <div className="test-wizard" data-testid="test-wizard">
            <div className="test-wizard-header">
              <span className="test-wizard-title">TEST WIZARD</span>
              <span className="test-wizard-step-counter">
                step {wizard.stepIndex + 1}/{app.instruct.length}
              </span>
              <button className="test-wizard-close" data-testid="test-wizard-close" onClick={wizard.closeWizard}>
                &times;
              </button>
            </div>
            <div className="test-wizard-body">
              <div className="test-wizard-step" data-testid="test-wizard-step">
                <span className="test-wizard-step-title">{app.instruct[wizard.stepIndex].step}</span>
                <span className="test-wizard-step-detail">{app.instruct[wizard.stepIndex].detail}</span>
              </div>
              {(() => {
                const checks = wizard.results[wizard.stepIndex]
                const onLoad = checks.filter((c) => c.category === 'on-load')
                const eventDriven = checks.filter((c) => c.category === 'event-driven')
                return (
                  <>
                    {onLoad.length > 0 && (
                      <div className="test-wizard-checks" data-testid="test-wizard-onload">
                        <span className="test-wizard-checks-label">ON-LOAD CHECKS</span>
                        {onLoad.map((c, i) => (
                          <div key={i} className={`test-wizard-check test-wizard-check--${c.status}`}>
                            <span className="test-wizard-check-icon">
                              {c.status === 'pass' ? '\u2713' : c.status === 'fail' ? '\u2717' : '\u25CB'}
                            </span>
                            {c.label}
                          </div>
                        ))}
                      </div>
                    )}
                    {eventDriven.length > 0 && (
                      <div className="test-wizard-checks" data-testid="test-wizard-events">
                        <span className="test-wizard-checks-label">EVENT-DRIVEN CHECKS</span>
                        {eventDriven.map((c, i) => (
                          <div key={i} className={`test-wizard-check test-wizard-check--${c.status}`}>
                            <span className="test-wizard-check-icon">
                              {c.status === 'pass' ? '\u2713' : c.status === 'fail' ? '\u2717' : '\u25CB'}
                            </span>
                            {c.label}
                          </div>
                        ))}
                        <button
                          className="instruct-test-btn"
                          data-testid="test-wizard-run-events"
                          onClick={wizard.runEventChecks}
                        >
                          run event tests
                        </button>
                      </div>
                    )}
                    {checks.length === 0 && (
                      <div className="test-wizard-checks">
                        <span className="test-wizard-checks-label">No verifications for this step</span>
                      </div>
                    )}
                  </>
                )
              })()}
              <div className="test-wizard-rive-section" data-testid="test-wizard-rive">
                <span className="test-wizard-rive-label">rive file url</span>
                <input
                  className="test-wizard-rive-input"
                  data-testid="test-wizard-rive-input"
                  type="text"
                  placeholder="https://example.com/file.riv"
                  value={wizard.riveUrl}
                  onChange={(e) => wizard.updateRiveUrl(e.target.value)}
                />
              </div>
            </div>
            <div className="test-wizard-footer">
              <div className="test-wizard-summary" data-testid="test-wizard-summary">
                {wizard.passedChecks}/{wizard.totalChecks} passed
              </div>
              <div className="test-wizard-nav">
                <button
                  className="demo-btn"
                  data-testid="test-wizard-prev"
                  onClick={wizard.prevStep}
                  disabled={wizard.stepIndex === 0}
                >
                  &larr; prev
                </button>
                <button
                  className="demo-btn"
                  data-testid="test-wizard-next"
                  onClick={wizard.nextStep}
                  disabled={wizard.stepIndex === app.instruct.length - 1}
                >
                  next &rarr;
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
