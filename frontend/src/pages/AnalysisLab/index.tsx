import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useBows } from '../../api/bows';
import { useArrows } from '../../api/arrows';
import { useSessions } from '../../api/sessions';
import { useVirtualCoach, type VirtualCoachRequest, type VirtualCoachResult } from '../../api/analysis';
import {
  useAdvancedPrecision,
  useBiasAnalysis,
  useWithinEnd,
  useHitProbability,
  useTrends,
  useAnalyticsSummary,
  useScoreGoal,
  useArrowPerformance,
  type AdvancedPrecision,
  type BiasAnalysis,
  type WithinEndAnalysis,
  type HitProbabilityAnalysis,
  type TrendAnalysis,
} from '../../api/analytics';
import type { SessionSummary } from '../../types/models';
import { useToast } from '../../components/Toast';
import './AnalysisLab.css';

const TargetFace = React.lazy(() => import('../../components/TargetFace'));

type AnalysisMode = 'single' | 'cross' | 'goal' | 'arrows';
type InputMode = 'database' | 'manual';

export default function AnalysisLab() {
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('single');
  const { toast } = useToast();
  const [inputMode, setInputMode] = useState<InputMode>('database');
  const [selectedBowId, setSelectedBowId] = useState<string>('');
  const [selectedArrowId, setSelectedArrowId] = useState<string>('');
  const [selectedRoundType, setSelectedRoundType] = useState<string>('');

  // Cross-distance state
  const [selectedShortSessionId, setSelectedShortSessionId] = useState<string>('');
  const [selectedLongSessionId, setSelectedLongSessionId] = useState<string>('');
  const [shortDistance, setShortDistance] = useState<number>(18);
  const [shortFace, setShortFace] = useState<number>(40);
  const [shortScore, setShortScore] = useState<number>(9.0);
  const [longDistance, setLongDistance] = useState<number>(50);
  const [longFace, setLongFace] = useState<number>(122);
  const [longScore, setLongScore] = useState<number>(7.5);

  // Score Goal Simulator state
  const [goalScore, setGoalScore] = useState<number>(270);
  const [goalArrows, setGoalArrows] = useState<number>(30);
  const [goalDistance, setGoalDistance] = useState<number>(18);
  const [goalFace, setGoalFace] = useState<number>(40);

  // Helper to prevent NaN propagation from empty input fields
  const handleNumericChange = (setter: (val: number) => void, raw: string, fallback: number = 0) => {
    const parsed = parseFloat(raw);
    setter(isNaN(parsed) ? fallback : parsed);
  };

  // Arrow Tracker state
  const [selectedArrows, setSelectedArrows] = useState<Set<number>>(new Set());
  const [showHeatmap, setShowHeatmap] = useState(false);

  const { data: bows } = useBows();
  const { data: arrows } = useArrows();
  const { data: allSessions } = useSessions(selectedBowId || undefined, selectedArrowId || undefined);
  const virtualCoach = useVirtualCoach();

  // Summary for round-type dropdown
  const { data: summaryData } = useAnalyticsSummary();
  const availableRounds = useMemo(() => {
    if (!summaryData) return [];
    return [...new Set(summaryData.map(s => s.round_type))].sort();
  }, [summaryData]);

  // Single-distance analytics hooks (auto-fire, TanStack Query caches)
  const roundFilter = selectedRoundType ? [selectedRoundType] : undefined;
  const precisionQuery = useAdvancedPrecision(roundFilter);
  const biasQuery = useBiasAnalysis(roundFilter);
  const withinEndQuery = useWithinEnd(roundFilter);
  const hitProbQuery = useHitProbability(selectedRoundType);
  const trendsQuery = useTrends(roundFilter);

  const isAnySingleLoading =
    precisionQuery.isLoading || biasQuery.isLoading ||
    withinEndQuery.isLoading || trendsQuery.isLoading;

  const precisionData: AdvancedPrecision | undefined = precisionQuery.data;
  const biasData: BiasAnalysis | undefined = biasQuery.data;
  const withinEndData: WithinEndAnalysis | undefined = withinEndQuery.data;
  const hitProbData: HitProbabilityAnalysis | undefined = hitProbQuery.data;
  const trendsData: TrendAnalysis | undefined = trendsQuery.data;

  // Score Goal hook
  const goalQuery = useScoreGoal(goalScore, goalArrows, goalDistance, goalFace, selectedRoundType || undefined);

  // Arrow Performance hook
  const arrowPerfQuery = useArrowPerformance(selectedRoundType || undefined);

  // Initialize selectedArrows when data loads
  useEffect(() => {
    if (arrowPerfQuery.data?.arrows) {
      const allArrowNumbers = new Set(arrowPerfQuery.data.arrows.map(a => a.arrow_number));
      setSelectedArrows(allArrowNumbers);
    }
  }, [arrowPerfQuery.data?.arrows]);

  // Cross-distance helpers
  const { shortSessions, longSessions } = useMemo(() => {
    if (!allSessions) return { shortSessions: [], longSessions: [] };
    return {
      shortSessions: allSessions.filter(s => s.distance_m <= 30),
      longSessions: allSessions.filter(s => s.distance_m > 30),
    };
  }, [allSessions]);

  const getSessionAverage = (session: SessionSummary): number => {
    if (!session.shot_count || session.shot_count === 0) return 0;
    return session.total_score / session.shot_count;
  };

  const selectedShortSession = shortSessions.find(s => s.id === selectedShortSessionId);
  const selectedLongSession = longSessions.find(s => s.id === selectedLongSessionId);

  const handleCrossAnalyze = () => {
    if (!selectedBowId || !selectedArrowId) {
      toast('Please select both bow and arrow', 'warning');
      return;
    }
    let request: VirtualCoachRequest;
    if (inputMode === 'database') {
      if (!selectedShortSession || !selectedLongSession) {
        toast('Please select both short and long distance sessions', 'warning');
        return;
      }
      request = {
        bow_id: selectedBowId,
        arrow_id: selectedArrowId,
        short_score: getSessionAverage(selectedShortSession),
        short_distance_m: selectedShortSession.distance_m,
        short_face_cm: selectedShortSession.target_face_size_cm,
        long_score: getSessionAverage(selectedLongSession),
        long_distance_m: selectedLongSession.distance_m,
        long_face_cm: selectedLongSession.target_face_size_cm,
      };
    } else {
      request = {
        bow_id: selectedBowId,
        arrow_id: selectedArrowId,
        short_score: shortScore,
        short_distance_m: shortDistance,
        short_face_cm: shortFace,
        long_score: longScore,
        long_distance_m: longDistance,
        long_face_cm: longFace,
      };
    }
    virtualCoach.mutate(request);
  };

  const result: VirtualCoachResult | undefined = virtualCoach.data;

  return (
    <div className="analysis-lab">
      <h1>Analysis Lab</h1>

      {/* Mode tabs */}
      <div className="analysis-mode-tabs">
        <button
          className={`mode-tab ${analysisMode === 'single' ? 'active' : ''}`}
          onClick={() => setAnalysisMode('single')}
        >
          Single Distance
        </button>
        <button
          className={`mode-tab ${analysisMode === 'cross' ? 'active' : ''}`}
          onClick={() => setAnalysisMode('cross')}
        >
          Cross Distance (Park Model)
        </button>
        <button
          className={`mode-tab ${analysisMode === 'goal' ? 'active' : ''}`}
          onClick={() => setAnalysisMode('goal')}
        >
          Score Goal
        </button>
        <button
          className={`mode-tab ${analysisMode === 'arrows' ? 'active' : ''}`}
          onClick={() => setAnalysisMode('arrows')}
        >
          Arrow Tracker
        </button>
      </div>

      {analysisMode === 'single' ? (
        <p className="mode-description">
          Precision, bias, shot patterns, and hit probability from sessions at a <strong>single distance</strong>.
          No second distance required.
        </p>
      ) : analysisMode === 'cross' ? (
        <p className="mode-description">
          Uses the <strong>James Park Model</strong> to separate <strong>Skill</strong> from{' '}
          <strong>Equipment</strong> errors by comparing performance at two different distances.
        </p>
      ) : analysisMode === 'goal' ? (
        <p className="mode-description">
          Reverse-solve the scoring model: enter a <strong>target score</strong> and see what precision
          (group size) you need to achieve it.
        </p>
      ) : (
        <p className="mode-description">
          Track individual <strong>arrow performance</strong> across sessions. Identify weak shafts
          by comparing average scores per arrow number.
        </p>
      )}

      {/* ============ SINGLE DISTANCE ============ */}
      {analysisMode === 'single' && (
        <>
          <div className="filter-row">
            <div className="form-group">
              <label>Round Type</label>
              <select
                value={selectedRoundType}
                onChange={(e) => setSelectedRoundType(e.target.value)}
              >
                <option value="">All Round Types</option>
                {availableRounds.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {isAnySingleLoading && <p className="loading-text">Loading analytics...</p>}

          {!isAnySingleLoading && !precisionData && !biasData && (
            <div className="alert alert-warning">
              No session data found. Log some sessions first, then come back for analysis.
            </div>
          )}

          {precisionData && (
            <div className="results-section">

              {/* Precision Metrics */}
              <div className="result-card">
                <h3>Precision Metrics</h3>
                <p className="shot-count-label">{precisionData.total_shots} shots analysed</p>
                <div className="performance-metrics">
                  <div className="metric-card">
                    <h4>Rayleigh σ</h4>
                    <div className="value">
                      {precisionData.rayleigh_sigma.toFixed(2)} cm
                      <span className="ci">
                        ({precisionData.rayleigh_ci_lower.toFixed(2)}–{precisionData.rayleigh_ci_upper.toFixed(2)})
                      </span>
                    </div>
                  </div>
                  <div className="metric-card">
                    <h4>DRMS</h4>
                    <div className="value">{precisionData.drms_cm.toFixed(2)} cm</div>
                  </div>
                  <div className="metric-card">
                    <h4>R95</h4>
                    <div className="value">{precisionData.r95_cm.toFixed(2)} cm</div>
                  </div>
                  <div className="metric-card">
                    <h4>Extreme Spread</h4>
                    <div className="value">{precisionData.extreme_spread_cm.toFixed(2)} cm</div>
                  </div>
                </div>

                <div className="sub-section">
                  <h4>Accuracy vs Precision</h4>
                  <div className="bar-split">
                    <div className="bar-fill accuracy" style={{ width: `${precisionData.accuracy_pct}%` }}>
                      Aim {precisionData.accuracy_pct.toFixed(0)}%
                    </div>
                    <div className="bar-fill precision" style={{ width: `${precisionData.precision_pct}%` }}>
                      Consistency {precisionData.precision_pct.toFixed(0)}%
                    </div>
                  </div>
                  <p className="interpretation">{precisionData.accuracy_precision_interpretation}</p>
                </div>

                <div className="sub-section">
                  <h4>Flier Detection</h4>
                  <p>
                    {precisionData.flier_count} flier(s) ({precisionData.flier_pct.toFixed(1)}%)
                    &nbsp;|&nbsp; Clean σ: {precisionData.clean_sigma.toFixed(2)} cm
                    &nbsp;vs&nbsp; Full σ: {precisionData.full_sigma.toFixed(2)} cm
                  </p>
                  <p className="interpretation">{precisionData.flier_interpretation}</p>
                </div>
              </div>

              {/* Bias & Pattern */}
              {biasData && (
                <div className="result-card">
                  <h3>Shot Pattern &amp; Bias</h3>
                  <div className="performance-metrics">
                    <div className="metric-card">
                      <h4>MPI Offset</h4>
                      <div className="value">
                        {biasData.bias_direction} &mdash; {biasData.bias_magnitude_cm.toFixed(1)} cm
                      </div>
                    </div>
                    <div className="metric-card">
                      <h4>H/V Ratio</h4>
                      <div className="value">
                        {biasData.hv_ratio.toFixed(2)}
                        <span className="ci">{biasData.hv_interpretation}</span>
                      </div>
                    </div>
                    <div className="metric-card">
                      <h4>1st Arrow Effect</h4>
                      <div className="value">
                        {biasData.first_arrow_penalty > 0 ? '−' : '+'}{Math.abs(biasData.first_arrow_penalty).toFixed(2)} pts
                        <span className="ci">{biasData.first_arrow_interpretation}</span>
                      </div>
                    </div>
                  </div>

                  <div className="sub-section">
                    <h4>Fatigue Analysis</h4>
                    <p className="interpretation">{biasData.fatigue_interpretation}</p>
                    {biasData.end_scores.length > 0 && (
                      <div className="end-score-table">
                        <table>
                          <thead>
                            <tr>
                              <th>End</th>
                              {biasData.end_scores.map(e => (
                                <th key={e.end_number}>{e.end_number}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>Avg</td>
                              {biasData.end_scores.map(e => (
                                <td key={e.end_number}>{e.avg_score.toFixed(1)}</td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Within-End Position */}
              {withinEndData && withinEndData.positions.length > 0 && (
                <div className="result-card">
                  <h3>Within-End Shot Position</h3>
                  <p className="shot-count-label">
                    {withinEndData.total_ends} ends ({withinEndData.arrows_per_end_mode} arrows/end)
                  </p>
                  <div className="performance-metrics">
                    {withinEndData.positions.map(p => (
                      <div
                        key={p.position}
                        className={`metric-card${p.position === withinEndData.best_position ? ' best' : ''}${p.position === withinEndData.worst_position ? ' worst' : ''}`}
                      >
                        <h4>Shot {p.position}</h4>
                        <div className="value">{p.avg_score.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                  <p className="interpretation">{withinEndData.interpretation}</p>
                </div>
              )}

              {/* Hit Probability */}
              {hitProbData && hitProbData.ring_probs.length > 0 && (
                <div className="result-card">
                  <h3>Hit Probability</h3>
                  <p className="shot-count-label">
                    {hitProbData.total_shots} shots &nbsp;|&nbsp;
                    Expected avg: <strong>{hitProbData.expected_score.toFixed(2)}</strong>
                  </p>
                  <div className="ring-prob-grid">
                    {hitProbData.ring_probs.map(rp => (
                      <div key={rp.ring} className="ring-prob-item">
                        <div className="ring-label">{rp.ring === 0 ? 'M' : rp.ring}</div>
                        <div className="ring-bar-container">
                          <div className="ring-bar" style={{ width: `${Math.min(rp.probability, 100)}%` }} />
                        </div>
                        <div className="ring-pct">{rp.probability.toFixed(1)}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trends (EWMA) */}
              {trendsData && trendsData.dates.length > 1 && (
                <div className="result-card">
                  <h3>Session Trends</h3>
                  <div className="performance-metrics">
                    {trendsData.consistency.map(c => (
                      <div key={c.round_type} className="metric-card">
                        <h4>{c.round_type}</h4>
                        <div className="value">
                          CV {c.cv.toFixed(1)}%
                          <span className="ci">{c.interpretation}</span>
                        </div>
                        <div className="sub-value">{c.session_count} sessions, avg {c.mean.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="trend-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Round</th>
                          <th>Avg Score</th>
                          <th>EWMA</th>
                          <th>σ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trendsData.dates.map((d, i) => (
                          <tr key={i}>
                            <td>{new Date(d).toLocaleDateString()}</td>
                            <td>{trendsData.round_types[i]}</td>
                            <td>{trendsData.scores[i].toFixed(2)}</td>
                            <td>{trendsData.score_ewma[i].toFixed(2)}</td>
                            <td>{trendsData.sigmas[i].toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ============ CROSS DISTANCE (PARK MODEL) ============ */}
      {analysisMode === 'cross' && (
        <>
          <h2>1. Equipment Profile</h2>
          <div className="equipment-section">
            <div className="form-group">
              <label>Select Bow</label>
              <select value={selectedBowId} onChange={(e) => setSelectedBowId(e.target.value)}>
                <option value="">-- Choose Bow --</option>
                {bows?.map(bow => (
                  <option key={bow.id} value={bow.id}>{bow.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Select Arrow</label>
              <select value={selectedArrowId} onChange={(e) => setSelectedArrowId(e.target.value)}>
                <option value="">-- Choose Arrow --</option>
                {arrows?.map(arrow => (
                  <option key={arrow.id} value={arrow.id}>
                    {arrow.make} {arrow.model} ({arrow.spine})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!selectedBowId || !selectedArrowId ? (
            <div className="alert alert-warning">
              Please create Bow and Arrow profiles in the Equipment Profile page first.
            </div>
          ) : (
            <>
              <h2>2. Performance Data</h2>
              <div className="input-mode-section">
                <div className="mode-toggle">
                  <label>
                    <input type="radio" value="database" checked={inputMode === 'database'} onChange={() => setInputMode('database')} />
                    Select from Database
                  </label>
                  <label>
                    <input type="radio" value="manual" checked={inputMode === 'manual'} onChange={() => setInputMode('manual')} />
                    Manual Entry
                  </label>
                </div>
              </div>

              {inputMode === 'database' ? (
                <div className="input-section">
                  <div className="session-column">
                    <h3>Short Distance (≤30 m)</h3>
                    <div className="form-group">
                      <label>Select Session</label>
                      <select value={selectedShortSessionId} onChange={(e) => setSelectedShortSessionId(e.target.value)}>
                        <option value="">-- Choose Session --</option>
                        {shortSessions.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.date} - {s.round_type} ({s.distance_m}m)
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedShortSession && (
                      <div className="session-metric">
                        <strong>Average Score:</strong> {getSessionAverage(selectedShortSession).toFixed(2)}
                      </div>
                    )}
                  </div>
                  <div className="session-column">
                    <h3>Long Distance (&gt;30 m)</h3>
                    <div className="form-group">
                      <label>Select Session</label>
                      <select value={selectedLongSessionId} onChange={(e) => setSelectedLongSessionId(e.target.value)}>
                        <option value="">-- Choose Session --</option>
                        {longSessions.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.date} - {s.round_type} ({s.distance_m}m)
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedLongSession && (
                      <div className="session-metric">
                        <strong>Average Score:</strong> {getSessionAverage(selectedLongSession).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="input-section">
                  <div className="manual-column">
                    <h3>Short Distance</h3>
                    <div className="form-group">
                      <label>Distance (m)</label>
                      <input type="number" value={shortDistance} onChange={(e) => handleNumericChange(setShortDistance, e.target.value, 18)} step="0.1" />
                    </div>
                    <div className="form-group">
                      <label>Target Face (cm)</label>
                      <select value={shortFace} onChange={(e) => setShortFace(parseInt(e.target.value))}>
                        <option value={40}>40</option><option value={60}>60</option>
                        <option value={80}>80</option><option value={122}>122</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Average Score (0-10)</label>
                      <input type="number" value={shortScore} onChange={(e) => handleNumericChange(setShortScore, e.target.value, 9.0)} step="0.1" min={0} max={10} />
                    </div>
                  </div>
                  <div className="manual-column">
                    <h3>Long Distance</h3>
                    <div className="form-group">
                      <label>Distance (m)</label>
                      <input type="number" value={longDistance} onChange={(e) => handleNumericChange(setLongDistance, e.target.value, 50)} step="0.1" />
                    </div>
                    <div className="form-group">
                      <label>Target Face (cm)</label>
                      <select value={longFace} onChange={(e) => setLongFace(parseInt(e.target.value))}>
                        <option value={40}>40</option><option value={60}>60</option>
                        <option value={80}>80</option><option value={122}>122</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Average Score (0-10)</label>
                      <input type="number" value={longScore} onChange={(e) => handleNumericChange(setLongScore, e.target.value, 7.5)} step="0.1" min={0} max={10} />
                    </div>
                  </div>
                </div>
              )}

              <button className="analyze-button" onClick={handleCrossAnalyze} disabled={virtualCoach.isPending}>
                {virtualCoach.isPending ? 'Analysing...' : 'Analyse Performance'}
              </button>

              {result && (
                <div className="results-section">
                  <h2>Results</h2>
                  <div className="health-check">
                    <h3>Equipment Health Check</h3>
                    <div className="setup-metrics">
                      <div className="metric-card">
                        <h4>Setup Efficiency</h4>
                        <div className="value">{result.setup_score.score}/100</div>
                      </div>
                      <div className="metric-card">
                        <h4>GPP</h4>
                        <div className="value">{result.setup_score.gpp.toFixed(1)}</div>
                      </div>
                    </div>
                    <div className="alert-list">
                      {result.safety.length > 0 ? (
                        result.safety.map((w, i) => (
                          <div key={i} className="alert alert-danger">{w}</div>
                        ))
                      ) : (
                        <div className="alert alert-success">No safety concerns detected</div>
                      )}
                    </div>
                    {result.setup_score.feedback.length > 0 && (
                      <div className="alert-list">
                        {result.setup_score.feedback.map((item, i) => (
                          <div key={i} className="alert alert-info">{item}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="skill-analysis">
                    <h3>Skill vs. Drag Analysis</h3>
                    <div className="performance-metrics">
                      <div className="metric-card">
                        <h4>Predicted Score</h4>
                        <div className="value">{result.performance_metrics.predicted_score.toFixed(2)}</div>
                      </div>
                      <div className="metric-card">
                        <h4>Actual Score</h4>
                        <div className="value">{result.performance_metrics.actual_score.toFixed(2)}</div>
                      </div>
                      <div className="metric-card">
                        <h4>Loss</h4>
                        <div className="value">
                          {result.performance_metrics.points_lost.toFixed(2)} pts
                          <br />
                          <span style={{ fontSize: '0.9rem' }}>
                            ({result.performance_metrics.percent_loss.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="coach-verdict">
                    <h3>{"Coach's Verdict"}</h3>
                    {result.performance_metrics.percent_loss < 5 ? (
                      <div className="alert alert-success">
                        Excellent! Your equipment is performing well. Loss &lt; 5%
                      </div>
                    ) : (
                      <div className="recommendations-list">
                        {result.coach_recommendations.map((rec, i) => (
                          <div key={i} className="alert alert-warning">{rec}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ============ SCORE GOAL ============ */}
      {analysisMode === 'goal' && (
        <div className="goal-simulator">
          <div className="goal-inputs">
            <div className="form-group">
              <label>Target Total Score</label>
              <input type="number" value={goalScore} onChange={(e) => handleNumericChange(setGoalScore, e.target.value, 270)} min={0} max={300} />
            </div>
            <div className="form-group">
              <label>Arrows in Round</label>
              <input type="number" value={goalArrows} onChange={(e) => handleNumericChange(setGoalArrows, e.target.value, 30)} min={1} />
            </div>
            <div className="form-group">
              <label>Distance (m)</label>
              <input type="number" value={goalDistance} onChange={(e) => handleNumericChange(setGoalDistance, e.target.value, 18)} />
            </div>
            <div className="form-group">
              <label>Face Size (cm)</label>
              <select value={goalFace} onChange={(e) => setGoalFace(parseInt(e.target.value))}>
                <option value={40}>40</option>
                <option value={60}>60</option>
                <option value={80}>80</option>
                <option value={122}>122</option>
              </select>
            </div>
            {availableRounds.length > 0 && (
              <div className="form-group">
                <label>Compare to Round</label>
                <select value={selectedRoundType} onChange={(e) => setSelectedRoundType(e.target.value)}>
                  <option value="">All sessions</option>
                  {availableRounds.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            )}
          </div>

          {goalQuery.isLoading && <p>Calculating...</p>}
          {goalQuery.data && (
            <div className="goal-results">
              <div className="goal-grid">
                <div className="metric-card">
                  <h4>Required {'\u03C3'}</h4>
                  <div className="value">{goalQuery.data.required_sigma_cm.toFixed(2)} cm</div>
                </div>
                {goalQuery.data.current_sigma_cm !== null && (
                  <div className="metric-card">
                    <h4>Your Current {'\u03C3'}</h4>
                    <div className="value">{goalQuery.data.current_sigma_cm.toFixed(2)} cm</div>
                  </div>
                )}
                {goalQuery.data.current_avg_arrow !== null && (
                  <div className="metric-card">
                    <h4>Current Avg Arrow</h4>
                    <div className="value">{goalQuery.data.current_avg_arrow.toFixed(2)}</div>
                  </div>
                )}
                <div className="metric-card">
                  <h4>Goal Avg Arrow</h4>
                  <div className="value">{goalQuery.data.goal_avg_arrow.toFixed(2)}</div>
                </div>
              </div>

              {goalQuery.data.sigma_improvement_pct !== null && (
                <div className="sigma-bar-container">
                  <label>Group Tightening Required</label>
                  <div className="sigma-bar">
                    <div
                      className={`sigma-bar-fill ${goalQuery.data.sigma_improvement_pct <= 0 ? 'achieved' : goalQuery.data.sigma_improvement_pct < 20 ? 'close' : 'far'}`}
                      style={{ width: `${Math.min(100, Math.max(0, 100 - goalQuery.data.sigma_improvement_pct))}%` }}
                    />
                  </div>
                  <span className="sigma-bar-label">
                    {goalQuery.data.sigma_improvement_pct <= 0 ? 'Goal achieved!' : `${goalQuery.data.sigma_improvement_pct.toFixed(0)}% tighter groups needed`}
                  </span>
                </div>
              )}

              <div className={`alert ${goalQuery.data.sigma_improvement_pct !== null && goalQuery.data.sigma_improvement_pct <= 0 ? 'alert-success' : 'alert-warning'}`}
                style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '4px' }}>
                {goalQuery.data.interpretation}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============ ARROW TRACKER ============ */}
      {analysisMode === 'arrows' && (
        <div className="arrow-tracker">
          {availableRounds.length > 0 && (
            <div className="form-group" style={{ maxWidth: '300px', marginBottom: '1rem' }}>
              <label>Filter by Round</label>
              <select value={selectedRoundType} onChange={(e) => setSelectedRoundType(e.target.value)}>
                <option value="">All rounds</option>
                {availableRounds.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          )}

          {arrowPerfQuery.isLoading && <p>Loading arrow data...</p>}
          {arrowPerfQuery.data && (
            <>
              <div className={`alert ${arrowPerfQuery.data.arrows.length > 0 ? 'alert-info' : 'alert-warning'}`}
                style={{ padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem',
                  background: arrowPerfQuery.data.arrows.length > 0 ? '#d1ecf1' : '#fff3cd',
                  color: arrowPerfQuery.data.arrows.length > 0 ? '#0c5460' : '#856404' }}>
                {arrowPerfQuery.data.interpretation}
              </div>

              {/* ── Precision Grouping ── */}
              {arrowPerfQuery.data.tiers.length > 0 && (
                <div className="precision-groups">
                  <h3 className="precision-groups-title">
                    Precision Groups
                    <span className="precision-groups-subtitle">
                      Ranked by composite precision (group tightness + scoring consistency)
                    </span>
                  </h3>

                  {/* Recommended set callout */}
                  {arrowPerfQuery.data.primary_set.length > 0 && (
                    <div className="primary-set-callout">
                      <div className="primary-set-icon">🏆</div>
                      <div className="primary-set-body">
                        <strong>Competition Set ({arrowPerfQuery.data.group_size} arrows)</strong>
                        <p>
                          Use arrows{' '}
                          {arrowPerfQuery.data.primary_set.map((n, i) => (
                            <span key={n}>
                              {i > 0 && ', '}
                              <strong>#{n}</strong>
                            </span>
                          ))}
                          {' '}for your best precision.
                        </p>
                      </div>
                      <button
                        className="primary-set-show-btn"
                        onClick={() => setSelectedArrows(new Set(arrowPerfQuery.data!.primary_set))}
                      >
                        Show on target
                      </button>
                    </div>
                  )}

                  <div className="tier-cards">
                    {arrowPerfQuery.data.tiers.map(tier => (
                      <div key={tier.name} className={`tier-card tier-${tier.name}`}>
                        <div className="tier-header">
                          <span className={`tier-badge tier-badge-${tier.name}`}>{tier.label}</span>
                          <span className="tier-count">{tier.arrow_numbers.length} arrow{tier.arrow_numbers.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="tier-arrows">
                          {tier.arrow_numbers.map(num => (
                            <span key={num} className="tier-arrow-chip">#{num}</span>
                          ))}
                        </div>
                        <div className="tier-stats">
                          <div className="tier-stat">
                            <span className="tier-stat-label">Avg Score</span>
                            <span className="tier-stat-value">{tier.avg_score.toFixed(2)}</span>
                          </div>
                          <div className="tier-stat">
                            <span className="tier-stat-label">Avg Radius</span>
                            <span className="tier-stat-value">{tier.avg_radius.toFixed(2)} cm</span>
                          </div>
                          <div className="tier-stat">
                            <span className="tier-stat-label">Precision</span>
                            <span className="tier-stat-value">{tier.avg_precision_score.toFixed(2)}</span>
                          </div>
                        </div>
                        <button
                          className="tier-show-btn"
                          onClick={() => setSelectedArrows(new Set(tier.arrow_numbers))}
                        >
                          Show group
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {arrowPerfQuery.data.arrows.length > 0 && (() => {
                const ARROW_COLORS = ['#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4', 
                  '#42d4f4', '#f032e6', '#bfef45', '#fabed4', '#469990', '#dcbeff', '#9A6324'];
                
                const allArrowNumbers = arrowPerfQuery.data.arrows.map(a => a.arrow_number);
                const allSelected = allArrowNumbers.every(num => selectedArrows.has(num));
                
                const toggleAll = () => {
                  if (allSelected) {
                    setSelectedArrows(new Set());
                  } else {
                    setSelectedArrows(new Set(allArrowNumbers));
                  }
                };

                const toggleArrow = (num: number) => {
                  const newSet = new Set(selectedArrows);
                  if (newSet.has(num)) {
                    newSet.delete(num);
                  } else {
                    newSet.add(num);
                  }
                  setSelectedArrows(newSet);
                };

                // Build color map using original index so colors stay stable when toggling
                const arrowColorMap = new Map(
                  arrowPerfQuery.data.arrows.map((a, i) => [a.arrow_number, ARROW_COLORS[i % ARROW_COLORS.length]])
                );

                // Build shots for TargetFace
                const filteredShots = arrowPerfQuery.data.arrows
                  .filter(arrow => selectedArrows.has(arrow.arrow_number))
                  .flatMap(arrow => {
                    const color = arrowColorMap.get(arrow.arrow_number)!;
                    return arrow.shots.map(shot => ({
                      x: shot.x,
                      y: shot.y,
                      score: shot.score,
                      arrow_number: arrow.arrow_number,
                      color,
                    }));
                  });

                // Compute centroids (centre of mass) per selected arrow
                const centroids = arrowPerfQuery.data.arrows
                  .filter(arrow => selectedArrows.has(arrow.arrow_number) && arrow.shots.length > 0)
                  .map(arrow => {
                    const cx = arrow.shots.reduce((s, sh) => s + sh.x, 0) / arrow.shots.length;
                    const cy = arrow.shots.reduce((s, sh) => s + sh.y, 0) / arrow.shots.length;
                    return {
                      x: cx,
                      y: cy,
                      label: `#${arrow.arrow_number}`,
                      color: arrowColorMap.get(arrow.arrow_number)!,
                    };
                  });

                // Build heatmap contour traces per selected arrow
                const heatmapTraces: any[] = [];
                if (showHeatmap) {
                  const faceCm = arrowPerfQuery.data.face_cm;
                  arrowPerfQuery.data.arrows
                    .filter(arrow => selectedArrows.has(arrow.arrow_number) && arrow.shots.length >= 3)
                    .forEach(arrow => {
                      const color = arrowColorMap.get(arrow.arrow_number)!;
                      heatmapTraces.push({
                        type: 'histogram2dcontour',
                        x: arrow.shots.map(s => s.x),
                        y: arrow.shots.map(s => s.y),
                        colorscale: [[0, 'rgba(255,255,255,0)'], [1, color]],
                        showscale: false,
                        ncontours: 6,
                        contours: { coloring: 'fill' },
                        line: { width: 1, color },
                        opacity: 0.4,
                        hoverinfo: 'skip',
                        xaxis: 'x',
                        yaxis: 'y',
                        autobinx: false,
                        autobiny: false,
                        xbins: { start: -faceCm / 2, end: faceCm / 2, size: faceCm / 20 },
                        ybins: { start: -faceCm / 2, end: faceCm / 2, size: faceCm / 20 },
                      });
                    });
                }

                const selectedArrowsList = arrowPerfQuery.data.arrows.filter(a => selectedArrows.has(a.arrow_number));

                return (
                  <>
                    <div className="arrow-heatmap-layout">
                      <div className="arrow-selector">
                        <label className="toggle-all">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={toggleAll}
                          />
                          All arrows
                        </label>
                        {arrowPerfQuery.data.arrows.map((arrow, idx) => (
                          <label key={arrow.arrow_number}>
                            <input
                              type="checkbox"
                              checked={selectedArrows.has(arrow.arrow_number)}
                              onChange={() => toggleArrow(arrow.arrow_number)}
                            />
                            <span
                              className="arrow-color-dot"
                              style={{ background: ARROW_COLORS[idx % ARROW_COLORS.length] }}
                            />
                            Arrow #{arrow.arrow_number}
                          </label>
                        ))}
                        <hr className="selector-divider" />
                        <label className="heatmap-toggle">
                          <input
                            type="checkbox"
                            checked={showHeatmap}
                            onChange={() => setShowHeatmap(!showHeatmap)}
                          />
                          🌡️ Density heatmap
                        </label>
                      </div>

                      <div className="target-face-container">
                        <Suspense fallback={<p>Loading target...</p>}>
                          <TargetFace
                            faceSizeCm={arrowPerfQuery.data.face_cm}
                            faceType="WA"
                            shots={filteredShots}
                            interactive={false}
                            width={500}
                            height={500}
                            markerOpacity={0.2}
                            centroids={centroids}
                            extraTraces={heatmapTraces}
                          />
                        </Suspense>
                      </div>
                    </div>

                    {selectedArrowsList.length === 1 && (() => {
                      const arrow = selectedArrowsList[0];
                      return (
                        <div className="arrow-single-stats">
                          <div className="mini-card">
                            <h5>Avg Score</h5>
                            <div className="value">{arrow.avg_score.toFixed(2)}</div>
                          </div>
                          <div className="mini-card">
                            <h5>Total Shots</h5>
                            <div className="value">{arrow.total_shots}</div>
                          </div>
                          <div className="mini-card">
                            <h5>Avg Radius</h5>
                            <div className="value">{arrow.avg_radius.toFixed(2)} cm</div>
                          </div>
                          <div className="mini-card">
                            <h5>X Count</h5>
                            <div className="value">{arrow.x_count}</div>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="arrow-table-container">
                      <table className="arrow-table">
                        <thead>
                          <tr>
                            <th>Rank</th>
                            <th>Arrow #</th>
                            <th>Tier</th>
                            <th>Shots</th>
                            <th>Avg Score</th>
                            <th>Std Dev</th>
                            <th>Avg Radius</th>
                            <th>Precision</th>
                            <th>X's</th>
                            <th>10's</th>
                            <th>Misses</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedArrowsList
                            .slice()
                            .sort((a, b) => a.precision_rank - b.precision_rank)
                            .map(a => (
                            <tr key={a.arrow_number}
                              className={`tier-row-${a.tier}`}>
                              <td><strong>{a.precision_rank}</strong></td>
                              <td>
                                <span
                                  className="arrow-color-dot"
                                  style={{ 
                                    background: arrowColorMap.get(a.arrow_number),
                                    marginRight: '0.5rem'
                                  }}
                                />
                                <strong>#{a.arrow_number}</strong>
                              </td>
                              <td><span className={`tier-badge-sm tier-badge-${a.tier}`}>{a.tier}</span></td>
                              <td>{a.total_shots}</td>
                              <td>{a.avg_score.toFixed(2)}</td>
                              <td>{a.std_score.toFixed(2)}</td>
                              <td>{a.avg_radius.toFixed(2)}</td>
                              <td>{a.precision_score.toFixed(2)}</td>
                              <td>{a.x_count}</td>
                              <td>{a.ten_count}</td>
                              <td>{a.miss_count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="arrow-meta">
                        {arrowPerfQuery.data.total_shots_with_number} shots with arrow numbers,{' '}
                        {arrowPerfQuery.data.total_shots_without_number} without
                      </p>
                    </div>
                  </>
                );
              })()}
            </>
          )}
        </div>
      )}
    </div>
  );
}
