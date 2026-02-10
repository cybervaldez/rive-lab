import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { recipes, DEFAULT_RECIPE_KEY } from '../lib/recipes'
import { ProgressBarDemo } from '../components/ProgressBarDemo'
import { ToggleSwitchDemo } from '../components/ToggleSwitchDemo'
import { CounterDemo } from '../components/CounterDemo'
import type { DemoProps } from '../components/types'

export const Route = createFileRoute('/$recipeKey')({
  beforeLoad: ({ params }) => {
    if (!recipes.some((r) => r.key === params.recipeKey)) {
      throw redirect({ to: '/$recipeKey', params: { recipeKey: DEFAULT_RECIPE_KEY } })
    }
  },
  component: RecipePage,
})

function RecipePage() {
  const { recipeKey } = Route.useParams()
  const navigate = useNavigate()

  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [openPanel, setOpenPanel] = useState<'instruct' | 'contract' | 'events' | null>(null)
  const [isPinned, setIsPinned] = useState(false)
  const [progress, setProgress] = useState(65)
  const [machineState, setMachineState] = useState('loading')
  const [isActive, setIsActive] = useState(true)
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPanelRef = useRef<'instruct' | 'contract' | 'events'>('instruct')

  const recipe = recipes.find((r) => r.key === recipeKey)!
  const currentIndex = recipes.findIndex((r) => r.key === recipeKey)

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
    const r = recipes.find((rec) => rec.key === recipeKey)!
    setProgress(r.progress)
    setMachineState(r.state)
    setIsActive(r.active)
    if (!isPinned) setOpenPanel(null)
  }, [recipeKey, isPinned])

  // Close overlay on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenPanel(null)
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
      const next = (currentIndex + dir + recipes.length) % recipes.length
      navigate({ to: '/$recipeKey', params: { recipeKey: recipes[next].key } })
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

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark'
      document.documentElement.setAttribute('data-theme', next)
      return next
    })
  }, [])

  const togglePanel = useCallback((panel: 'instruct' | 'contract' | 'events') => {
    setOpenPanel((prev) => (prev === panel ? null : panel))
  }, [])

  return (
    <>
      {/* Top-right panel toggle */}
      <nav className="top-right-nav" data-testid="right-nav">
        <button
          className={`top-right-nav-link${openPanel !== null ? ' active' : ''}`}
          data-testid="tab-panel"
          onClick={() => setOpenPanel((prev) => (prev !== null ? null : (lastPanelRef.current ?? 'instruct')))}
        >
          panel
        </button>
      </nav>

      <div className="split-layout" data-testid="split-layout">
        {/* Command Palette */}
        <aside className="command-palette" data-testid="command-palette">
          <div className="command-header" data-testid="command-header">
            <span className="command-prompt">
              <span className="command-prompt-dollar">$</span>
              <span className="command-prompt-text"> rive-lab</span>
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
          </div>

          <ul className="command-entries" data-testid="command-entries">
            {recipes.map((r) => (
              <li key={r.key}>
                <Link
                  to="/$recipeKey"
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
                {recipes.length}
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
        <main className={`theater-area${pinnedOpen ? ' theater-area--panel-pinned' : ''}`} data-testid="theater-area">
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
                onClick={() => setIsPinned((p) => !p)}
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
        <span className="footer-recipe-name" data-testid="footer-recipe-name">
          {recipe.name}
        </span>
        <div className="footer-readout" data-testid="state-readout">
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
                className="footer-readout-item"
                data-testid={`readout-item-${item.source}`}
              >
                {item.label}{' '}
                <span className="footer-readout-value" data-testid={`readout-${item.source}`}>
                  {value}
                </span>
              </span>
            )
          })}
        </div>
        <nav className="pagination" data-testid="pagination">
          <button
            className="pagination-btn"
            data-testid="pagination-prev"
            onClick={() => paginate(-1)}
          >
            &larr;
          </button>
          <div className="pagination-indicator" data-testid="pagination-indicator">
            {recipes.map((r, i) => (
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
        <div className="contract-footer" data-testid="contract-footer">
          <span className="contract-footer-accent" data-testid="footer-bindings">
            {recipe.bindings}
          </span>{' '}
          bindings &middot;{' '}
          <span className="contract-footer-accent" data-testid="footer-states">
            {recipe.states}
          </span>{' '}
          states &middot;{' '}
          <span className="contract-footer-accent" data-testid="footer-triggers">
            {recipe.triggers}
          </span>{' '}
          triggers
        </div>
      </footer>
    </>
  )
}
