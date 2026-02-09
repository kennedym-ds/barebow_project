import { useState, useMemo } from 'react';
import Plot from 'react-plotly.js';
import { useAnalyticsSummary, useAnalyticsShots, usePersonalBests } from '../../api/analytics';
import type { SessionSummaryStats, ShotDetailRecord } from '../../api/analytics';
import './Analytics.css';

export default function Analytics() {
  const [activeTab, setActiveTab] = useState<'performance' | 'volume' | 'arrows' | 'heatmap'>('performance');
  const [selectedRounds, setSelectedRounds] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  // Heatmap options
  const [showDensity, setShowDensity] = useState(true);
  const [excludeFliers, setExcludeFliers] = useState(false);
  const [colorBy, setColorBy] = useState<'uniform' | 'arrow' | 'end'>('uniform');

  const { data: summaryData, isLoading: summaryLoading } = useAnalyticsSummary(
    selectedRounds.length > 0 ? selectedRounds : undefined,
    fromDate || undefined,
    toDate || undefined
  );

  const { data: shotsData, isLoading: shotsLoading } = useAnalyticsShots(
    selectedRounds.length > 0 ? selectedRounds : undefined,
    fromDate || undefined,
    toDate || undefined
  );

  const { data: personalBests } = usePersonalBests();

  // Get unique round types for filter
  const availableRounds = useMemo(() => {
    if (!summaryData) return [];
    return Array.from(new Set(summaryData.map(s => s.round_type)));
  }, [summaryData]);

  // Handle round selection
  const handleRoundToggle = (round: string) => {
    setSelectedRounds(prev =>
      prev.includes(round) ? prev.filter(r => r !== round) : [...prev, round]
    );
  };

  // Top-level stats
  const stats = useMemo(() => {
    if (!summaryData) return null;
    const totalSessions = summaryData.length;
    const totalArrows = summaryData.reduce((sum, s) => sum + s.shot_count, 0);
    const avgScore = summaryData.length > 0
      ? summaryData.reduce((sum, s) => sum + s.avg_score, 0) / summaryData.length
      : 0;
    const bestSession = summaryData.length > 0
      ? summaryData.reduce((best, s) => (s.total_score > best.total_score ? s : best))
      : null;

    return { totalSessions, totalArrows, avgScore, bestSession };
  }, [summaryData]);

  if (summaryLoading) {
    return <div className="analytics-page">Loading analytics data...</div>;
  }

  if (!summaryData || summaryData.length === 0) {
    return (
      <div className="analytics-page">
        <h1>📈 Long-term Progression</h1>
        <div className="empty-state">
          <p>No session data found.</p>
          <p>Go to the <strong>Session Logger</strong> to record some shooting!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <h1>📈 Long-term Progression</h1>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Round Types:</label>
          <div className="round-checkboxes">
            {availableRounds.map(round => (
              <label key={round} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedRounds.length === 0 || selectedRounds.includes(round)}
                  onChange={() => handleRoundToggle(round)}
                />
                {round}
              </label>
            ))}
          </div>
        </div>
        
        <div className="filter-group">
          <label>Date Range:</label>
          <div className="date-inputs">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              placeholder="From"
            />
            <span>to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              placeholder="To"
            />
          </div>
        </div>
      </div>

      {/* Top Stats */}
      {stats && (
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-label">Total Sessions</div>
            <div className="stat-value">{stats.totalSessions}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Arrows</div>
            <div className="stat-value">{stats.totalArrows}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg Score</div>
            <div className="stat-value">{stats.avgScore.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Best Round</div>
            <div className="stat-value">
              {stats.bestSession ? `${stats.bestSession.total_score} (${stats.bestSession.round_type})` : 'N/A'}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button
          className={activeTab === 'performance' ? 'active' : ''}
          onClick={() => setActiveTab('performance')}
        >
          🏆 Performance
        </button>
        <button
          className={activeTab === 'volume' ? 'active' : ''}
          onClick={() => setActiveTab('volume')}
        >
          📊 Volume & Trends
        </button>
        <button
          className={activeTab === 'arrows' ? 'active' : ''}
          onClick={() => setActiveTab('arrows')}
        >
          🏹 Arrow Analysis
        </button>
        <button
          className={activeTab === 'heatmap' ? 'active' : ''}
          onClick={() => setActiveTab('heatmap')}
        >
          🔥 Heatmap
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'performance' && (
          <PerformanceTab summaryData={summaryData} personalBests={personalBests} />
        )}
        {activeTab === 'volume' && (
          <VolumeTab summaryData={summaryData} />
        )}
        {activeTab === 'arrows' && (
          <ArrowAnalysisTab shotsData={shotsData} isLoading={shotsLoading} />
        )}
        {activeTab === 'heatmap' && (
          <HeatmapTab
            shotsData={shotsData}
            isLoading={shotsLoading}
            showDensity={showDensity}
            setShowDensity={setShowDensity}
            excludeFliers={excludeFliers}
            setExcludeFliers={setExcludeFliers}
            colorBy={colorBy}
            setColorBy={setColorBy}
          />
        )}
      </div>
    </div>
  );
}

// ─── Performance Tab ─────────────────────────────────────

function PerformanceTab({ summaryData, personalBests }: {
  summaryData: SessionSummaryStats[];
  personalBests?: any[];
}) {
  const sortedData = [...summaryData].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="performance-tab">
      <h2>Personal Bests</h2>
      {personalBests && personalBests.length > 0 ? (
        <table className="pb-table">
          <thead>
            <tr>
              <th>Round</th>
              <th>Total Score</th>
              <th>Avg Score</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {personalBests
              .sort((a, b) => b.total_score - a.total_score)
              .map((pb, idx) => (
                <tr key={idx}>
                  <td>{pb.round_type}</td>
                  <td><strong>{pb.total_score}</strong></td>
                  <td>{pb.avg_score.toFixed(2)}</td>
                  <td>{new Date(pb.date).toLocaleDateString()}</td>
                </tr>
              ))}
          </tbody>
        </table>
      ) : (
        <p>No personal bests found.</p>
      )}

      <h2>Score Progression</h2>
      <Plot
        data={Array.from(new Set(sortedData.map(s => s.round_type))).map(round => ({
          x: sortedData.filter(s => s.round_type === round).map(s => s.date),
          y: sortedData.filter(s => s.round_type === round).map(s => s.avg_score),
          type: 'scatter',
          mode: 'lines+markers',
          name: round,
        }))}
        layout={{
          title: 'Average Arrow Score over Time',
          xaxis: { title: 'Date' },
          yaxis: { title: 'Average Score' },
          margin: { l: 50, r: 20, t: 50, b: 50 },
          height: 400,
        }}
        useResizeHandler
        style={{ width: '100%' }}
      />
    </div>
  );
}

// ─── Volume & Trends Tab ─────────────────────────────────

function VolumeTab({ summaryData }: { summaryData: SessionSummaryStats[] }) {
  const sortedData = [...summaryData].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Weekly volume calculation
  const weeklyVolume = useMemo(() => {
    const weekMap = new Map<string, number>();
    sortedData.forEach(s => {
      const date = new Date(s.date);
      const weekKey = `${date.getFullYear()}-W${String(getISOWeek(date)).padStart(2, '0')}`;
      weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + s.shot_count);
    });
    return Array.from(weekMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [sortedData]);

  return (
    <div className="volume-tab">
      <h2>Precision & Dispersion</h2>
      <p className="info-text">
        Analyze the <strong>quality</strong> of your grouping beyond just the score.
      </p>

      <h3>Circular Error Probable (CEP 50)</h3>
      <p className="caption">The radius (cm) that contains your best 50% of shots. Smaller is better.</p>
      <Plot
        data={Array.from(new Set(sortedData.map(s => s.round_type))).map(round => ({
          x: sortedData.filter(s => s.round_type === round).map(s => s.date),
          y: sortedData.filter(s => s.round_type === round).map(s => s.cep_50),
          type: 'scatter',
          mode: 'lines+markers',
          name: round,
        }))}
        layout={{
          xaxis: { title: 'Date' },
          yaxis: { title: 'CEP 50 (cm)', autorange: 'reversed' },
          margin: { l: 50, r: 20, t: 30, b: 50 },
          height: 400,
        }}
        useResizeHandler
        style={{ width: '100%' }}
      />

      <h3>Horizontal vs Vertical Spread</h3>
      <p className="caption">
        Compare your lateral (Windage) error vs height (Elevation) error. Helps diagnose form issues.
      </p>
      <Plot
        data={[
          {
            x: sortedData.map(s => s.date),
            y: sortedData.map(s => s.sigma_x),
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Sigma X (Horizontal)',
          },
          {
            x: sortedData.map(s => s.date),
            y: sortedData.map(s => s.sigma_y),
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Sigma Y (Vertical)',
          },
        ]}
        layout={{
          xaxis: { title: 'Date' },
          yaxis: { title: 'Spread (StdDev cm)' },
          margin: { l: 50, r: 20, t: 30, b: 50 },
          height: 400,
        }}
        useResizeHandler
        style={{ width: '100%' }}
      />

      <div className="interpretation-box">
        <strong>Interpretation:</strong>
        <ul>
          <li><strong>High Sigma X (Horizontal):</strong> Plunger tension, release errors, or canting.</li>
          <li><strong>High Sigma Y (Vertical):</strong> Nocking point, grip pressure, or inconsistent draw length.</li>
        </ul>
      </div>

      <hr />
      
      <h2>Training Volume</h2>
      <Plot
        data={[{
          x: weeklyVolume.map(([week]) => week),
          y: weeklyVolume.map(([, count]) => count),
          type: 'bar',
          marker: { color: '#2196F3' },
        }]}
        layout={{
          title: 'Arrows Shot per Week',
          xaxis: { title: 'Week' },
          yaxis: { title: 'Shot Count' },
          margin: { l: 50, r: 20, t: 50, b: 50 },
          height: 400,
        }}
        useResizeHandler
        style={{ width: '100%' }}
      />
    </div>
  );
}

// ─── Arrow Analysis Tab ──────────────────────────────────

function ArrowAnalysisTab({ shotsData, isLoading }: {
  shotsData?: ShotDetailRecord[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return <div>Loading shot data...</div>;
  }

  if (!shotsData || shotsData.length === 0) {
    return <div>No shot data available.</div>;
  }

  // Filter out shots without arrow numbers
  const numberedShots = shotsData.filter(s => s.arrow_number !== null);

  if (numberedShots.length === 0) {
    return (
      <div className="arrow-analysis-tab">
        <p>No arrow numbers recorded. Make sure to select specific arrows in the Session Logger.</p>
      </div>
    );
  }

  // Group by arrow number
  const arrowGroups = new Map<number, number[]>();
  numberedShots.forEach(s => {
    if (s.arrow_number !== null) {
      if (!arrowGroups.has(s.arrow_number)) {
        arrowGroups.set(s.arrow_number, []);
      }
      arrowGroups.get(s.arrow_number)!.push(s.score);
    }
  });

  const sortedArrows = Array.from(arrowGroups.keys()).sort((a, b) => a - b);

  // Calculate summary stats
  const summaryData = sortedArrows.map(num => {
    const scores = arrowGroups.get(num)!;
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    return {
      arrow: num,
      count: scores.length,
      mean: mean.toFixed(2),
      stdDev: stdDev.toFixed(2),
    };
  });

  return (
    <div className="arrow-analysis-tab">
      <h2>Arrow Consistency Analysis</h2>
      <p>Identify 'rogue' arrows that consistently score lower than your average.</p>

      <h3>Score Distribution by Arrow Number</h3>
      <Plot
        data={sortedArrows.map(num => ({
          y: arrowGroups.get(num),
          type: 'box',
          name: `#${num}`,
        }))}
        layout={{
          xaxis: { title: 'Arrow Number' },
          yaxis: { title: 'Score' },
          margin: { l: 50, r: 20, t: 30, b: 50 },
          height: 400,
        }}
        useResizeHandler
        style={{ width: '100%' }}
      />

      <h3>Summary Statistics</h3>
      <table className="summary-table">
        <thead>
          <tr>
            <th>Arrow #</th>
            <th>Shots</th>
            <th>Avg Score</th>
            <th>Consistency (StdDev)</th>
          </tr>
        </thead>
        <tbody>
          {summaryData
            .sort((a, b) => parseFloat(a.mean) - parseFloat(b.mean))
            .map((row) => (
              <tr key={row.arrow}>
                <td>#{row.arrow}</td>
                <td>{row.count}</td>
                <td>{row.mean}</td>
                <td>{row.stdDev}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Heatmap Tab ─────────────────────────────────────────

function HeatmapTab({
  shotsData,
  isLoading,
  showDensity,
  setShowDensity,
  excludeFliers,
  setExcludeFliers,
  colorBy,
  setColorBy,
}: {
  shotsData?: ShotDetailRecord[];
  isLoading: boolean;
  showDensity: boolean;
  setShowDensity: (val: boolean) => void;
  excludeFliers: boolean;
  setExcludeFliers: (val: boolean) => void;
  colorBy: 'uniform' | 'arrow' | 'end';
  setColorBy: (val: 'uniform' | 'arrow' | 'end') => void;
}) {
  if (isLoading) {
    return <div>Loading shot data...</div>;
  }

  if (!shotsData || shotsData.length === 0) {
    return <div>No shots found.</div>;
  }

  // Normalize coordinates
  const normalizedShots = shotsData.map(s => ({
    ...s,
    x_norm: s.x / (s.face_size / 2),
    y_norm: s.y / (s.face_size / 2),
  }));

  // Filter fliers if requested
  let displayShots = normalizedShots;
  let fliers: typeof normalizedShots = [];

  if (excludeFliers) {
    const mu_x = normalizedShots.reduce((sum, s) => sum + s.x_norm, 0) / normalizedShots.length;
    const mu_y = normalizedShots.reduce((sum, s) => sum + s.y_norm, 0) / normalizedShots.length;
    
    const distances = normalizedShots.map(s => 
      Math.sqrt(Math.pow(s.x_norm - mu_x, 2) + Math.pow(s.y_norm - mu_y, 2))
    );
    const sigma_r = Math.sqrt(
      distances.reduce((sum, d) => sum + Math.pow(d - distances.reduce((a, b) => a + b) / distances.length, 2), 0) / distances.length
    );
    const threshold = 2 * sigma_r;

    displayShots = normalizedShots.filter((s, i) => distances[i] <= threshold);
    fliers = normalizedShots.filter((s, i) => distances[i] > threshold);
  }

  // Calculate center from display shots
  const mean_x = displayShots.reduce((sum, s) => sum + s.x_norm, 0) / displayShots.length;
  const mean_y = displayShots.reduce((sum, s) => sum + s.y_norm, 0) / displayShots.length;

  // Build plot traces
  const traces: any[] = [];

  // Density heatmap
  if (showDensity) {
    traces.push({
      x: normalizedShots.map(s => s.x_norm),
      y: normalizedShots.map(s => s.y_norm),
      type: 'histogram2dcontour',
      colorscale: 'Hot',
      reversescale: true,
      ncontours: 20,
      showscale: false,
      opacity: 0.6,
    });
  }

  // Scatter shots
  if (colorBy === 'uniform') {
    traces.push({
      x: normalizedShots.map(s => s.x_norm),
      y: normalizedShots.map(s => s.y_norm),
      mode: 'markers',
      type: 'scatter',
      marker: { color: 'black', size: 5, opacity: 0.4 },
      name: 'Shots',
      hoverinfo: 'skip',
    });
  } else if (colorBy === 'arrow') {
    // Group by arrow number
    const arrowGroups = new Map<number, typeof normalizedShots>();
    normalizedShots.forEach(s => {
      if (s.arrow_number !== null) {
        if (!arrowGroups.has(s.arrow_number)) {
          arrowGroups.set(s.arrow_number, []);
        }
        arrowGroups.get(s.arrow_number)!.push(s);
      }
    });

    Array.from(arrowGroups.keys()).sort((a, b) => a - b).forEach(num => {
      const shots = arrowGroups.get(num)!;
      traces.push({
        x: shots.map(s => s.x_norm),
        y: shots.map(s => s.y_norm),
        mode: 'markers',
        type: 'scatter',
        marker: { size: 7, opacity: 0.8, line: { width: 1, color: 'white' } },
        name: `Arrow #${num}`,
      });
    });
  } else if (colorBy === 'end') {
    // Group by end number
    const endGroups = new Map<number, typeof normalizedShots>();
    normalizedShots.forEach(s => {
      if (!endGroups.has(s.end_number)) {
        endGroups.set(s.end_number, []);
      }
      endGroups.get(s.end_number)!.push(s);
    });

    Array.from(endGroups.keys()).sort((a, b) => a - b).forEach(num => {
      const shots = endGroups.get(num)!;
      traces.push({
        x: shots.map(s => s.x_norm),
        y: shots.map(s => s.y_norm),
        mode: 'markers',
        type: 'scatter',
        marker: { size: 7, opacity: 0.8, line: { width: 1, color: 'white' } },
        name: `End ${num}`,
      });
    });
  }

  // Group center
  traces.push({
    x: [mean_x],
    y: [mean_y],
    mode: 'markers',
    type: 'scatter',
    marker: { color: 'cyan', size: 15, symbol: 'cross', line: { color: 'black', width: 2 } },
    name: 'Group Center',
    hovertext: `Center: (${mean_x.toFixed(2)}, ${mean_y.toFixed(2)})`,
  });

  // Fliers (if any)
  if (fliers.length > 0) {
    traces.push({
      x: fliers.map(s => s.x_norm),
      y: fliers.map(s => s.y_norm),
      mode: 'markers',
      type: 'scatter',
      marker: { color: 'red', size: 8, symbol: 'x-open' },
      name: 'Fliers (Excluded)',
    });
  }

  return (
    <div className="heatmap-tab">
      <h2>Aggregate Heatmap</h2>
      <p>Visualizing all shots from the selected sessions (Normalized).</p>

      <div className="heatmap-options">
        <label>
          <input
            type="checkbox"
            checked={excludeFliers}
            onChange={(e) => setExcludeFliers(e.target.checked)}
          />
          Exclude Fliers (Outliers)
        </label>

        <label>
          <input
            type="checkbox"
            checked={showDensity}
            onChange={(e) => setShowDensity(e.target.checked)}
          />
          Show Density Heatmap
        </label>

        <label>
          Color Shots By:
          <select value={colorBy} onChange={(e) => setColorBy(e.target.value as any)}>
            <option value="uniform">Uniform (Black)</option>
            <option value="arrow">Arrow Number</option>
            <option value="end">End Number</option>
          </select>
        </label>
      </div>

      {excludeFliers && fliers.length > 0 && (
        <p className="caption">Excluded {fliers.length} fliers from center calculation.</p>
      )}

      <Plot
        data={traces}
        layout={{
          width: 600,
          height: 600,
          xaxis: { range: [-1.2, 1.2], showgrid: false, visible: false },
          yaxis: { range: [-1.2, 1.2], showgrid: false, scaleanchor: 'x', scaleratio: 1, visible: false },
          shapes: [
            {
              type: 'circle',
              xref: 'x',
              yref: 'y',
              x0: -1,
              y0: -1,
              x1: 1,
              y1: 1,
              line: { color: 'black' },
            },
            {
              type: 'circle',
              xref: 'x',
              yref: 'y',
              x0: -0.2,
              y0: -0.2,
              x1: 0.2,
              y1: 0.2,
              line: { color: 'gold' },
            },
          ],
          margin: { l: 0, r: 0, t: 0, b: 0 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
        }}
        useResizeHandler
        style={{ width: '100%', maxWidth: '600px' }}
      />
    </div>
  );
}

// Helper function to get ISO week number
function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
