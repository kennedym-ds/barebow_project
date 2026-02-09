import { useState, useMemo } from 'react';
import Plot from 'react-plotly.js';
import { useAnalyticsSummary, useAnalyticsShots, usePersonalBests, useParkModel, useBiasAnalysis, useScoreContext, useRoundPresets, useAdvancedPrecision, useTrends, useWithinEnd, useHitProbability, useEquipmentComparison, useBows, useArrows } from '../../api/analytics';
import type { SessionSummaryStats, ShotDetailRecord, ParkModelAnalysis, BiasAnalysis, SessionScoreContext, RoundPreset, AdvancedPrecision, TrendAnalysis, WithinEndAnalysis, HitProbabilityAnalysis, EquipmentComparison, ConsistencyByRound } from '../../api/analytics';
import './Analytics.css';

export default function Analytics() {
  const [activeTab, setActiveTab] = useState<'performance' | 'volume' | 'arrows' | 'heatmap' | 'prediction' | 'bias' | 'precision' | 'trends' | 'equipment'>('performance');
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

  const { data: roundPresets } = useRoundPresets();
  const { data: biasData } = useBiasAnalysis(
    selectedRounds.length > 0 ? selectedRounds : undefined,
    fromDate || undefined,
    toDate || undefined
  );
  const { data: scoreContext } = useScoreContext(
    selectedRounds.length > 0 ? selectedRounds : undefined,
    fromDate || undefined,
    toDate || undefined
  );

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
            {stats.bestSession && (() => {
              const preset = roundPresets?.find(p => p.name.toLowerCase() === stats.bestSession!.round_type.toLowerCase());
              return preset ? (
                <div className="stat-sub">{((stats.bestSession!.total_score / preset.max_score) * 100).toFixed(1)}% of {preset.max_score}</div>
              ) : null;
            })()}
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
        <button
          className={activeTab === 'prediction' ? 'active' : ''}
          onClick={() => setActiveTab('prediction')}
        >
          🎯 Score Prediction
        </button>
        <button
          className={activeTab === 'bias' ? 'active' : ''}
          onClick={() => setActiveTab('bias')}
        >
          📐 Bias Analysis
        </button>
        <button
          className={activeTab === 'precision' ? 'active' : ''}
          onClick={() => setActiveTab('precision')}
        >
          🔬 Precision
        </button>
        <button
          className={activeTab === 'trends' ? 'active' : ''}
          onClick={() => setActiveTab('trends')}
        >
          📉 Trends
        </button>
        <button
          className={activeTab === 'equipment' ? 'active' : ''}
          onClick={() => setActiveTab('equipment')}
        >
          ⚙️ Equipment
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'performance' && (
          <PerformanceTab summaryData={summaryData} personalBests={personalBests} scoreContext={scoreContext} roundPresets={roundPresets} />
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
        {activeTab === 'prediction' && (
          <ScorePredictionTab
            fromDate={fromDate || undefined}
            toDate={toDate || undefined}
            roundPresets={roundPresets}
          />
        )}
        {activeTab === 'bias' && (
          <BiasAnalysisTab
            roundTypes={selectedRounds.length > 0 ? selectedRounds : undefined}
            fromDate={fromDate || undefined}
            toDate={toDate || undefined}
          />
        )}
        {activeTab === 'precision' && (
          <PrecisionTab
            roundTypes={selectedRounds.length > 0 ? selectedRounds : undefined}
            fromDate={fromDate || undefined}
            toDate={toDate || undefined}
          />
        )}
        {activeTab === 'trends' && (
          <TrendsTab
            roundTypes={selectedRounds.length > 0 ? selectedRounds : undefined}
            fromDate={fromDate || undefined}
            toDate={toDate || undefined}
          />
        )}
        {activeTab === 'equipment' && (
          <EquipmentTab
            fromDate={fromDate || undefined}
            toDate={toDate || undefined}
          />
        )}
      </div>
    </div>
  );
}

// ─── Performance Tab ─────────────────────────────────────

function PerformanceTab({ summaryData, personalBests, scoreContext, roundPresets }: {
  summaryData: SessionSummaryStats[];
  personalBests?: any[];
  scoreContext?: SessionScoreContext[];
  roundPresets?: RoundPreset[];
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
              <th>Score</th>
              <th>Arrows</th>
              <th>Max</th>
              <th>%</th>
              <th>Avg/Arrow</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {personalBests
              .sort((a, b) => b.total_score - a.total_score)
              .map((pb, idx) => {
                const preset = roundPresets?.find(p => p.name.toLowerCase() === pb.round_type.toLowerCase());
                const maxScore = preset ? preset.max_score : null;
                const pct = maxScore ? ((pb.total_score / maxScore) * 100).toFixed(1) : '—';
                return (
                  <tr key={idx}>
                    <td>{pb.round_type}</td>
                    <td><strong>{pb.total_score}</strong></td>
                    <td>{preset?.arrow_count ?? '—'}</td>
                    <td>{maxScore ?? '—'}</td>
                    <td>{pct}%</td>
                    <td>{pb.avg_score.toFixed(2)}</td>
                    <td>{new Date(pb.date).toLocaleDateString()}</td>
                  </tr>
                );
              })}
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
          type: 'scatter' as const,
          mode: 'lines+markers' as const,
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

      {scoreContext && scoreContext.length > 0 && (
        <>
          <h2>Score % of Maximum</h2>
          <p className="caption">How close you are to the maximum possible score for each round format.</p>
          <Plot
            data={Array.from(new Set(scoreContext.map(s => s.round_type))).map(round => {
              const roundData = [...scoreContext.filter(s => s.round_type === round)]
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
              return {
                x: roundData.map(s => s.date),
                y: roundData.map(s => s.score_percentage),
                type: 'scatter' as const,
                mode: 'lines+markers' as const,
                name: round,
                text: roundData.map(s => `${s.total_score}/${s.max_score} (${s.shot_count} arrows${s.round_complete ? '' : ' - incomplete'})`),
              };
            })}
            layout={{
              xaxis: { title: 'Date' },
              yaxis: { title: 'Score %', range: [0, 105] },
              margin: { l: 50, r: 20, t: 30, b: 50 },
              height: 400,
            }}
            useResizeHandler
            style={{ width: '100%' }}
          />
        </>
      )}

      {scoreContext && scoreContext.length > 0 && (
        <>
          <h2>Sigma (Group Size) Progression</h2>
          <p className="caption">Your angular precision over time. Lower σ = tighter groups = better skill.</p>
          <Plot
            data={Array.from(new Set(scoreContext.map(s => s.round_type))).map(round => {
              const roundData = [...scoreContext.filter(s => s.round_type === round)]
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
              return {
                x: roundData.map(s => s.date),
                y: roundData.map(s => s.sigma_cm),
                type: 'scatter' as const,
                mode: 'lines+markers' as const,
                name: round,
              };
            })}
            layout={{
              xaxis: { title: 'Date' },
              yaxis: { title: 'Sigma (cm)', autorange: 'reversed' },
              margin: { l: 50, r: 20, t: 30, b: 50 },
              height: 400,
            }}
            useResizeHandler
            style={{ width: '100%' }}
          />
        </>
      )}
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

// ─── Score Prediction Tab ────────────────────────────

function ScorePredictionTab({ 
  fromDate, toDate, roundPresets 
}: { 
  fromDate?: string; 
  toDate?: string;
  roundPresets?: RoundPreset[];
}) {
  const [shortRound, setShortRound] = useState('WA 18m');
  const [longRound, setLongRound] = useState('WA 50m');
  
  const { data: parkData, isLoading } = useParkModel(shortRound, longRound, fromDate, toDate);

  const roundOptions = roundPresets?.map(p => p.name) || ['WA 18m', 'WA 25m', 'WA 50m', 'Indoor Field', 'Flint'];

  if (isLoading) return <div>Analyzing...</div>;

  return (
    <div className="prediction-tab">
      <h2>Cross-Distance Score Prediction</h2>
      <p className="info-text">
        The <strong>James Park Model</strong> separates your <em>archer skill</em> (angular deviation) 
        from <em>equipment drag loss</em> by comparing scores at two distances.
      </p>

      <div className="prediction-selectors">
        <label>
          Short Distance Round:
          <select value={shortRound} onChange={e => setShortRound(e.target.value)}>
            {roundOptions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label>
          Long Distance Round:
          <select value={longRound} onChange={e => setLongRound(e.target.value)}>
            {roundOptions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
      </div>

      {parkData && parkData.short_session_count > 0 && parkData.long_session_count > 0 ? (
        <>
          {/* Skill Summary Cards */}
          <div className="stats-grid prediction-stats">
            <div className="stat-card">
              <span className="stat-label">Angular Deviation</span>
              <span className="stat-value">{parkData.sigma_theta_mrad.toFixed(2)} mrad</span>
              <span className="stat-sub">Your inherent archer precision</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">{parkData.short_round} σ</span>
              <span className="stat-value">{parkData.short_sigma_cm.toFixed(1)} cm</span>
              <span className="stat-sub">Group size at short distance</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">{parkData.long_round} σ</span>
              <span className="stat-value">{parkData.long_sigma_cm.toFixed(1)} cm</span>
              <span className="stat-sub">Group size at long distance</span>
            </div>
            <div className={`stat-card ${parkData.drag_loss_percent > 10 ? 'stat-warning' : parkData.drag_loss_percent > 5 ? 'stat-caution' : 'stat-good'}`}>
              <span className="stat-label">Drag Loss</span>
              <span className="stat-value">{parkData.drag_loss_percent.toFixed(1)}%</span>
              <span className="stat-sub">{parkData.drag_loss_points.toFixed(2)} pts/arrow lost</span>
            </div>
          </div>

          {/* Prediction Comparison */}
          <h3>Score Comparison</h3>
          <Plot
            data={[
              {
                x: [parkData.short_round, parkData.long_round],
                y: [parkData.short_avg_score, parkData.long_avg_score],
                type: 'bar',
                name: 'Actual Score',
                marker: { color: '#2196F3' },
                text: [parkData.short_avg_score.toFixed(2), parkData.long_avg_score.toFixed(2)],
                textposition: 'outside',
              },
              {
                x: [parkData.long_round],
                y: [parkData.predicted_long_score],
                type: 'bar',
                name: 'Predicted (skill only)',
                marker: { color: '#4CAF50', opacity: 0.7 },
                text: [parkData.predicted_long_score.toFixed(2)],
                textposition: 'outside',
              },
            ]}
            layout={{
              title: 'Actual vs Predicted Average Arrow Score',
              yaxis: { title: 'Avg Arrow Score', range: [0, 10.5] },
              barmode: 'group',
              margin: { l: 50, r: 20, t: 50, b: 50 },
              height: 400,
            }}
            useResizeHandler
            style={{ width: '100%' }}
          />

          <div className="interpretation-box">
            <strong>Interpretation:</strong>
            <ul>
              <li>Your angular precision is <strong>{parkData.sigma_theta_mrad.toFixed(2)} mrad</strong> — 
                this is constant across distances (your "archer skill").</li>
              <li>Based on your <strong>{parkData.short_round}</strong> performance ({parkData.short_avg_score.toFixed(2)} avg), 
                the model predicts <strong>{parkData.predicted_long_score.toFixed(2)}</strong> at {parkData.long_round}.</li>
              <li>Your actual {parkData.long_round} average is <strong>{parkData.long_avg_score.toFixed(2)}</strong>.</li>
              {parkData.drag_loss_percent > 5 ? (
                <li className="warning-text">
                  <strong>Drag Loss: {parkData.drag_loss_percent.toFixed(1)}%</strong> — 
                  {parkData.drag_loss_percent > 15 
                    ? 'Significant equipment/tuning losses. Consider lighter arrows, thinner shafts, or improved tuning.'
                    : parkData.drag_loss_percent > 10
                    ? 'Moderate drag loss. Check arrow weight and tuning for long distance.'
                    : 'Mild drag loss — typical for most setups.'}
                </li>
              ) : (
                <li className="good-text">
                  <strong>Excellent!</strong> Your drag loss is under 5% — your setup is well-tuned for distance.
                </li>
              )}
            </ul>
          </div>

          <p className="caption">
            Based on {parkData.short_session_count} {parkData.short_round} session(s) 
            and {parkData.long_session_count} {parkData.long_round} session(s).
          </p>
        </>
      ) : parkData ? (
        <div className="empty-state">
          <p>Need sessions at both distances to compute predictions.</p>
          <p>{parkData.short_round}: {parkData.short_session_count} session(s) | {parkData.long_round}: {parkData.long_session_count} session(s)</p>
        </div>
      ) : null}
    </div>
  );
}

// ─── Bias Analysis Tab ───────────────────────────────

function BiasAnalysisTab({
  roundTypes, fromDate, toDate
}: {
  roundTypes?: string[];
  fromDate?: string;
  toDate?: string;
}) {
  const { data: biasData, isLoading } = useBiasAnalysis(roundTypes, fromDate, toDate);

  if (isLoading) return <div>Analyzing shot patterns...</div>;
  if (!biasData || biasData.total_shots === 0) return <div className="empty-state">No shot data available for analysis.</div>;

  return (
    <div className="bias-tab">
      <h2>Shot Pattern Analysis</h2>
      <p className="info-text">
        Systematic patterns in your shooting that reveal form issues, equipment problems, or fatigue effects.
      </p>

      {/* MPI & Directional Bias */}
      <div className="stats-grid bias-stats">
        <div className="stat-card">
          <span className="stat-label">Mean Point of Impact</span>
          <span className="stat-value">{biasData.bias_direction}</span>
          <span className="stat-sub">{biasData.bias_magnitude_cm.toFixed(1)} cm from center</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">H/V Ratio</span>
          <span className="stat-value">{biasData.hv_ratio.toFixed(2)}</span>
          <span className="stat-sub">{biasData.hv_interpretation}</span>
        </div>
        <div className={`stat-card ${Math.abs(biasData.first_arrow_penalty) > 0.5 ? 'stat-warning' : 'stat-good'}`}>
          <span className="stat-label">First Arrow Effect</span>
          <span className="stat-value">{biasData.first_arrow_penalty > 0 ? '+' : ''}{biasData.first_arrow_penalty.toFixed(2)}</span>
          <span className="stat-sub">{biasData.first_arrow_interpretation}</span>
        </div>
        <div className={`stat-card ${Math.abs(biasData.fatigue_correlation) > 0.5 ? 'stat-warning' : 'stat-good'}`}>
          <span className="stat-label">Fatigue Trend</span>
          <span className="stat-value">{biasData.fatigue_slope > 0 ? '+' : ''}{biasData.fatigue_slope.toFixed(3)}/end</span>
          <span className="stat-sub">{biasData.fatigue_interpretation}</span>
        </div>
      </div>

      {/* MPI Visualization */}
      <h3>Aim Bias (Mean Point of Impact)</h3>
      <Plot
        data={[
          // Target rings
          // MPI marker
          {
            x: [biasData.mpi_x_normalized],
            y: [biasData.mpi_y_normalized],
            mode: 'markers',
            type: 'scatter',
            marker: { color: 'red', size: 18, symbol: 'cross', line: { color: 'black', width: 2 } },
            name: `MPI (${biasData.bias_direction})`,
            hovertext: `MPI: (${biasData.mpi_x_cm.toFixed(1)}, ${biasData.mpi_y_cm.toFixed(1)}) cm`,
          },
          // Center reference
          {
            x: [0],
            y: [0],
            mode: 'markers',
            type: 'scatter',
            marker: { color: 'gold', size: 12, symbol: 'circle', line: { color: 'black', width: 1 } },
            name: 'Target Center',
          },
          // Sigma ellipse (approximate with line)
          {
            x: Array.from({ length: 37 }, (_, i) => {
              const angle = (i / 36) * 2 * Math.PI;
              const sx = biasData.sigma_x_cm > 0 ? biasData.sigma_x_cm : 1;
              const sy = biasData.sigma_y_cm > 0 ? biasData.sigma_y_cm : 1;
              // We need to normalize — use rough face estimate
              return biasData.mpi_x_normalized + (sx / (biasData.bias_magnitude_cm / biasData.bias_magnitude_normalized || 50)) * Math.cos(angle);
            }),
            y: Array.from({ length: 37 }, (_, i) => {
              const angle = (i / 36) * 2 * Math.PI;
              const sx = biasData.sigma_x_cm > 0 ? biasData.sigma_x_cm : 1;
              const sy = biasData.sigma_y_cm > 0 ? biasData.sigma_y_cm : 1;
              return biasData.mpi_y_normalized + (sy / (biasData.bias_magnitude_cm / biasData.bias_magnitude_normalized || 50)) * Math.sin(angle);
            }),
            mode: 'lines',
            type: 'scatter',
            line: { color: 'rgba(255,0,0,0.3)', width: 2, dash: 'dash' },
            name: '1σ Dispersion',
          },
        ]}
        layout={{
          width: 500,
          height: 500,
          xaxis: { range: [-1.2, 1.2], scaleanchor: 'y', scaleratio: 1, showgrid: false, zeroline: true, zerolinecolor: '#ccc' },
          yaxis: { range: [-1.2, 1.2], showgrid: false, zeroline: true, zerolinecolor: '#ccc' },
          shapes: [
            { type: 'circle', xref: 'x', yref: 'y', x0: -1, y0: -1, x1: 1, y1: 1, line: { color: '#ccc' } },
            { type: 'circle', xref: 'x', yref: 'y', x0: -0.6, y0: -0.6, x1: 0.6, y1: 0.6, line: { color: '#ddd' } },
            { type: 'circle', xref: 'x', yref: 'y', x0: -0.2, y0: -0.2, x1: 0.2, y1: 0.2, line: { color: 'gold' } },
          ],
          margin: { l: 20, r: 20, t: 20, b: 20 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          showlegend: true,
          legend: { x: 0, y: -0.15, orientation: 'h' },
        }}
        useResizeHandler
        style={{ width: '100%', maxWidth: '500px' }}
      />

      <div className="interpretation-box">
        <strong>Aim Bias Interpretation:</strong>
        <ul>
          {biasData.bias_direction === 'Center' ? (
            <li className="good-text">Your group is centered — no systematic bias detected.</li>
          ) : (
            <>
              <li>Your group center is biased <strong>{biasData.bias_direction}</strong> by {biasData.bias_magnitude_cm.toFixed(1)} cm.</li>
              {biasData.bias_direction.includes('N') && <li>Consistently shooting <strong>high</strong> — check anchor point or nocking point.</li>}
              {biasData.bias_direction.includes('S') && <li>Consistently shooting <strong>low</strong> — check crawl/reference or draw length.</li>}
              {biasData.bias_direction.includes('E') && <li>Consistently shooting <strong>right</strong> — check plunger/rest alignment or grip torque.</li>}
              {biasData.bias_direction.includes('W') && <li>Consistently shooting <strong>left</strong> — check plunger/rest alignment or grip torque.</li>}
            </>
          )}
          <li>
            <strong>H/V Ratio: {biasData.hv_ratio.toFixed(2)}</strong> — {biasData.hv_interpretation}
            {biasData.hv_ratio > 1.3 && ' → Focus on lateral consistency (release, grip torque, canting).'}
            {biasData.hv_ratio < 0.7 && ' → Focus on vertical consistency (draw length, anchor, crawl).'}
          </li>
        </ul>
      </div>

      {/* End Fatigue Chart */}
      <h3>End-over-End Fatigue</h3>
      <p className="caption">Does your score drop as the round progresses?</p>
      {biasData.end_scores.length > 0 && (
        <Plot
          data={[
            {
              x: biasData.end_scores.map(e => e.end_number),
              y: biasData.end_scores.map(e => e.avg_score),
              type: 'scatter',
              mode: 'lines+markers',
              name: 'Avg Score',
              marker: { size: 8, color: '#2196F3' },
              line: { color: '#2196F3' },
            },
            // Trendline
            {
              x: [biasData.end_scores[0].end_number, biasData.end_scores[biasData.end_scores.length - 1].end_number],
              y: [
                biasData.end_scores[0].avg_score,
                biasData.end_scores[0].avg_score + biasData.fatigue_slope * (biasData.end_scores[biasData.end_scores.length - 1].end_number - biasData.end_scores[0].end_number)
              ],
              type: 'scatter',
              mode: 'lines',
              name: `Trend (${biasData.fatigue_slope > 0 ? '+' : ''}${biasData.fatigue_slope.toFixed(3)}/end)`,
              line: { color: 'red', dash: 'dash', width: 2 },
            },
          ]}
          layout={{
            xaxis: { title: 'End Number', dtick: 1 },
            yaxis: { title: 'Avg Score per Arrow' },
            margin: { l: 50, r: 20, t: 30, b: 50 },
            height: 350,
          }}
          useResizeHandler
          style={{ width: '100%' }}
        />
      )}

      <div className="interpretation-box">
        <strong>Fatigue: </strong>{biasData.fatigue_interpretation}
        {Math.abs(biasData.fatigue_correlation) > 0.5 && biasData.fatigue_slope < 0 && (
          <p className="warning-text">Consider: shorter practice sessions, physical conditioning, or rest breaks between ends.</p>
        )}
      </div>

      {/* First Arrow Analysis */}
      <h3>First Arrow Effect</h3>
      <p className="caption">Is your first shot each end consistently different from the rest?</p>
      <Plot
        data={[{
          x: ['First Arrow', 'Other Arrows'],
          y: [biasData.first_arrow_avg, biasData.other_arrows_avg],
          type: 'bar',
          marker: { 
            color: [Math.abs(biasData.first_arrow_penalty) > 0.5 ? '#f44336' : '#4CAF50', '#2196F3'] 
          },
          text: [biasData.first_arrow_avg.toFixed(2), biasData.other_arrows_avg.toFixed(2)],
          textposition: 'outside',
        }]}
        layout={{
          yaxis: { title: 'Avg Score', range: [0, Math.max(biasData.first_arrow_avg, biasData.other_arrows_avg) * 1.15] },
          margin: { l: 50, r: 20, t: 30, b: 50 },
          height: 300,
        }}
        useResizeHandler
        style={{ width: '100%' }}
      />

      <div className="interpretation-box">
        <strong>First Arrow: </strong>{biasData.first_arrow_interpretation}
        {biasData.first_arrow_penalty < -0.5 && (
          <p className="warning-text">
            Your first arrow each end scores lower by {Math.abs(biasData.first_arrow_penalty).toFixed(2)} points. 
            Consider: more deliberate pre-shot routine, blank boss warm-up, or controlled breathing before first shot.
          </p>
        )}
      </div>

      <p className="caption">Based on {biasData.total_shots} shots.</p>
    </div>
  );
}

// ─── Precision Tab ───────────────────────────────────────

function PrecisionTab({ roundTypes, fromDate, toDate }: {
  roundTypes?: string[];
  fromDate?: string;
  toDate?: string;
}) {
  const { data, isLoading } = useAdvancedPrecision(roundTypes, fromDate, toDate);
  const { data: withinEnd } = useWithinEnd(roundTypes, fromDate, toDate);
  const [hitProbRound, setHitProbRound] = useState('WA 18m');
  const { data: hitProb } = useHitProbability(hitProbRound, fromDate, toDate);

  if (isLoading) return <div>Computing precision metrics...</div>;
  if (!data || data.total_shots === 0) return <div className="empty-state">No shot data available.</div>;

  // Generate ellipse points for plotting
  const ellipsePoints = (() => {
    const n = 60;
    const a = data.ellipse_semi_major;
    const b = data.ellipse_semi_minor;
    const theta = (data.ellipse_angle_deg * Math.PI) / 180;
    const cx = data.ellipse_center_x;
    const cy = data.ellipse_center_y;
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i <= n; i++) {
      const t = (2 * Math.PI * i) / n;
      xs.push(cx + a * Math.cos(t) * Math.cos(theta) - b * Math.sin(t) * Math.sin(theta));
      ys.push(cy + a * Math.cos(t) * Math.sin(theta) + b * Math.sin(t) * Math.cos(theta));
    }
    return { xs, ys };
  })();

  return (
    <div className="precision-tab">
      <h2>Advanced Precision Metrics</h2>
      <p className="info-text">Statistical analysis of your shot dispersion pattern — {data.total_shots} shots.</p>

      {/* Precision Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">DRMS</span>
          <span className="stat-value">{data.drms_cm.toFixed(2)} cm</span>
          <span className="stat-sub">√(σ_x² + σ_y²) · Contains ~63% of shots</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">R95</span>
          <span className="stat-value">{data.r95_cm.toFixed(2)} cm</span>
          <span className="stat-sub">95th percentile — worst-case group</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Extreme Spread</span>
          <span className="stat-value">{data.extreme_spread_cm.toFixed(2)} cm</span>
          <span className="stat-sub">Max pairwise distance</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Rayleigh σ (95% CI)</span>
          <span className="stat-value">{data.rayleigh_sigma.toFixed(2)}</span>
          <span className="stat-sub">[{data.rayleigh_ci_lower.toFixed(2)}, {data.rayleigh_ci_upper.toFixed(2)}]</span>
        </div>
      </div>

      {/* Accuracy vs Precision Decomposition */}
      <h3>Error Decomposition (ISO 5725)</h3>
      <p className="caption">What proportion of your total error is aim vs consistency?</p>
      <div className="stats-grid">
        <div className={`stat-card ${data.accuracy_pct > 60 ? 'stat-warning' : 'stat-good'}`}>
          <span className="stat-label">Aim Error</span>
          <span className="stat-value">{data.accuracy_pct.toFixed(1)}%</span>
          <span className="stat-sub">Systematic bias — adjust crawl/sight</span>
        </div>
        <div className={`stat-card ${data.precision_pct > 60 ? 'stat-warning' : 'stat-good'}`}>
          <span className="stat-label">Consistency Error</span>
          <span className="stat-value">{data.precision_pct.toFixed(1)}%</span>
          <span className="stat-sub">Random spread — technique drills</span>
        </div>
      </div>
      <Plot
        data={[{
          values: [data.accuracy_pct, data.precision_pct],
          labels: ['Aim Error (Bias)', 'Consistency Error (Precision)'],
          type: 'pie',
          hole: 0.5,
          marker: { colors: ['#ff9800', '#2196F3'] },
          textinfo: 'percent+label',
        }]}
        layout={{
          height: 300,
          margin: { l: 20, r: 20, t: 20, b: 20 },
          showlegend: false,
          annotations: [{
            text: data.accuracy_precision_interpretation.split('—')[0] || '',
            showarrow: false,
            font: { size: 12 },
          }],
        }}
        useResizeHandler
        style={{ width: '100%', maxWidth: '400px' }}
      />

      {/* Confidence Ellipse */}
      <h3>90% Confidence Ellipse</h3>
      <p className="caption">Shape and orientation of your dispersion pattern. A tilted ellipse reveals correlated errors (e.g., bow cant).</p>
      <Plot
        data={[
          {
            x: ellipsePoints.xs,
            y: ellipsePoints.ys,
            type: 'scatter',
            mode: 'lines',
            line: { color: 'red', width: 2.5 },
            name: '90% Ellipse',
          },
          {
            x: [data.ellipse_center_x],
            y: [data.ellipse_center_y],
            type: 'scatter',
            mode: 'markers',
            marker: { color: 'red', size: 12, symbol: 'cross' },
            name: 'MPI',
          },
        ]}
        layout={{
          width: 500,
          height: 500,
          xaxis: { range: [-1.2, 1.2], scaleanchor: 'y', scaleratio: 1, showgrid: false, zeroline: true, zerolinecolor: '#ddd' },
          yaxis: { range: [-1.2, 1.2], showgrid: false, zeroline: true, zerolinecolor: '#ddd' },
          shapes: [
            { type: 'circle', xref: 'x', yref: 'y', x0: -1, y0: -1, x1: 1, y1: 1, line: { color: '#ccc' } },
            { type: 'circle', xref: 'x', yref: 'y', x0: -0.6, y0: -0.6, x1: 0.6, y1: 0.6, line: { color: '#ddd' } },
            { type: 'circle', xref: 'x', yref: 'y', x0: -0.2, y0: -0.2, x1: 0.2, y1: 0.2, line: { color: 'gold' } },
          ],
          margin: { l: 20, r: 20, t: 20, b: 20 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
        }}
        useResizeHandler
        style={{ width: '100%', maxWidth: '500px' }}
      />
      <div className="interpretation-box">
        <strong>Ellipse:</strong> Correlation = {data.ellipse_correlation.toFixed(3)}
        {Math.abs(data.ellipse_correlation) > 0.3
          ? ` — Significant x-y correlation detected (tilted ellipse). May indicate bow cant or diagonal string-walking bias.`
          : ` — Minimal correlation. Horizontal and vertical errors are independent.`}
      </div>

      {/* Flier Detection */}
      <h3>Flier Detection</h3>
      <div className="stats-grid">
        <div className={`stat-card ${data.flier_pct > 10 ? 'stat-warning' : data.flier_pct > 0 ? 'stat-caution' : 'stat-good'}`}>
          <span className="stat-label">Fliers</span>
          <span className="stat-value">{data.flier_count} ({data.flier_pct.toFixed(1)}%)</span>
          <span className="stat-sub">{data.flier_interpretation}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Clean σ (no fliers)</span>
          <span className="stat-value">{data.clean_sigma.toFixed(2)} cm</span>
          <span className="stat-sub">vs Full σ: {data.full_sigma.toFixed(2)} cm</span>
        </div>
      </div>

      {/* Within-End Trend */}
      {withinEnd && withinEnd.positions.length > 0 && (
        <>
          <h3>Within-End Shot Position ({withinEnd.arrows_per_end_mode} arrows/end)</h3>
          <p className="caption">Average score by arrow position within each end — {withinEnd.total_ends} ends analyzed.</p>
          <Plot
            data={[{
              x: withinEnd.positions.map(p => `Shot ${p.position}`),
              y: withinEnd.positions.map(p => p.avg_score),
              type: 'bar',
              marker: {
                color: withinEnd.positions.map(p =>
                  p.position === withinEnd.worst_position ? '#f44336' :
                  p.position === withinEnd.best_position ? '#4CAF50' : '#2196F3'
                ),
              },
              text: withinEnd.positions.map(p => p.avg_score.toFixed(2)),
              textposition: 'outside' as const,
            }]}
            layout={{
              yaxis: {
                title: 'Avg Score',
                range: [
                  Math.min(...withinEnd.positions.map(p => p.avg_score)) * 0.9,
                  Math.max(...withinEnd.positions.map(p => p.avg_score)) * 1.05,
                ],
              },
              margin: { l: 50, r: 20, t: 20, b: 50 },
              height: 300,
            }}
            useResizeHandler
            style={{ width: '100%' }}
          />
          <div className="interpretation-box"><strong>Pattern:</strong> {withinEnd.interpretation}</div>
        </>
      )}

      {/* Hit Probability */}
      <h3>Ring Hit Probability</h3>
      <p className="caption">Monte Carlo estimated probability of hitting each scoring ring.</p>
      <div className="hit-prob-selector">
        <label>
          Round:
          <select value={hitProbRound} onChange={e => setHitProbRound(e.target.value)}>
            <option value="WA 18m">WA 18m</option>
            <option value="WA 25m">WA 25m</option>
            <option value="WA 50m">WA 50m</option>
            <option value="Indoor Field">Indoor Field</option>
            <option value="Flint">Flint</option>
          </select>
        </label>
      </div>
      {hitProb && hitProb.total_shots > 0 ? (
        <>
          <Plot
            data={[{
              x: hitProb.ring_probs.map(rp => rp.ring === 0 ? 'Miss' : `${rp.ring}`),
              y: hitProb.ring_probs.map(rp => rp.probability),
              type: 'bar',
              marker: {
                color: hitProb.ring_probs.map(rp => {
                  if (rp.ring === 0) return '#999';
                  if (rp.ring >= 9) return '#FFD700';
                  if (rp.ring >= 7) return '#f44336';
                  if (rp.ring >= 5) return '#2196F3';
                  return '#666';
                }),
              },
              text: hitProb.ring_probs.map(rp => `${rp.probability.toFixed(1)}%`),
              textposition: 'outside' as const,
            }]}
            layout={{
              xaxis: { title: 'Ring' },
              yaxis: { title: 'Probability %' },
              margin: { l: 50, r: 20, t: 20, b: 50 },
              height: 350,
            }}
            useResizeHandler
            style={{ width: '100%' }}
          />
          <div className="interpretation-box">
            <strong>Expected Score:</strong> {hitProb.expected_score.toFixed(2)} per arrow
            ({(hitProb.expected_score * (hitProb.total_shots || 60)).toFixed(0)} per round estimate)
          </div>
        </>
      ) : (
        <p className="caption">No data for {hitProbRound}. Shoot some sessions first!</p>
      )}
    </div>
  );
}

// ─── Trends Tab ──────────────────────────────────────────

function TrendsTab({ roundTypes, fromDate, toDate }: {
  roundTypes?: string[];
  fromDate?: string;
  toDate?: string;
}) {
  const { data, isLoading } = useTrends(roundTypes, fromDate, toDate);

  if (isLoading) return <div>Computing trends...</div>;
  if (!data || data.dates.length === 0) return <div className="empty-state">Not enough data for trend analysis.</div>;

  return (
    <div className="trends-tab">
      <h2>EWMA Trend Analysis</h2>
      <p className="info-text">
        Exponentially Weighted Moving Average — smooths noise to reveal genuine performance changes.
        Points outside the <strong>control limits</strong> (dashed) indicate statistically significant shifts.
      </p>

      {/* EWMA Score Chart */}
      <h3>Score Trend (EWMA λ=0.2)</h3>
      <Plot
        data={[
          {
            x: data.dates,
            y: data.scores,
            type: 'scatter',
            mode: 'markers',
            marker: { color: '#90CAF9', size: 6, opacity: 0.5 },
            name: 'Raw Score',
          },
          {
            x: data.dates,
            y: data.score_ewma,
            type: 'scatter',
            mode: 'lines',
            line: { color: '#1565C0', width: 2.5 },
            name: 'EWMA',
          },
          {
            x: data.dates,
            y: data.score_ucl,
            type: 'scatter',
            mode: 'lines',
            line: { color: '#f44336', width: 1, dash: 'dash' },
            name: 'UCL',
          },
          {
            x: data.dates,
            y: data.score_lcl,
            type: 'scatter',
            mode: 'lines',
            line: { color: '#f44336', width: 1, dash: 'dash' },
            name: 'LCL',
          },
        ]}
        layout={{
          xaxis: { title: 'Date' },
          yaxis: { title: 'Avg Arrow Score' },
          margin: { l: 50, r: 20, t: 30, b: 50 },
          height: 400,
          showlegend: true,
          legend: { x: 0, y: -0.2, orientation: 'h' as const },
        }}
        useResizeHandler
        style={{ width: '100%' }}
      />

      {/* EWMA Sigma Chart */}
      <h3>Precision Trend (EWMA λ=0.3)</h3>
      <Plot
        data={[
          {
            x: data.dates,
            y: data.sigmas,
            type: 'scatter',
            mode: 'markers',
            marker: { color: '#A5D6A7', size: 6, opacity: 0.5 },
            name: 'Raw σ',
          },
          {
            x: data.dates,
            y: data.sigma_ewma,
            type: 'scatter',
            mode: 'lines',
            line: { color: '#2E7D32', width: 2.5 },
            name: 'EWMA',
          },
          {
            x: data.dates,
            y: data.sigma_ucl,
            type: 'scatter',
            mode: 'lines',
            line: { color: '#f44336', width: 1, dash: 'dash' },
            name: 'UCL',
          },
          {
            x: data.dates,
            y: data.sigma_lcl,
            type: 'scatter',
            mode: 'lines',
            line: { color: '#f44336', width: 1, dash: 'dash' },
            name: 'LCL',
          },
        ]}
        layout={{
          xaxis: { title: 'Date' },
          yaxis: { title: 'Group Size (σ cm)', autorange: 'reversed' as const },
          margin: { l: 50, r: 20, t: 30, b: 50 },
          height: 400,
          showlegend: true,
          legend: { x: 0, y: -0.2, orientation: 'h' as const },
        }}
        useResizeHandler
        style={{ width: '100%' }}
      />

      <div className="interpretation-box">
        <strong>How to read EWMA charts:</strong>
        <ul>
          <li>The <strong>blue/green line</strong> smooths your session-to-session noise. It responds faster to recent sessions.</li>
          <li>The <strong>red dashed lines</strong> are control limits (~2.7σ). Points outside these indicate a genuine shift — not random variation.</li>
          <li>A sustained rise in the score EWMA = real improvement. A dip below LCL = something went wrong (fatigue, equipment change, etc.).</li>
        </ul>
      </div>

      {/* Practice Consistency */}
      <h3>Practice Consistency (CV)</h3>
      <p className="caption">Coefficient of Variation — lower = more reproducible performance across sessions.</p>
      {data.consistency.length > 0 ? (
        <table className="summary-table">
          <thead>
            <tr>
              <th>Round</th>
              <th>Sessions</th>
              <th>Mean Score</th>
              <th>Std Dev</th>
              <th>CV %</th>
              <th>Rating</th>
            </tr>
          </thead>
          <tbody>
            {data.consistency
              .sort((a, b) => a.cv - b.cv)
              .map(c => (
                <tr key={c.round_type}>
                  <td>{c.round_type}</td>
                  <td>{c.session_count}</td>
                  <td>{c.mean.toFixed(1)}</td>
                  <td>{c.std.toFixed(1)}</td>
                  <td className={c.cv < 3 ? 'good-text' : c.cv < 6 ? '' : 'warning-text'}>
                    <strong>{c.cv.toFixed(1)}%</strong>
                  </td>
                  <td>{c.interpretation}</td>
                </tr>
              ))}
          </tbody>
        </table>
      ) : (
        <p>No sessions found.</p>
      )}
    </div>
  );
}

// ─── Equipment Tab ───────────────────────────────────────

function EquipmentTab({ fromDate, toDate }: {
  fromDate?: string;
  toDate?: string;
}) {
  // We need bow/arrow lists
  const [setupABow, setSetupABow] = useState('');
  const [setupAArrow, setSetupAArrow] = useState('');
  const [setupBBow, setSetupBBow] = useState('');
  const [setupBArrow, setSetupBArrow] = useState('');

  // Fetch available bows and arrows
  const { data: bows } = useBows();
  const { data: arrows } = useArrows();

  const { data: comparison, isLoading } = useEquipmentComparison(
    setupABow || undefined, setupAArrow || undefined,
    setupBBow || undefined, setupBArrow || undefined,
    undefined, fromDate, toDate
  );

  return (
    <div className="equipment-tab">
      <h2>Equipment A/B Comparison</h2>
      <p className="info-text">
        Statistical comparison of two equipment setups using Welch's t-test. 
        Select bow and/or arrow for each setup to compare scoring and precision.
      </p>

      <div className="equipment-selectors">
        <div className="setup-selector">
          <h3>Setup A</h3>
          <label>
            Bow:
            <select value={setupABow} onChange={e => setSetupABow(e.target.value)}>
              <option value="">Any</option>
              {bows?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
          <label>
            Arrows:
            <select value={setupAArrow} onChange={e => setSetupAArrow(e.target.value)}>
              <option value="">Any</option>
              {arrows?.map(a => <option key={a.id} value={a.id}>{a.make} {a.model}</option>)}
            </select>
          </label>
        </div>

        <div className="vs-divider">VS</div>

        <div className="setup-selector">
          <h3>Setup B</h3>
          <label>
            Bow:
            <select value={setupBBow} onChange={e => setSetupBBow(e.target.value)}>
              <option value="">Any</option>
              {bows?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
          <label>
            Arrows:
            <select value={setupBArrow} onChange={e => setSetupBArrow(e.target.value)}>
              <option value="">Any</option>
              {arrows?.map(a => <option key={a.id} value={a.id}>{a.make} {a.model}</option>)}
            </select>
          </label>
        </div>
      </div>

      {!setupABow && !setupAArrow && !setupBBow && !setupBArrow ? (
        <div className="empty-state">
          <p>Select equipment for both Setup A and Setup B to compare.</p>
        </div>
      ) : isLoading ? (
        <div>Analyzing...</div>
      ) : comparison ? (
        <div className="comparison-results">
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">{comparison.setup_a}</span>
              <span className="stat-value">{comparison.setup_a_sessions} sessions</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">{comparison.setup_b}</span>
              <span className="stat-value">{comparison.setup_b_sessions} sessions</span>
            </div>
          </div>

          <h3>Score Comparison</h3>
          <div className="stats-grid">
            <div className={`stat-card ${comparison.score_significant ? 'stat-warning' : 'stat-good'}`}>
              <span className="stat-label">Score Difference</span>
              <span className="stat-value">{comparison.score_diff > 0 ? '+' : ''}{comparison.score_diff.toFixed(3)}</span>
              <span className="stat-sub">p = {comparison.score_p_value.toFixed(4)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Effect Size (Cohen's d)</span>
              <span className="stat-value">{comparison.score_cohens_d.toFixed(3)}</span>
              <span className="stat-sub">
                {Math.abs(comparison.score_cohens_d) < 0.2 ? 'Negligible' :
                 Math.abs(comparison.score_cohens_d) < 0.5 ? 'Small' :
                 Math.abs(comparison.score_cohens_d) < 0.8 ? 'Medium' : 'Large'}
              </span>
            </div>
          </div>

          <h3>Precision Comparison</h3>
          <div className="stats-grid">
            <div className={`stat-card ${comparison.sigma_significant ? 'stat-warning' : 'stat-good'}`}>
              <span className="stat-label">Sigma Difference</span>
              <span className="stat-value">{comparison.sigma_diff > 0 ? '+' : ''}{comparison.sigma_diff.toFixed(3)}</span>
              <span className="stat-sub">p = {comparison.sigma_p_value.toFixed(4)}{comparison.sigma_diff < 0 ? ' (A tighter)' : comparison.sigma_diff > 0 ? ' (B tighter)' : ''}</span>
            </div>
          </div>

          <div className="interpretation-box">
            <strong>Verdict:</strong> {comparison.interpretation}
            {!comparison.score_significant && !comparison.sigma_significant && (
              <p>Neither scoring nor precision difference is statistically significant. You may need more sessions or the setups perform similarly.</p>
            )}
          </div>
        </div>
      ) : null}
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
