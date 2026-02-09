import React, { useEffect, useState } from 'react';

const s = {
  body: {
    fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', monospace",
    background: '#0d1117',
    color: '#c9d1d9',
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '2rem',
  },
  container: { width: '600px', maxWidth: '100%', padding: '2rem' },
  constellation: {
    color: '#58a6ff',
    whiteSpace: 'pre' as const,
    fontSize: '0.85rem',
    lineHeight: 1.4,
    textAlign: 'center' as const,
    marginBottom: '1rem',
  },
  starBright: { color: '#ffd700' },
  starCool: { color: '#58a6ff' },
  star: { color: '#f0883e' },
  title: { textAlign: 'center' as const, marginBottom: '0.25rem' },
  h1: { color: '#c9d1d9', fontSize: '1.1rem', fontWeight: 'normal' as const },
  statusLine: {
    textAlign: 'center' as const,
    fontSize: '0.85rem',
    marginBottom: '1.5rem',
    color: '#7ee787',
  },
  section: {
    border: '1px solid #30363d',
    padding: '1rem',
    marginBottom: '1rem',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#8b949e',
    fontSize: '0.7rem',
    letterSpacing: '0.15em',
    marginBottom: '0.75rem',
    borderBottom: '1px solid #30363d',
    paddingBottom: '0.5rem',
  },
  headerArt: {
    fontSize: '0.75rem',
    letterSpacing: '0.3em',
  },
  dim: { color: '#8b949e' },
  list: { listStyle: 'none' as const, padding: 0, margin: 0, minHeight: '5.5rem' },
  listItem: { color: '#c9d1d9', margin: '0.3rem 0', fontSize: '0.85rem', lineHeight: 1.4 },
  navItem: { margin: '0.3rem 0', fontSize: '0.85rem' },
  cmd: { color: '#7ee787' },
  desc: { color: '#8b949e' },
  nextWaypoint: {
    border: '1px solid #f0883e',
    padding: '1rem',
    marginBottom: '1rem',
    textAlign: 'center' as const,
  },
  nextHeader: {
    color: '#f0883e',
    fontSize: '0.7rem',
    letterSpacing: '0.15em',
    marginBottom: '0.5rem',
  },
  nextCode: { color: '#7ee787', fontSize: '0.85rem' },
  nextHint: { color: '#8b949e', fontSize: '0.75rem', marginTop: '0.5rem' },
  wave: { color: '#58a6ff' },
  pitch: { color: '#8b949e', fontSize: '0.75rem', marginLeft: '1rem' },
  themeCycle: {
    textAlign: 'center' as const,
    marginTop: '0.75rem',
    fontSize: '0.7rem',
    color: '#6e7681',
    cursor: 'pointer',
    transition: 'color 0.2s',
  },
  arrow: { color: '#58a6ff' },
};

const themes = [
  {
    name: 'rising-stars',
    nextHint: 'drift toward hidden nebulae',
    constellations: [
      { title: 'AI Content Repurposing Engine', pitch: 'Transform one blog post into platform-ready social posts and newsletters automatically' },
      { title: 'Subscription Payment Recovery', pitch: 'Detect failed payments and recover lost revenue with smart retry sequences' },
      { title: 'AI Meeting Action Extractor', pitch: 'Transcribe meetings and assign action items to the right team members instantly' },
    ],
    uncharted: [
      { title: 'Podcast-to-Storefront Pipeline', pitch: 'Turn podcast episodes into shoppable product pages with auto-extracted mentions' },
      { title: 'Creator Testimonial Vault', pitch: 'Collect, verify, and embed customer testimonials with one shareable link' },
      { title: 'Freelancer Income Smoother', pitch: 'Forecast irregular freelance income and auto-allocate funds across tax and savings buckets' },
    ]
  },
  {
    name: 'hidden-nebulae',
    nextHint: 'chart distant galaxies',
    constellations: [
      { title: 'Solo Therapist Billing Hub', pitch: 'HIPAA-compliant scheduling, session notes, and Stripe billing in one dashboard' },
      { title: 'Contractor Bid Tracker', pitch: 'Manage construction bid bonds, renewal dates, and compliance docs in one place' },
      { title: 'Vendor Subscription Optimizer', pitch: 'Scan team accounts, flag duplicate subscriptions, and reclaim unused licenses' },
    ],
    uncharted: [
      { title: 'Interior Designer Approval Portal', pitch: 'Clients review mood boards, approve budgets, and sign off on materials in-app' },
      { title: 'Automated SOP Generator', pitch: 'Watch team workflows via screen recordings and produce step-by-step procedures' },
      { title: 'Wedding Planner Inventory Ledger', pitch: 'Catalog decor assets, track usage per event, and flag items needing replacement' },
    ]
  },
  {
    name: 'distant-galaxies',
    nextHint: 'return to rising stars',
    constellations: [
      { title: 'Eldercare Coordination Hub', pitch: 'Sync medications, appointments, and caregiver notes across an entire family' },
      { title: 'Subcontractor Payment Tracker', pitch: 'Real-time dashboards showing payment status and lien waiver compliance for trades' },
      { title: 'Small Landlord Property Manager', pitch: 'Automate rent collection, expense receipt scanning, and maintenance requests' },
    ],
    uncharted: [
      { title: 'Catering Capacity Planner', pitch: 'Dynamic pricing and kitchen load forecasting for restaurants adding catering' },
      { title: 'Field Service Route Optimizer', pitch: 'AI-adjusted daily routes for technicians based on traffic, job type, and parts' },
      { title: 'Retail Channel Inventory Sync', pitch: 'Keep stock counts accurate in real time across Shopify, Amazon, and POS systems' },
    ]
  }
];

export default function App() {
  const [themeIndex, setThemeIndex] = useState(0);
  const theme = themes[themeIndex];

  useEffect(() => {
    (window as any).appState = {
      view: 'welcome',
      initialized: true
    };
  }, []);

  return (
    <div style={s.body}>
      <div style={s.container}>
        <style>{`
          html, body { margin: 0; padding: 0; background: #0d1117; }
          @keyframes warm-pulse {
            0%, 100% { color: #ffd700; }
            25% { color: #f0883e; }
            50% { color: #ff6b6b; }
            75% { color: #ffd700; }
          }
          @keyframes cool-shift {
            0%, 100% { color: #58a6ff; }
            25% { color: #bc8cff; }
            50% { color: #79c0ff; }
            75% { color: #d2a8ff; }
          }
          .constellation-art {
            background: linear-gradient(135deg, #58a6ff, #7ee787, #58a6ff);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .constellation-art .star-icon {
            -webkit-text-fill-color: #f0883e;
          }
          .constellation-art .star-bright-icon {
            -webkit-text-fill-color: initial;
            animation: warm-pulse 2s infinite;
          }
          .constellation-art .star-cool-icon {
            -webkit-text-fill-color: initial;
            animation: cool-shift 1.5s infinite;
          }
        `}</style>
        <pre style={s.constellation} className="constellation-art">
{`            `}<span style={s.starBright} className="star-bright-icon">★</span>{`
       TRUE NORTH
            │
    ┌───────┼───────┐
    `}<span style={s.starCool} className="star-cool-icon">☆</span>{`       `}<span style={s.starCool} className="star-cool-icon">☆</span>{`       `}<span style={s.starCool} className="star-cool-icon">☆</span>{`
guardrails cli-first e2e-truth`}
        </pre>

        <div style={s.title}>
          <h1 style={s.h1}>Welcome to rive-playbook-guidelines</h1>
        </div>
        <p style={s.statusLine}>☆ Kickstarted <span style={s.dim}>— scaffold complete, ready to navigate</span></p>

        <div style={s.section}>
          <div style={s.sectionHeader}>
            <span>── CONSTELLATIONS ──</span>
            <span style={s.headerArt}><span style={s.star}>✦</span> · <span style={s.star}>☆</span> · <span style={s.star}>✦</span></span>
          </div>
          <ul style={s.list}>
            {theme.constellations.map((item, i) => (
              <li key={i} style={s.listItem}>
                <span style={s.star}>✦</span> {item.title}<br/>
                <span style={s.pitch}>↳ {item.pitch}</span>
              </li>
            ))}
          </ul>
        </div>

        <div style={s.section}>
          <div style={s.sectionHeader}>
            <span>── UNCHARTED ──</span>
            <span style={s.headerArt}><span style={s.wave}>~</span> <span style={s.wave}>≈</span> <span style={s.wave}>~</span> <span style={s.wave}>≈</span></span>
          </div>
          <ul style={s.list}>
            {theme.uncharted.map((item, i) => (
              <li key={i} style={s.listItem}>
                <span style={s.star}>✦</span> {item.title}<br/>
                <span style={s.pitch}>↳ {item.pitch}</span>
              </li>
            ))}
          </ul>
        </div>

        <div style={s.section}>
          <div style={s.sectionHeader}>
            <span>── NAVIGATION ──</span>
            <span style={s.headerArt}><span style={s.star}>☆</span></span>
          </div>
          <ul style={s.list}>
            <li style={s.navItem}><span style={s.cmd}>/ux-planner</span>   <span style={s.desc}>— chart your first feature</span></li>
            <li style={s.navItem}><span style={s.cmd}>/create-task</span>  <span style={s.desc}>— build with tests baked in</span></li>
            <li style={s.navItem}><span style={s.cmd}>/research</span>     <span style={s.desc}>— evaluate tech for your stack</span></li>
            <li style={s.navItem}><span style={s.cmd}>/coding-guard</span> <span style={s.desc}>— check for anti-patterns</span></li>
            <li style={s.navItem}><span style={s.cmd}>/e2e</span>          <span style={s.desc}>— prove it works end-to-end</span></li>
          </ul>
        </div>

        <div style={s.nextWaypoint}>
          <div style={s.nextHeader}>★ NEXT WAYPOINT</div>
          <code style={s.nextCode}>/ux-planner "I want to build [your idea]"</code>
          <p style={s.nextHint}>chart your course before you build</p>
        </div>
        <p style={s.themeCycle} onClick={() => setThemeIndex((themeIndex + 1) % themes.length)}>
          <span>{theme.nextHint}</span> <span style={s.arrow}>→</span>
        </p>

        {/* Debug container for tests */}
        <div id="app-debug" style={{ display: 'none' }}>
          <pre id="debug-state"></pre>
          <div id="debug-log"></div>
        </div>
      </div>
    </div>
  );
}
