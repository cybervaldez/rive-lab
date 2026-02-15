interface ContextInspectorProps {
  context: Record<string, any>
}

export function ContextInspector({ context }: ContextInspectorProps) {
  const entries = Object.entries(context)

  return (
    <div className="context-inspector" data-testid="context-inspector">
      <div className="t-section-header" data-testid="context-inspector-header">&gt; Context</div>
      <div className="context-inspector-entries">
        {entries.map(([key, value]) => (
          <div className="context-inspector-row" key={key} data-testid={`ctx-${key}`}>
            <span className="context-inspector-key">{key}</span>
            <span className="context-inspector-value">
              {typeof value === 'object' && value !== null
                ? JSON.stringify(value)
                : String(value)}
            </span>
          </div>
        ))}
        {entries.length === 0 && (
          <div className="context-inspector-empty">no context</div>
        )}
      </div>
    </div>
  )
}
