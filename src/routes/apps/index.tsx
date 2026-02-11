import { createFileRoute, Link } from '@tanstack/react-router'
import { getApps } from '../../lib/recipes'

export const Route = createFileRoute('/apps/')({
  component: AppGallery,
})

function AppGallery() {
  const apps = getApps()

  return (
    <div className="gallery-page">
      <nav className="gallery-nav">
        <Link to="/" className="gallery-nav-brand">rive-lab</Link>
        <div className="gallery-nav-links">
          <Link to="/components" className="gallery-nav-link">components</Link>
          <Link to="/apps" className="gallery-nav-link active">apps</Link>
        </div>
      </nav>

      <header className="gallery-header">
        <h1 className="gallery-title">Apps</h1>
        <p className="gallery-subtitle">Full-screen, multi-region Rive experiences</p>
      </header>

      <div className="gallery-grid">
        {apps.map((r) => (
          <Link
            key={r.key}
            to="/apps/$appKey"
            params={{ appKey: r.key }}
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
