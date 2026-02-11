import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { getApps } from '../../lib/recipes'
import { useTheme } from '../../lib/useTheme'
import { usePinned } from '../../lib/usePinned'
import { useChecklist } from '../../lib/useChecklist'
import { useTestWizard } from '../../lib/useTestWizard'

const apps = getApps()

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
  const [isPinned, togglePinned] = usePinned()
  const [checkedSteps, toggleStep] = useChecklist(appKey)
  const [openPanel, setOpenPanel] = useState<'instruct' | null>(() =>
    isPinned ? 'instruct' : null,
  )
  const lastPanelRef = useRef<'instruct'>('instruct')

  const app = apps.find((r) => r.key === appKey)!
  const [machineState] = useState(app.state)

  // Test wizard (no machine for apps yet, use appKey as machineId)
  const wizard = useTestWizard(appKey, appKey, app.instruct)

  // Track last opened panel so content stays visible during slide-out
  useEffect(() => {
    if (openPanel) lastPanelRef.current = openPanel
  }, [openPanel])

  const displayPanel = openPanel ?? lastPanelRef.current
  const pinnedOpen = isPinned && openPanel !== null

  // Close panel on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenPanel(null)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="app-theater" data-testid="app-theater">
      {/* Floating right-edge instructions toggle */}
      <nav className="top-right-nav" data-testid="right-nav">
        <button
          className={`top-right-nav-link${openPanel !== null ? ' active' : ''}`}
          data-testid="tab-panel"
          onClick={() => setOpenPanel((prev) => (prev !== null ? null : 'instruct'))}
        >
          instructions
        </button>
      </nav>

      {/* Top bar */}
      <header className="app-topbar" data-testid="app-topbar">
        <Link to="/apps" className="app-topbar-back" data-testid="app-back">
          &larr; apps
        </Link>
        <span className="app-topbar-name" data-testid="app-name">
          {app.name}
          <button
            className="topbar-docs-pill disabled"
            data-testid="topbar-docs"
            disabled
          >
            docs
          </button>
          <span className="app-topbar-state" data-testid="app-state">{machineState}</span>
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

      {/* Backdrop — closes panel on click outside */}
      {openPanel !== null && !isPinned && (
        <div
          className="panel-backdrop"
          data-testid="panel-backdrop"
          onClick={() => setOpenPanel(null)}
        />
      )}

      {/* Stage + pinned panel row */}
      <div className="app-body">
        <main className="app-stage" data-testid="app-stage">
          <div className="app-placeholder" data-testid="app-placeholder">
            <span className="app-placeholder-icon">&#9654;</span>
            <span className="app-placeholder-label">{app.name}</span>
            <span className="app-placeholder-status">[{app.status}] — demo coming soon</span>
          </div>
        </main>

        {/* Overlay Panel — slides in from right, same as component page */}
        <div
          className={`overlay-panel${openPanel ? ' overlay-panel--open' : ''}${pinnedOpen ? ' overlay-panel--pinned' : ''}`}
          data-testid="overlay-panel"
        >
          <div className="overlay-header">
            <button
              className="overlay-close"
              data-testid="overlay-close"
              onClick={() => setOpenPanel(null)}
            >
              &times;
            </button>
            <button
              className="overlay-pin"
              data-testid="overlay-pin"
              onClick={togglePinned}
              aria-label={isPinned ? 'Unpin panel' : 'Pin panel'}
            >
              {isPinned ? '\u229F' : '\u229E'}
            </button>
          </div>
          <div className="overlay-body">
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
          </div>
        </div>
      </div>

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
                <span className="test-wizard-rive-label">rive file (future)</span>
                <input
                  className="test-wizard-rive-input"
                  data-testid="test-wizard-rive-input"
                  type="text"
                  placeholder="https://example.com/file.riv"
                  value={wizard.riveUrl}
                  onChange={(e) => wizard.updateRiveUrl(e.target.value)}
                  disabled
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
