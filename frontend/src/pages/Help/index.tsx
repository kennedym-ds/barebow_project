import './Help.css';

export default function Help() {
  return (
    <div className="help-page">
      <h1>❓ Help &amp; Guide</h1>

      <section className="help-section">
        <h2>About BareTrack</h2>
        <p>
          BareTrack is a dedicated analysis and management tool for <strong>barebow archers</strong>.
          It combines equipment profiling, session logging, precision analytics, and physics-based
          coaching into a single application — helping you understand your shooting, tune your setup,
          and track your progress over time.
        </p>
      </section>

      <section className="help-section">
        <h2>Getting Started</h2>
        <ol>
          <li><strong>Set up your equipment</strong> — go to <em>Equipment Profile</em> and add your bow, arrows, and tab.</li>
          <li><strong>Log a session</strong> — open <em>Session Logger</em>, choose your round, and tap arrows on the target face.</li>
          <li><strong>Review your history</strong> — visit <em>History</em> to replay ends, view scorecards, and export CSV data.</li>
          <li><strong>Analyse your shooting</strong> — use <em>Analysis Lab</em> and <em>Analytics</em> for deep precision and trend insights.</li>
        </ol>
      </section>

      <section className="help-section">
        <h2>Page Guide</h2>
        <div className="help-grid">
          <div className="help-card">
            <h3>🎯 Home</h3>
            <p>Your dashboard — quick stats, recent session summaries, and shortcut links to get started.</p>
          </div>
          <div className="help-card">
            <h3>🏹 Equipment Profile</h3>
            <p>
              Manage bow setups (riser, limbs, tiller, plunger), arrow setups (spine, weight, individual shaft data),
              and tab/string-walking setups. All equipment data feeds into the physics engine and analysis.
            </p>
          </div>
          <div className="help-card">
            <h3>📊 Analysis Lab</h3>
            <p>
              Advanced analysis hub. Run the <strong>Virtual Coach</strong> (James Park Model) to separate
              archer skill from equipment drag loss. Predict scores at any distance, check arrow performance
              by number, and set score goals with simulation.
            </p>
          </div>
          <div className="help-card">
            <h3>📝 Session Logger</h3>
            <p>
              Record a shooting session end-by-end. Tap the interactive target face to log shot placements.
              Supports WA and Flint faces, multiple round presets, and per-arrow tracking.
            </p>
          </div>
          <div className="help-card">
            <h3>📜 History</h3>
            <p>
              Browse all recorded sessions. View scorecards, shot heatmaps, replay ends arrow-by-arrow,
              and export session data as CSV for external analysis.
            </p>
          </div>
          <div className="help-card">
            <h3>📐 Crawl Manager</h3>
            <p>
              String-walking reference tool. Enter known crawl marks at measured distances and the polynomial
              regression model will predict marks for any distance. Includes a point-on distance calculator.
            </p>
          </div>
          <div className="help-card">
            <h3>📈 Analytics</h3>
            <p>
              Deep statistical dashboard — session trends, precision metrics (CEP50, DRMS, sigma),
              bias/grouping analysis, within-end fatigue detection, hit probability curves,
              equipment comparisons, and personal bests.
            </p>
          </div>
          <div className="help-card">
            <h3>🔧 Tuning Wizard</h3>
            <p>
              Step-by-step bow tuning guide. Walk through brace height, tiller, nocking point, plunger,
              and arrow spine checks with built-in recommendations based on your equipment profile.
            </p>
          </div>
        </div>
      </section>

      <section className="help-section">
        <h2>Key Concepts</h2>
        <dl className="help-definitions">
          <dt>James Park Model</dt>
          <dd>
            A physics model that separates archer angular error (sigma) from arrow drag loss by comparing
            scores at two different distances. Used by the Virtual Coach to give actionable recommendations.
          </dd>
          <dt>CEP50 / DRMS</dt>
          <dd>
            Circular Error Probable (50%) and Distance Root Mean Square — precision metrics that describe
            how tightly your arrows group. Lower values mean better consistency.
          </dd>
          <dt>GPP (Grains Per Pound)</dt>
          <dd>
            Total arrow weight divided by bow draw weight. Below 7 GPP is a safety concern.
            Higher GPP means more momentum and penetration.
          </dd>
          <dt>FOC (Front of Center)</dt>
          <dd>
            How far forward the arrow's balance point sits. Higher FOC improves flight stability.
            Barebow archers typically want 10–15%.
          </dd>
          <dt>String Walking / Crawl</dt>
          <dd>
            A barebow aiming technique where the archer moves their tab hand down the string
            to change the effective sight picture. Crawl marks are the measured distances on the string.
          </dd>
        </dl>
      </section>

      <section className="help-section contact-section">
        <h2>Contact &amp; Support</h2>
        <p>Have questions, feedback, or found a bug? Get in touch:</p>
        <div className="contact-links">
          <a href="mailto:michael.patrick.kennedy@outlook.ie" className="contact-link">
            <span className="contact-icon">📧</span>
            <span>michael.patrick.kennedy@outlook.ie</span>
          </a>
          <a href="https://github.com/kennedym-ds/barebow_project" target="_blank" rel="noopener noreferrer" className="contact-link">
            <span className="contact-icon">🐙</span>
            <span>github.com/kennedym-ds/barebow_project</span>
          </a>
        </div>
      </section>
    </div>
  );
}
