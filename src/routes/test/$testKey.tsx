import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { useMachine } from '@xstate/react'
import { getTests } from '../../lib/recipes'
import { getMachine } from '../../machines'
import { useXStateDebug } from '../../lib/useXStateDebug'
import { useEventLog } from '../../lib/useEventLog'
import { useResizable } from '../../lib/useResizable'
import { useTheme } from '../../lib/useTheme'
import { useChecklist } from '../../lib/useChecklist'
import { useTestWizard, readRiveUrl } from '../../lib/useTestWizard'
import { extractMachineDoc } from '../../lib/extractMachineDoc'
import { RecipePanel } from '../../components/RecipePanel'
import { DebugPanel } from '../../components/DebugPanel'
import { TestBenchDemo } from '../../components/TestBenchDemo'
import { RiveRenderer } from '../../components/RiveRenderer'
import type { DemoProps } from '../../components/types'

const tests = getTests()

export const Route = createFileRoute('/test/$testKey')({
  beforeLoad: ({ params }) => {
    if (!tests.some((r) => r.key === params.testKey)) {
      throw redirect({ to: '/test' })
    }
  },
  component: TestDetailPage,
})

function TestDetailPage() {
  const { testKey } = Route.useParams()
  const navigate = useNavigate()

  const [theme, toggleTheme] = useTheme()
  const [checkedSteps, toggleStep] = useChecklist(testKey)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [openPanel, setOpenPanel] = useState<'debug' | 'instruct' | null>(null)
  const [renderer, setRenderer] = useState<'html' | 'rive'>('html')

  const { width: panelWidth, handleMouseDown } = useResizable()
  const eventLog = useEventLog()

  const test = tests.find((r) => r.key === testKey)!
  const currentIndex = tests.findIndex((r) => r.key === testKey)

  // XState machine
  const machine = getMachine(testKey)
  const [snapshot, send, actorRef] = useMachine(machine, { inspect: eventLog.inspect })

  // Expose to window.__xstate__
  const machineId = machine.id
  useXStateDebug(machineId, actorRef)

  const stateValue = typeof snapshot.value === 'string' ? snapshot.value : JSON.stringify(snapshot.value)
  const ctx = snapshot.context as Record<string, any>
  const machineDocData = extractMachineDoc(machine)

  // Test wizard
  const wizard = useTestWizard(testKey, machineId, test.instruct)

  // Rive renderer
  const riveUrl = readRiveUrl(testKey)
  const riveMeta = machine.config?.meta as Record<string, any> | undefined
  const riveViewModel = (riveMeta?.riveViewModel as string) ?? ''
  const riveStateMachine = (riveMeta?.riveStateMachine as string) ?? ''

  // Reset panels when testKey changes
  useEffect(() => {
    setOpenPanel(null)
    setSidebarOpen(false)
    setRenderer('html')
  }, [testKey])

  // Close overlays on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenPanel(null)
        setSidebarOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Expose app state for pipeline testing
  useEffect(() => {
    ;(window as any).appState = { view: 'welcome', initialized: true }
  }, [])

  const paginate = useCallback(
    (dir: number) => {
      const next = (currentIndex + dir + tests.length) % tests.length
      navigate({ to: '/test/$testKey', params: { testKey: tests[next].key } })
    },
    [currentIndex, navigate],
  )

  // Derive readout values from machine state
  const getReadoutValue = (source: string): string => {
    if (source === 'state') return stateValue
    if (source === 'progress') {
      if ('progress' in ctx) return String(ctx.progress)
      if ('count' in ctx) return String(ctx.count)
      throw new Error(`No progress/count in context for ${testKey}`)
    }
    if (source === 'active') return String(ctx.isActive)
    throw new Error(`Unknown readout source: ${source}`)
  }

  // Reset machine when switching renderers — Rive can't catch up to mid-flight state
  const switchRenderer = (next: 'html' | 'rive') => {
    if (next !== renderer) {
      send({ type: 'reset' })
      setRenderer(next)
    }
  }

  const demoProps: DemoProps = {
    state: stateValue,
    context: ctx,
    send,
  }

  return (
    <div className="workbench-layout">
      {/* Left-edge sidebar toggle */}
      <nav className="top-left-nav" data-testid="left-nav">
        <button
          className={`top-left-nav-link${sidebarOpen ? ' active' : ''}`}
          data-testid="tab-tests"
          onClick={() => setSidebarOpen((prev) => !prev)}
        >
          test
        </button>
      </nav>

      {/* Right-edge panel toggles */}
      <nav className="top-right-nav" data-testid="right-nav">
        <button
          className={`top-right-nav-link${openPanel === 'debug' ? ' active' : ''}`}
          data-testid="tab-debug"
          onClick={() => setOpenPanel((prev) => (prev === 'debug' ? null : 'debug'))}
        >
          debug
        </button>
        <button
          className={`top-right-nav-link${openPanel === 'instruct' ? ' active' : ''}`}
          data-testid="tab-panel"
          onClick={() => setOpenPanel((prev) => (prev === 'instruct' ? null : 'instruct'))}
        >
          instructions
        </button>
      </nav>

      {/* Topbar */}
      <header className="app-topbar" data-testid="app-topbar">
        <Link to="/test" className="app-topbar-back" data-testid="topbar-back">
          &larr; test
        </Link>
        <span className="app-topbar-name" data-testid="topbar-name">
          {test.name}
          <span className="app-topbar-readout" data-testid="state-readout">
            {test.readout.map((item) => (
              <span
                key={item.source}
                className="app-topbar-readout-item"
                data-testid={`readout-item-${item.source}`}
              >
                {item.label}{' '}
                <span className="app-topbar-readout-value" data-testid={`readout-${item.source}`}>
                  {getReadoutValue(item.source)}
                </span>
              </span>
            ))}
          </span>
        </span>
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

      {/* Backdrop — closes sidebar on click outside */}
      {sidebarOpen && (
        <div
          className="panel-backdrop"
          data-testid="panel-backdrop"
          onClick={() => {
            setSidebarOpen(false)
          }}
        />
      )}

      {/* Main content area */}
      <div className="workbench-body">
        {/* Sidebar — slides in from left */}
        <aside
          className={`sidebar-panel${sidebarOpen ? ' sidebar-panel--open' : ''}`}
          data-testid="sidebar-panel"
        >
          <div className="sidebar-panel-header">
            <span className="sidebar-panel-title">test</span>
            <button
              className="sidebar-panel-close"
              data-testid="sidebar-close"
              onClick={() => setSidebarOpen(false)}
            >
              &times;
            </button>
          </div>
          <ul className="command-entries" data-testid="command-entries">
            {tests.map((r) => (
              <li key={r.key}>
                <Link
                  to="/test/$testKey"
                  params={{ testKey: r.key }}
                  className={`command-entry${r.key === testKey ? ' active' : ''}`}
                  data-testid={`entry-${r.key}`}
                  data-recipe={r.key}
                  data-status={r.status}
                >
                  <span className="command-entry-prefix">
                    {r.key === testKey ? '>' : '\u00A0'}
                  </span>
                  <span className="command-entry-name">{r.key}</span>
                  <span className={`command-entry-badge command-entry-badge--${r.status}`}>
                    [{r.status}]
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <hr className="command-divider" data-testid="command-divider" />

          <div className="command-status" data-testid="command-status">
            <div className="command-status-line">
              tests:{' '}
              <span className="command-status-value" data-testid="status-recipes">
                {tests.length}
              </span>
            </div>
            <div className="command-status-line">
              bindings:{' '}
              <span className="command-status-value" data-testid="status-bindings">
                {test.bindings}
              </span>
            </div>
            <div className="command-status-line">
              states:{' '}
              <span className="command-status-value" data-testid="status-states">
                {test.states}
              </span>
            </div>
          </div>

          <div className="command-cursor" data-testid="command-cursor">
            <span className="command-cursor-char">_</span>
          </div>
        </aside>

        {/* Theater Area */}
        <main
          className={`theater-area${openPanel !== null ? ' theater-area--panel-open' : ''}`}
          data-testid="theater-area"
        >
          <div className="theater-content">
            <div className="stage" data-testid="stage">
              <div className="stage-header" data-testid="stage-header">
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
              </div>
              <div className="stage-body" data-testid="stage-body-demo">
                <div className="stage-live" data-testid="stage-live">
                  {renderer === 'html' && (
                    <>
                      {testKey === 'test-bench' && <TestBenchDemo {...demoProps} />}
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
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel — inline flex child */}
          {openPanel !== null && (
            <>
              <div
                className="resize-handle"
                data-testid="resize-handle"
                onMouseDown={handleMouseDown}
              />
              <div
                className="right-panel"
                data-testid="right-panel"
                style={{ width: panelWidth }}
              >
                <div className="right-panel-header">
                  <button
                    className="right-panel-close"
                    data-testid="right-panel-close"
                    onClick={() => setOpenPanel(null)}
                  >
                    &times;
                  </button>
                </div>
                <div className="right-panel-body">
                  {openPanel === 'debug' && (
                    <DebugPanel
                      machineDocData={machineDocData}
                      stateValue={stateValue}
                      context={ctx}
                      eventLogEntries={eventLog.entries}
                      onClearEventLog={eventLog.clear}
                    />
                  )}
                  {openPanel === 'instruct' && (
                    <RecipePanel
                      recipe={test}
                      machineDocData={machineDocData}
                      stateValue={stateValue}
                      checkedSteps={checkedSteps}
                      toggleStep={toggleStep}
                      onOpenWizard={wizard.openWizard}
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Test Wizard Modal */}
      {wizard.open && (
        <>
          <div className="test-wizard-backdrop" data-testid="test-wizard-backdrop" onClick={wizard.closeWizard} />
          <div className="test-wizard" data-testid="test-wizard">
            <div className="test-wizard-header">
              <span className="test-wizard-title">TEST WIZARD</span>
              <span className="test-wizard-step-counter">
                step {wizard.stepIndex + 1}/{test.instruct.length}
              </span>
              <button className="test-wizard-close" data-testid="test-wizard-close" onClick={wizard.closeWizard}>
                &times;
              </button>
            </div>
            <div className="test-wizard-body">
              <div className="test-wizard-step" data-testid="test-wizard-step">
                <span className="test-wizard-step-title">{test.instruct[wizard.stepIndex].step}</span>
                <span className="test-wizard-step-detail">{test.instruct[wizard.stepIndex].detail}</span>
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
                  disabled={wizard.stepIndex === test.instruct.length - 1}
                >
                  next &rarr;
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <footer className="bottom-footer" data-testid="bottom-footer">
        <nav className="pagination" data-testid="pagination">
          <button
            className="pagination-btn"
            data-testid="pagination-prev"
            onClick={() => paginate(-1)}
          >
            &larr;
          </button>
          <div className="pagination-indicator" data-testid="pagination-indicator">
            {tests.map((r, i) => (
              <span
                key={i}
                className={`pagination-dot${r.key === testKey ? ' active' : ''}`}
                data-testid={`pagination-dot-${i}`}
              />
            ))}
          </div>
          <button
            className="pagination-btn"
            data-testid="pagination-next"
            onClick={() => paginate(1)}
          >
            &rarr;
          </button>
        </nav>
      </footer>
    </div>
  )
}
