import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useMachine } from '@xstate/react'
import { getApps } from '../../../lib/recipes'
import { streamOverlayMachine } from '../../../machines/streamOverlay'
import type { StreamTab } from '../../../machines/streamOverlay'
import { useWebSocket } from '../../../lib/useWebSocket'
import type { ApiEvent } from '../../../components/StreamApiTab'
import { useXStateDebug } from '../../../lib/useXStateDebug'
import { useEventLog } from '../../../lib/useEventLog'
import { useResizable } from '../../../lib/useResizable'
import { useTheme } from '../../../lib/useTheme'
import { useChecklist } from '../../../lib/useChecklist'
import { useTestWizard, readRiveUrl } from '../../../lib/useTestWizard'
import { extractMachineDoc } from '../../../lib/extractMachineDoc'
import { RecipePanel } from '../../../components/RecipePanel'
import { DebugFooter } from '../../../components/DebugFooter'
import { InstructOverlay } from '../../../components/InstructOverlay'
import { RiveRenderer } from '../../../components/RiveRenderer'
import { StreamLiveView } from '../../../components/StreamLiveView'
import { StreamMapper } from '../../../components/StreamMapper'
import { StreamSources } from '../../../components/StreamSources'
import { StreamApiTab } from '../../../components/StreamApiTab'
import { StreamCommunityTab } from '../../../components/StreamCommunityTab'
import type { DemoProps } from '../../../components/types'

const apps = getApps()
const APP_KEY = 'stream-overlay'

export const Route = createFileRoute('/apps/stream-overlay/')({
  component: StreamOverlayPage,
})

const TABS: { key: StreamTab; label: string }[] = [
  { key: 'live', label: 'live' },
  { key: 'effects', label: 'effects' },
  { key: 'mapper', label: 'mapper' },
  { key: 'sources', label: 'sources' },
  { key: 'api', label: 'api' },
  { key: 'community', label: 'community' },
]

function StreamOverlayPage() {
  const [theme, toggleTheme] = useTheme()
  const [checkedSteps, toggleStep] = useChecklist(APP_KEY)
  const [instructMode, setInstructMode] = useState<'closed' | 'overlay' | 'pinned'>('closed')
  const [debugMode, setDebugMode] = useState<'collapsed' | 'expanded' | 'pinned'>('collapsed')
  const [renderer, setRenderer] = useState<'html' | 'rive'>('html')

  const { width: instructWidth, handleMouseDown: instructResizeStart } = useResizable('instruct-panel-width')
  const eventLog = useEventLog()

  const app = apps.find((r) => r.key === APP_KEY)!

  // XState machine
  const [snapshot, send, actorRef] = useMachine(streamOverlayMachine, { inspect: eventLog.inspect })

  const machineId = streamOverlayMachine.id
  useXStateDebug(machineId, actorRef)

  const stateValue = typeof snapshot.value === 'string'
    ? snapshot.value
    : JSON.stringify(snapshot.value)
  const ctx = snapshot.context
  const activeTab = ctx.activeTab
  const boundCodes = new Set(Object.values(ctx.bindings))

  const machineDocData = extractMachineDoc(streamOverlayMachine)

  // WebSocket connection
  const ws = useWebSocket(ctx.connection.url)

  // Sync WS status to machine
  useEffect(() => {
    send({ type: 'WS_STATUS', status: ws.status })
  }, [ws.status, send])

  // Apply inbound WS events to local machine
  useEffect(() => {
    if (!ws.lastEvent) return
    const evt = ws.lastEvent as any
    if (evt.type === 'TRIGGER_INPUT' || evt.type === 'CLEAR_TRIGGER' || evt.type === 'KEY_DOWN' || evt.type === 'KEY_UP') {
      send(evt)
      apiLogEvent('WS', evt.type, evt.action || evt.code || '')
    }
  }, [ws.lastEvent]) // eslint-disable-line react-hooks/exhaustive-deps

  // API event log state (lifted from StreamApiTab for persistence across tab switches)
  const nextEventIdRef = useRef(1)
  const [apiEvents, setApiEvents] = useState<ApiEvent[]>([])

  const apiLogEvent = useCallback((source: string, type: string, detail: string) => {
    const d = new Date()
    const timestamp = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${String(d.getMilliseconds()).padStart(3, '0')}`
    setApiEvents((prev) => [
      ...prev.slice(-99),
      { id: nextEventIdRef.current++, timestamp, source, type, detail },
    ])
  }, [])

  const apiClearLog = useCallback(() => setApiEvents([]), [])

  // Log WS connection events
  useEffect(() => {
    if (ws.status === 'connected') {
      apiLogEvent('WS', 'connected', ctx.connection.url)
    } else if (ws.status === 'reconnecting') {
      apiLogEvent('WS', 'reconnecting', 'connection lost')
    }
  }, [ws.status]) // eslint-disable-line react-hooks/exhaustive-deps

  // Test wizard
  const wizard = useTestWizard(APP_KEY, machineId, app.instruct)

  // Rive renderer
  const riveUrl = readRiveUrl(APP_KEY)
  const riveMeta = streamOverlayMachine.config?.meta as Record<string, any> | undefined
  const riveViewModel = (riveMeta?.riveViewModel as string) ?? ''
  const riveStateMachine = (riveMeta?.riveStateMachine as string) ?? ''

  // Keyboard listeners (active in all tabs)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (boundCodes.has(e.code)) e.preventDefault()
      send({ type: 'KEY_DOWN', code: e.code })
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (boundCodes.has(e.code)) e.preventDefault()
      send({ type: 'KEY_UP', code: e.code })
    }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [send, boundCodes])

  // Close overlays on Escape (only when mapper is not in rebind mode)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !ctx.mapperOpen) {
        setInstructMode('closed')
        setDebugMode('collapsed')
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [ctx.mapperOpen])

  const toggleInstruct = () => {
    setInstructMode((prev) => (prev === 'closed' ? 'overlay' : 'closed'))
  }

  const toggleDebug = () => {
    setDebugMode((prev) => (prev === 'collapsed' ? 'expanded' : 'collapsed'))
  }

  // Reset machine when switching renderers
  const switchRenderer = (next: 'html' | 'rive') => {
    if (next !== renderer) {
      send({ type: 'reset' })
      setRenderer(next)
    }
  }

  const demoProps: DemoProps = {
    state: snapshot.value as any,
    context: ctx as Record<string, any>,
    send,
  }

  const instructContent = (
    <>
      {machineDocData ? (
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
      )}
    </>
  )

  return (
    <div className="app-theater" data-testid="app-theater">
      {/* Floating toggle buttons */}
      <div className="stream-float-btns">
        <button
          className={`stream-float-btn${instructMode !== 'closed' ? ' stream-float-btn--active' : ''}`}
          data-testid="toggle-instruct"
          onClick={toggleInstruct}
        >
          instructions
        </button>
        <button
          className={`stream-float-btn${debugMode !== 'collapsed' ? ' stream-float-btn--active' : ''}`}
          data-testid="toggle-debug"
          onClick={toggleDebug}
        >
          debug
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
            {stateValue}
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

      {/* Stage + panel row */}
      <div className="app-body">
        {/* Instruct panel (pinned mode: inline flex child) */}
        {instructMode === 'pinned' && (
          <InstructOverlay
            mode="pinned"
            onClose={() => setInstructMode('closed')}
            onPin={() => setInstructMode('overlay')}
            width={instructWidth}
            onResizeStart={instructResizeStart}
          >
            {instructContent}
          </InstructOverlay>
        )}

        <main className="app-stage app-stage--stream" data-testid="app-stage">
          <div className="stage-header" data-testid="stage-header">
            {/* Renderer toggle */}
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

            {/* Tab bar */}
            <div className="stream-tabs" data-testid="stream-tabs">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  className={`stream-tab${activeTab === tab.key ? ' stream-tab--active' : ''}`}
                  data-testid={`stream-tab-${tab.key}`}
                  onClick={() => send({ type: 'SET_TAB', tab: tab.key })}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {renderer === 'html' && (
            <div className="stream-tab-content" data-testid="stream-tab-content">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                >
                  {activeTab === 'live' && (
                    <div className="stream-preview" data-testid="stream-preview">
                      <StreamLiveView
                        activeInputs={ctx.activeInputs}
                        bindings={ctx.bindings}
                      />
                    </div>
                  )}
                  {activeTab === 'effects' && (
                    <div className="stream-effects" data-testid="stream-effects">
                      <div className="stream-effects-header">EFFECTS</div>
                      <p className="stream-effects-placeholder">
                        Visual effects will be configured here. Currently, actions trigger the default flash indicator.
                      </p>
                    </div>
                  )}
                  {activeTab === 'mapper' && (
                    <StreamMapper {...demoProps} />
                  )}
                  {activeTab === 'sources' && (
                    <StreamSources sources={ctx.sources} />
                  )}
                  {activeTab === 'api' && (
                    <StreamApiTab
                      bindings={ctx.bindings}
                      connection={ctx.connection}
                      send={send}
                      wsSend={ws.send}
                      wsConnected={ws.status === 'connected'}
                      events={apiEvents}
                      logEvent={apiLogEvent}
                      onClearLog={apiClearLog}
                    />
                  )}
                  {activeTab === 'community' && (
                    <StreamCommunityTab
                      wsStatus={ws.status}
                      wsSend={ws.send}
                      lastEvent={ws.lastEvent}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
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

        {/* Instruct overlay (overlay mode: absolute positioned) */}
        <AnimatePresence>
          {instructMode === 'overlay' && (
            <InstructOverlay
              mode="overlay"
              onClose={() => setInstructMode('closed')}
              onPin={() => setInstructMode('pinned')}
              width={instructWidth}
              onResizeStart={instructResizeStart}
            >
              {instructContent}
            </InstructOverlay>
          )}
        </AnimatePresence>
      </div>

      {/* Debug footer — always rendered at bottom */}
      {machineDocData && (
        <DebugFooter
          mode={debugMode}
          stateValue={stateValue}
          context={ctx as Record<string, any>}
          machineDocData={machineDocData}
          eventLogEntries={eventLog.entries}
          onClearEventLog={eventLog.clear}
          onToggle={toggleDebug}
          onPin={() => setDebugMode((prev) => (prev === 'pinned' ? 'expanded' : 'pinned'))}
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
