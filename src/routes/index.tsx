import { createFileRoute, Link } from '@tanstack/react-router'
import { getComponents, getApps } from '../lib/recipes'

export const Route = createFileRoute('/')({
  component: Homepage,
})

function Homepage() {
  const components = getComponents()
  const apps = getApps()

  return (
    <div className="homepage" data-testid="homepage">
      {/* Hero */}
      <section className="homepage-hero" data-testid="homepage-hero">
        <h1 className="homepage-title">rive-lab</h1>
        <p className="homepage-tagline">
          XState as a living spec for Rive animations
        </p>
        <nav className="homepage-hero-nav">
          <Link to="/components" className="homepage-hero-link">
            components <span className="homepage-hero-count">{components.length}</span>
          </Link>
          <Link to="/apps" className="homepage-hero-link">
            apps <span className="homepage-hero-count">{apps.length}</span>
          </Link>
        </nav>
      </section>

      {/* What is rive-lab */}
      <section className="homepage-section" data-testid="homepage-about">
        <h2 className="homepage-section-title">What is rive-lab?</h2>
        <p className="homepage-section-text">
          Every animation starts as an XState machine that <strong>self-documents</strong>.
          Each machine carries a <code>meta</code> block describing its context properties,
          ViewModel name, and state machine name — everything the Rive designer needs to
          know, embedded in the code itself.
        </p>
        <p className="homepage-section-text">
          States and transitions carry human-readable <code>description</code> fields
          that AI tools and designers can parse. Every state handles a
          universal <code>reset</code> event, so the wizard and pipeline can always
          return to a known starting point.
        </p>
        <p className="homepage-section-text">
          The machine <em>is</em> the spec. A Rive designer reads the meta, matches
          names exactly, and the swap is seamless — no separate handoff doc required.
        </p>
      </section>

      {/* Components */}
      <section className="homepage-section" data-testid="homepage-components">
        <h2 className="homepage-section-title">Components</h2>
        <p className="homepage-section-text">
          Small, single-concern animations — progress bars, toggles, counters.
          Each one maps a handful of XState bindings to a Rive artboard. Perfect
          for learning the contract pattern.
        </p>
        <Link to="/components" className="homepage-section-link">
          Browse {components.length} components &rarr;
        </Link>
      </section>

      {/* Apps */}
      <section className="homepage-section" data-testid="homepage-apps">
        <h2 className="homepage-section-title">Apps</h2>
        <p className="homepage-section-text">
          Full-screen, multi-region experiences — like a media player with parallel
          playback and volume state machines. Apps use XState&apos;s parallel regions
          mapped to Rive&apos;s layer system.
        </p>
        <Link to="/apps" className="homepage-section-link">
          Browse {apps.length} apps &rarr;
        </Link>
      </section>
    </div>
  )
}
