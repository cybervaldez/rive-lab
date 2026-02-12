import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Homepage,
})

function Homepage() {
  return (
    <div className="homepage" data-testid="homepage">
      {/* Hero */}
      <section className="homepage-hero" data-testid="homepage-hero">
        <h1 className="homepage-title">rive-lab</h1>
        <p className="homepage-tagline">
          Build interactive animations<br />that AI can fully test.
        </p>
        <p className="homepage-subtitle">
          XState machines define the contract.<br />
          Rive designers follow it.
        </p>
        <nav className="homepage-ctas">
          <Link to="/components/progress-bar" className="cta-primary">
            Try the demo &rarr;
          </Link>
          <Link to="/components" className="cta-secondary">
            Browse all &rarr;
          </Link>
        </nav>
      </section>

      {/* Why */}
      <section className="homepage-section" data-testid="homepage-why">
        <h2 className="homepage-section-title">Why?</h2>
        <p className="homepage-section-text">
          Rive animations are beautiful but opaque to tests. XState machines are
          testable but invisible. <strong>rive-lab</strong> bridges the gap: the
          machine <em>is</em> the spec, carrying every ViewModel name, property
          type, and state the designer needs &mdash; embedded in the code itself.
        </p>
      </section>

      {/* The contract */}
      <section className="homepage-section" data-testid="homepage-contract">
        <h2 className="homepage-section-title">The contract</h2>
        <p className="homepage-section-text">
          Each XState concept maps directly to a Rive concept:
        </p>
        <table className="contract-table">
          <thead>
            <tr><th>XState</th><th>Rive</th></tr>
          </thead>
          <tbody>
            <tr><td>Context property</td><td>ViewModel property</td></tr>
            <tr><td>Event type</td><td>Trigger</td></tr>
            <tr><td>State node</td><td>State machine state</td></tr>
            <tr><td>actor.send()</td><td>vm.trigger()</td></tr>
            <tr><td>getSnapshot()</td><td>vm.property.value</td></tr>
          </tbody>
        </table>
      </section>

      {/* In the code */}
      <section className="homepage-section" data-testid="homepage-code">
        <h2 className="homepage-section-title">In the code</h2>
        <p className="homepage-section-text">
          Every machine carries a <code>meta</code> block that self-documents
          the contract:
        </p>
        <pre className="code-block">
{`meta: {
  riveViewModel: 'ProgressBarVM',
  contextProperties: {
    progress: { type: 'number', range: [0, 100] },
    isActive: { type: 'boolean' },
  }
}`}
        </pre>
      </section>

      {/* Explore */}
      <section className="homepage-section" data-testid="homepage-explore">
        <h2 className="homepage-section-title">Explore</h2>
        <div className="explore-grid">
          <Link to="/components" className="explore-card">
            <span className="explore-card-title">Components</span>
            <span className="explore-card-desc">Small, single-concern animations</span>
          </Link>
          <Link to="/apps" className="explore-card">
            <span className="explore-card-title">Apps</span>
            <span className="explore-card-desc">Full-screen, multi-region experiences</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
