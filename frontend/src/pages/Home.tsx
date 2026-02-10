import { useDashboard } from '../api/analytics';
import { Link } from 'react-router-dom';
import './Home.css';

export default function Home() {
  const { data: stats, isLoading } = useDashboard();

  if (isLoading) {
    return <div className="dashboard">Loading dashboard...</div>;
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const empty = !stats || stats.total_sessions === 0;

  return (
    <div className="dashboard">
      <h1>BareTrack</h1>

      {empty ? (
        <div className="empty-dashboard">
          <h2>Welcome!</h2>
          <p>Get started by setting up your equipment and shooting your first session.</p>
          <div className="quick-links">
            <Link to="/equipment" className="quick-link">Set Up Equipment</Link>
            <Link to="/session" className="quick-link">Log First Session</Link>
          </div>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="stat-grid">
            <div className="stat-card accent">
              <div className="stat-value">{stats!.last_session_score ?? '—'}</div>
              <div className="stat-label">Last Score</div>
              <div className="stat-sub">{stats!.last_session_round} &middot; {formatDate(stats!.last_session_date)}</div>
            </div>

            <div className="stat-card">
              <div className="stat-value">{stats!.personal_best_score ?? '—'}</div>
              <div className="stat-label">Personal Best</div>
              <div className="stat-sub">{stats!.personal_best_round} &middot; {formatDate(stats!.personal_best_date)}</div>
            </div>

            <div className="stat-card">
              <div className="stat-value">{stats!.rolling_avg_score !== null ? stats!.rolling_avg_score.toFixed(2) : '—'}</div>
              <div className="stat-label">Avg Arrow (EWMA)</div>
              <div className="stat-sub">Rolling 10-session average</div>
            </div>

            <div className="stat-card">
              <div className="stat-value">{stats!.total_sessions}</div>
              <div className="stat-label">Sessions</div>
              <div className="stat-sub">{stats!.total_arrows.toLocaleString()} arrows shot</div>
            </div>

            <div className="stat-card">
              <div className="stat-value">{stats!.days_since_last_practice ?? '—'}</div>
              <div className="stat-label">Days Since Practice</div>
              <div className="stat-sub">{stats!.days_since_last_practice === 0 ? 'Shot today!' : stats!.days_since_last_practice === 1 ? 'Yesterday' : ''}</div>
            </div>
          </div>

          {/* Sparkline */}
          {stats!.sparkline_scores.length > 1 && (
            <div className="sparkline-card">
              <h3>Score Trend</h3>
              <Sparkline dates={stats!.sparkline_dates} scores={stats!.sparkline_scores} />
            </div>
          )}

          {/* Quick Links */}
          <div className="quick-links">
            <Link to="/session" className="quick-link primary">New Session</Link>
            <Link to="/analytics" className="quick-link">Analytics</Link>
            <Link to="/analysis" className="quick-link">Analysis Lab</Link>
            <Link to="/crawls" className="quick-link">Crawl Manager</Link>
          </div>
        </>
      )}
    </div>
  );
}

/* Minimal SVG sparkline */
function Sparkline({ dates, scores }: { dates: string[]; scores: number[] }) {
  const w = 600;
  const h = 120;
  const pad = 24;

  const min = Math.min(...scores) - 0.2;
  const max = Math.max(...scores) + 0.2;

  const pts = scores.map((s, i) => {
    const x = pad + (i / (scores.length - 1)) * (w - 2 * pad);
    const y = h - pad - ((s - min) / (max - min)) * (h - 2 * pad);
    return { x, y, score: s, date: dates[i] };
  });

  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="sparkline-svg">
      {/* Grid lines */}
      {[min, (min + max) / 2, max].map((v, i) => {
        const y = h - pad - ((v - min) / (max - min)) * (h - 2 * pad);
        return (
          <g key={i}>
            <line x1={pad} y1={y} x2={w - pad} y2={y} stroke="#e0e0e0" strokeWidth="1" />
            <text x={pad - 4} y={y + 4} textAnchor="end" fontSize="10" fill="#999">{v.toFixed(1)}</text>
          </g>
        );
      })}
      {/* Line */}
      <path d={line} fill="none" stroke="#007bff" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Dots */}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#007bff" />
          <title>{new Date(p.date).toLocaleDateString()}: {p.score.toFixed(2)}</title>
        </g>
      ))}
    </svg>
  );
}
