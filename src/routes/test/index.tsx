import { createFileRoute, Link } from '@tanstack/react-router'
import { getTests } from '../../lib/recipes'

export const Route = createFileRoute('/test/')({
  component: TestGallery,
})

function TestGallery() {
  const tests = getTests()

  return (
    <div className="gallery-page">
      <nav className="gallery-nav">
        <Link to="/" className="gallery-nav-brand">rive-lab</Link>
        <div className="gallery-nav-links">
          <Link to="/components" className="gallery-nav-link">components</Link>
          <Link to="/apps" className="gallery-nav-link">apps</Link>
          <Link to="/test" className="gallery-nav-link active">test</Link>
        </div>
      </nav>

      <header className="gallery-header">
        <h1 className="gallery-title">Test</h1>
        <p className="gallery-subtitle">Verify your Rive integration against the XState contract</p>
      </header>

      <div className="gallery-grid">
        {tests.map((r) => (
          <Link
            key={r.key}
            to="/test/$testKey"
            params={{ testKey: r.key }}
            className="gallery-card"
            data-testid={`gallery-card-${r.key}`}
          >
            <div className="gallery-card-header">
              <span className="gallery-card-name">{r.name}</span>
              <span className={`gallery-card-badge gallery-card-badge--${r.status}`}>
                {r.status}
              </span>
            </div>
            <div className="gallery-card-stats">
              <span className="gallery-card-stat">
                <span className="gallery-card-stat-value">{r.bindings}</span> bindings
              </span>
              <span className="gallery-card-stat">
                <span className="gallery-card-stat-value">{r.states}</span> states
              </span>
              <span className="gallery-card-stat">
                <span className="gallery-card-stat-value">{r.triggers}</span> triggers
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
