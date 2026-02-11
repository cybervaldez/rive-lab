import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { getComponents, DEFAULT_RECIPE_KEY } from '../../lib/recipes'
import { useTheme } from '../../lib/useTheme'
import { usePinned } from '../../lib/usePinned'
import { ProgressBarDemo } from '../../components/ProgressBarDemo'
import { ToggleSwitchDemo } from '../../components/ToggleSwitchDemo'
import { CounterDemo } from '../../components/CounterDemo'
import type { DemoProps } from '../../components/types'

const components = getComponents()

export const Route = createFileRoute('/components/$recipeKey')({
  beforeLoad: ({ params }) => {
    if (!components.some((r) => r.key === params.recipeKey)) {
      throw redirect({ to: '/components/$recipeKey', params: { recipeKey: DEFAULT_RECIPE_KEY } })
    }
  },
  component: RecipePage,
})

function RecipePage() {
  const { recipeKey } = Route.useParams()
  const navigate = useNavigate()

  const [theme, toggleTheme] = useTheme()
  const [isPinned, togglePinned] = usePinned()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [openPanel, setOpenPanel] = useState<'instruct' | 'contract' | 'events' | null>(() =>
    isPinned ? 'instruct' : null,
  )
  const [progress, setProgress] = useState(65)
  const [machineState, setMachineState] = useState('loading')
  const [isActive, setIsActive] = useState(true)
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPanelRef = useRef<'instruct' | 'contract' | 'events'>('instruct')

  const recipe = components.find((r) => r.key === recipeKey)!
  const currentIndex = components.findIndex((r) => r.key === recipeKey)

  // Track last opened panel so content stays visible during slide-out
  useEffect(() => {
    if (openPanel) lastPanelRef.current = openPanel
  }, [openPanel])

  const displayPanel = openPanel ?? lastPanelRef.current
  const pinnedOpen = isPinned && openPanel !== null

  // Reset state when recipeKey changes
  useEffect(() => {
    if (animRef.current) {
      clearTimeout(animRef.current)
      animRef.current = null
    }
    const r = components.find((rec) => rec.key === recipeKey)!
    setProgress(r.progress)
    setMachineState(r.state)
    setIsActive(r.active)
    if (!isPinned) setOpenPanel(null)
    setSidebarOpen(false)
  }, [recipeKey, isPinned])

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
    ;(window as any).__xstate__ = {
      state: machineState,
      context: { progress, isActive },
      recipeIndex: currentIndex,
      recipeName: recipe.key,
    }
    ;(window as any).appState = { view: 'welcome', initialized: true }
  }, [machineState, progress, isActive, currentIndex, recipe.key])

  const paginate = useCallback(
    (dir: number) => {
      const next = (currentIndex + dir + components.length) % components.length
      navigate({ to: '/components/$recipeKey', params: { recipeKey: components[next].key } })
    },
    [currentIndex, navigate],
  )

  const demoProps: DemoProps = {
    machineState,
    setMachineState,
    progress,
    setProgress,
    isActive,
    setIsActive,
    animRef,
  }

  const togglePanel = useCallback((panel: 'instruct' | 'contract' | 'events') => {
    setOpenPanel((prev) => (prev === panel ? null : panel))
  }, [])

  return (
    <div className="workbench-layout">
      {/* Left-edge sidebar toggle */}
      <nav className="top-left-nav" data-testid="left-nav">
        <button
          className={`top-left-nav-link${sidebarOpen ? ' active' : ''}`}
          data-testid="tab-components"
          onClick={() => setSidebarOpen((prev) => !prev)}
        >
          components
        </button>
      </nav>

      {/* Right-edge panel toggle */}
      <nav className="top-right-nav" data-testid="right-nav">
        <button
          className={`top-right-nav-link${openPanel !== null ? ' active' : ''}`}
          data-testid="tab-panel"
          onClick={() => setOpenPanel((prev) => (prev !== null ? null : (lastPanelRef.current ?? 'instruct')))}
        >
          panel
        </button>
      </nav>

      {/* Topbar */}
      <header className="app-topbar" data-testid="app-topbar">
        <Link to="/components" className="app-topbar-back" data-testid="topbar-back">
          &larr; components
        </Link>
        <span className="app-topbar-name" data-testid="topbar-name">
          {recipe.name}
          <span className="app-topbar-readout" data-testid="state-readout">
            {recipe.readout.map((item) => {
              const value =
                item.source === 'state'
                  ? machineState
                  : item.source === 'progress'
                    ? String(progress)
                    : String(isActive)
              return (
                <span
                  key={item.source}
                  className="app-topbar-readout-item"
                  data-testid={`readout-item-${item.source}`}
                >
                  {item.label}{' '}
                  <span className="app-topbar-readout-value" data-testid={`readout-${item.source}`}>
                    {value}
                  </span>
                </span>
              )
            })}
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

      {/* Backdrop — closes panels on click outside */}
      {(sidebarOpen || (openPanel !== null && !isPinned)) && (
        <div
          className="panel-backdrop"
          data-testid="panel-backdrop"
          onClick={() => {
            setSidebarOpen(false)
            if (!isPinned) setOpenPanel(null)
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
            <span className="sidebar-panel-title">components</span>
            <button
              className="sidebar-panel-close"
              data-testid="sidebar-close"
              onClick={() => setSidebarOpen(false)}
            >
              &times;
            </button>
          </div>
          <ul className="command-entries" data-testid="command-entries">
            {components.map((r) => (
              <li key={r.key}>
                <Link
                  to="/components/$recipeKey"
                  params={{ recipeKey: r.key }}
                  className={`command-entry${r.key === recipeKey ? ' active' : ''}`}
                  data-testid={`entry-${r.key}`}
                  data-recipe={r.key}
                  data-status={r.status}
                >
                  <span className="command-entry-prefix">
                    {r.key === recipeKey ? '>' : '\u00A0'}
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
              recipes:{' '}
              <span className="command-status-value" data-testid="status-recipes">
                {components.length}
              </span>
            </div>
            <div className="command-status-line">
              bindings:{' '}
              <span className="command-status-value" data-testid="status-bindings">
                {recipe.bindings}
              </span>
            </div>
            <div className="command-status-line">
              states:{' '}
              <span className="command-status-value" data-testid="status-states">
                {recipe.states}
              </span>
            </div>
          </div>

          <div className="command-cursor" data-testid="command-cursor">
            <span className="command-cursor-char">_</span>
          </div>
        </aside>

        {/* Theater Area */}
        <main className="theater-area" data-testid="theater-area">
          <div className="theater-content">
            <div className="stage" data-testid="stage">
              <div className="stage-body" data-testid="stage-body-demo">
                <div className="stage-live" data-testid="stage-live">
                  {recipeKey === 'progress-bar' && <ProgressBarDemo {...demoProps} />}
                  {recipeKey === 'toggle-switch' && <ToggleSwitchDemo {...demoProps} />}
                  {recipeKey === 'counter' && <CounterDemo {...demoProps} />}
                </div>
              </div>
            </div>
          </div>

          {/* Overlay Panel — slides in from right */}
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
                    {recipe.instruct.map((item, i) => (
                      <li key={i} className="instruct-step" data-testid={`instruct-step-${i}`}>
                        <span className="instruct-step-title">{item.step}</span>
                        <span className="instruct-step-detail">{item.detail}</span>
                      </li>
                    ))}
                  </ol>
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
                        const groups: { label: string; rows: typeof recipe.contract }[] = []
                        const cats = [
                          { prefix: 'context.', label: 'Properties' },
                          { prefix: 'event:', label: 'Triggers' },
                          { prefix: 'state:', label: 'States' },
                        ]
                        for (const cat of cats) {
                          const rows = recipe.contract.filter((r) => r.xstate.startsWith(cat.prefix))
                          if (rows.length > 0) groups.push({ label: cat.label, rows })
                        }
                        return groups.map((group) => (
                          <Fragment key={group.label}>
                            <tr
                              className="contract-group-header"
                              data-testid={`contract-group-${group.label.toLowerCase()}`}
                            >
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
                      {recipe.events.map((evt, i) => (
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
        </main>
      </div>

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
            {components.map((r, i) => (
              <span
                key={i}
                className={`pagination-dot${r.key === recipeKey ? ' active' : ''}`}
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
