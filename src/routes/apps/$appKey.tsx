import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { getApps } from '../../lib/recipes'
import { useTheme } from '../../lib/useTheme'
import { usePinned } from '../../lib/usePinned'
import { useChecklist } from '../../lib/useChecklist'

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
  const [openPanel, setOpenPanel] = useState<'instruct' | 'contract' | 'events' | null>(() =>
    isPinned ? 'instruct' : null,
  )
  const lastPanelRef = useRef<'instruct' | 'contract' | 'events'>('instruct')

  const app = apps.find((r) => r.key === appKey)!
  const [machineState, setMachineState] = useState(app.state)

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

  const togglePanel = useCallback((panel: 'instruct' | 'contract' | 'events') => {
    setOpenPanel((prev) => (prev === panel ? null : panel))
  }, [])

  return (
    <div className="app-theater" data-testid="app-theater">
      {/* Floating right-edge panel toggle */}
      <nav className="top-right-nav" data-testid="right-nav">
        <button
          className={`top-right-nav-link${openPanel !== null ? ' active' : ''}`}
          data-testid="tab-panel"
          onClick={() => setOpenPanel((prev) => (prev !== null ? null : (lastPanelRef.current ?? 'instruct')))}
        >
          panel
        </button>
      </nav>

      {/* Top bar */}
      <header className="app-topbar" data-testid="app-topbar">
        <Link to="/apps" className="app-topbar-back" data-testid="app-back">
          &larr; apps
        </Link>
        <span className="app-topbar-name" data-testid="app-name">
          {app.name}
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
          <nav className="overlay-tabs">
            <button
              className={`overlay-tab${displayPanel === 'instruct' ? ' active' : ''}`}
              onClick={() => togglePanel('instruct')}
            >
              instruct
            </button>
            <button
              className={`overlay-tab${displayPanel === 'contract' ? ' active' : ''}`}
              onClick={() => togglePanel('contract')}
            >
              contract
            </button>
            <button
              className={`overlay-tab${displayPanel === 'events' ? ' active' : ''}`}
              onClick={() => togglePanel('events')}
            >
              events
            </button>
          </nav>
        </div>
        <div className="overlay-body">
          {displayPanel === 'instruct' && (
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
            </div>
          )}
          {displayPanel === 'contract' && (
            <div className="contract-panel" data-testid="contract-panel">
              <table className="contract-table" data-testid="contract-table">
                <thead>
                  <tr>
                    <th>XState (now)</th>
                    <th>Rive (later)</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const groups: { label: string; rows: typeof app.contract }[] = []
                    const cats = [
                      { prefix: 'context.', label: 'Properties' },
                      { prefix: 'event:', label: 'Triggers' },
                      { prefix: 'state:', label: 'States' },
                    ]
                    for (const cat of cats) {
                      const rows = app.contract.filter((r) => r.xstate.startsWith(cat.prefix))
                      if (rows.length > 0) groups.push({ label: cat.label, rows })
                    }
                    return groups.map((group) => (
                      <Fragment key={group.label}>
                        <tr className="contract-group-header">
                          <td colSpan={2}>{group.label}</td>
                        </tr>
                        {group.rows.map((row, i) => (
                          <tr key={i} data-testid="contract-row">
                            <td>{row.xstate}</td>
                            <td>{row.rive}</td>
                          </tr>
                        ))}
                      </Fragment>
                    ))
                  })()}
                </tbody>
              </table>
            </div>
          )}
          {displayPanel === 'events' && (
            <div className="events-panel" data-testid="events-panel">
              <table className="events-table" data-testid="events-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Direction</th>
                    <th>Type</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {app.events.map((evt, i) => (
                    <tr key={i}>
                      <td>{evt.name}</td>
                      <td>
                        <span className={`events-dir events-dir--${evt.direction}`}>
                          {evt.direction === 'in' ? '← receives' : '→ fires'}
                        </span>
                      </td>
                      <td>{evt.type}</td>
                      <td>{evt.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
