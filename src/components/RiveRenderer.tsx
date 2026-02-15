import type { DemoProps } from './types'

interface RiveRendererProps extends DemoProps {
  riveUrl: string
  riveViewModel: string
  riveStateMachine: string
}

export function RiveRenderer({
  state,
  context,
  riveUrl,
  riveViewModel,
  riveStateMachine,
}: RiveRendererProps) {
  return (
    <div className="rive-renderer" data-testid="rive-renderer">
      <div className="rive-renderer-canvas" data-testid="rive-canvas">
        <span className="rive-renderer-placeholder-icon">&#9654;</span>
        <span className="rive-renderer-placeholder-label">rive canvas</span>
      </div>
      <div className="rive-renderer-info" data-testid="rive-renderer-info">
        <div className="rive-renderer-info-row">
          <span className="rive-renderer-info-key">url</span>
          <span className="rive-renderer-info-val" data-testid="rive-url-display">{riveUrl}</span>
        </div>
        <div className="rive-renderer-info-row">
          <span className="rive-renderer-info-key">viewModel</span>
          <span className="rive-renderer-info-val" data-testid="rive-vm-name">{riveViewModel}</span>
        </div>
        <div className="rive-renderer-info-row">
          <span className="rive-renderer-info-key">stateMachine</span>
          <span className="rive-renderer-info-val" data-testid="rive-sm-name">{riveStateMachine}</span>
        </div>
        <div className="rive-renderer-info-row">
          <span className="rive-renderer-info-key">state</span>
          <span className="rive-renderer-info-val" data-testid="rive-state-display">
            {typeof state === 'string' ? state : JSON.stringify(state)}
          </span>
        </div>
        <div className="rive-renderer-info-row">
          <span className="rive-renderer-info-key">context</span>
          <span className="rive-renderer-info-val" data-testid="rive-context-display">
            {Object.keys(context).length} properties
          </span>
        </div>
      </div>
    </div>
  )
}
