import { useState, useMemo } from 'react';
import { useBows } from '../../api/bows';
import { useArrows } from '../../api/arrows';
import { useSessions } from '../../api/sessions';
import { useVirtualCoach, type VirtualCoachRequest, type VirtualCoachResult } from '../../api/analysis';
import type { SessionSummary } from '../../types/models';
import './AnalysisLab.css';

type InputMode = 'database' | 'manual';

export default function AnalysisLab() {
  const [inputMode, setInputMode] = useState<InputMode>('database');
  const [selectedBowId, setSelectedBowId] = useState<string>('');
  const [selectedArrowId, setSelectedArrowId] = useState<string>('');
  
  // Database mode state
  const [selectedShortSessionId, setSelectedShortSessionId] = useState<string>('');
  const [selectedLongSessionId, setSelectedLongSessionId] = useState<string>('');
  
  // Manual mode state
  const [shortDistance, setShortDistance] = useState<number>(18);
  const [shortFace, setShortFace] = useState<number>(40);
  const [shortScore, setShortScore] = useState<number>(9.0);
  const [longDistance, setLongDistance] = useState<number>(50);
  const [longFace, setLongFace] = useState<number>(122);
  const [longScore, setLongScore] = useState<number>(7.5);
  
  const { data: bows } = useBows();
  const { data: arrows } = useArrows();
  const { data: allSessions } = useSessions(selectedBowId, selectedArrowId);
  const virtualCoach = useVirtualCoach();
  
  // Filter sessions by distance
  const { shortSessions, longSessions } = useMemo(() => {
    if (!allSessions) return { shortSessions: [], longSessions: [] };
    
    return {
      shortSessions: allSessions.filter(s => s.distance_m <= 30),
      longSessions: allSessions.filter(s => s.distance_m > 30),
    };
  }, [allSessions]);
  
  // Calculate session averages
  const getSessionAverage = (session: SessionSummary): number => {
    if (!session.total_shots || session.total_shots === 0) return 0;
    return session.total_score / session.total_shots;
  };
  
  // Get selected sessions
  const selectedShortSession = shortSessions.find(s => s.id === selectedShortSessionId);
  const selectedLongSession = longSessions.find(s => s.id === selectedLongSessionId);
  
  const handleAnalyze = () => {
    if (!selectedBowId || !selectedArrowId) {
      alert('Please select both bow and arrow');
      return;
    }
    
    let request: VirtualCoachRequest;
    
    if (inputMode === 'database') {
      if (!selectedShortSession || !selectedLongSession) {
        alert('Please select both short and long distance sessions');
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
      <h1>🧪 Virtual Coach Analysis</h1>
      <p>
        This module uses the <strong>James Park Model</strong> to separate your <strong>Skill</strong> from your <strong>Equipment</strong> errors.
        By comparing your performance at two different distances, we can calculate how much score you are losing to drag, drift, and tuning issues.
      </p>
      
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
                <input
                  type="radio"
                  value="database"
                  checked={inputMode === 'database'}
                  onChange={() => setInputMode('database')}
                />
                Select from Database
              </label>
              <label>
                <input
                  type="radio"
                  value="manual"
                  checked={inputMode === 'manual'}
                  onChange={() => setInputMode('manual')}
                />
                Manual Entry
              </label>
            </div>
          </div>
          
          {inputMode === 'database' ? (
            <div className="input-section">
              <div className="session-column">
                <h3>Short Distance (≤30m)</h3>
                <div className="form-group">
                  <label>Select Session</label>
                  <select
                    value={selectedShortSessionId}
                    onChange={(e) => setSelectedShortSessionId(e.target.value)}
                  >
                    <option value="">-- Choose Session --</option>
                    {shortSessions.map(session => (
                      <option key={session.id} value={session.id}>
                        {session.date} - {session.round_type} ({session.distance_m}m)
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
                <h3>Long Distance (&gt;30m)</h3>
                <div className="form-group">
                  <label>Select Session</label>
                  <select
                    value={selectedLongSessionId}
                    onChange={(e) => setSelectedLongSessionId(e.target.value)}
                  >
                    <option value="">-- Choose Session --</option>
                    {longSessions.map(session => (
                      <option key={session.id} value={session.id}>
                        {session.date} - {session.round_type} ({session.distance_m}m)
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
                  <input
                    type="number"
                    value={shortDistance}
                    onChange={(e) => setShortDistance(parseFloat(e.target.value))}
                    step="0.1"
                  />
                </div>
                <div className="form-group">
                  <label>Target Face (cm)</label>
                  <select value={shortFace} onChange={(e) => setShortFace(parseInt(e.target.value))}>
                    <option value={40}>40</option>
                    <option value={60}>60</option>
                    <option value={80}>80</option>
                    <option value={122}>122</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Average Score (0-10)</label>
                  <input
                    type="number"
                    value={shortScore}
                    onChange={(e) => setShortScore(parseFloat(e.target.value))}
                    step="0.1"
                    min={0}
                    max={10}
                  />
                </div>
              </div>
              
              <div className="manual-column">
                <h3>Long Distance</h3>
                <div className="form-group">
                  <label>Distance (m)</label>
                  <input
                    type="number"
                    value={longDistance}
                    onChange={(e) => setLongDistance(parseFloat(e.target.value))}
                    step="0.1"
                  />
                </div>
                <div className="form-group">
                  <label>Target Face (cm)</label>
                  <select value={longFace} onChange={(e) => setLongFace(parseInt(e.target.value))}>
                    <option value={40}>40</option>
                    <option value={60}>60</option>
                    <option value={80}>80</option>
                    <option value={122}>122</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Average Score (0-10)</label>
                  <input
                    type="number"
                    value={longScore}
                    onChange={(e) => setLongScore(parseFloat(e.target.value))}
                    step="0.1"
                    min={0}
                    max={10}
                  />
                </div>
              </div>
            </div>
          )}
          
          <button
            className="analyze-button"
            onClick={handleAnalyze}
            disabled={virtualCoach.isPending}
          >
            {virtualCoach.isPending ? 'Analyzing...' : 'Analyze Performance'}
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
                    result.safety.map((warning, idx) => (
                      <div key={idx} className="alert alert-danger">
                        ⚠️ {warning}
                      </div>
                    ))
                  ) : (
                    <div className="alert alert-success">
                      ✅ No safety concerns detected
                    </div>
                  )}
                </div>
                
                {result.setup_score.feedback.length > 0 && (
                  <div className="alert-list">
                    {result.setup_score.feedback.map((item, idx) => (
                      <div key={idx} className="alert alert-info">
                        {item}
                      </div>
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
                <h3>Coach's Verdict</h3>
                {result.performance_metrics.percent_loss < 5 ? (
                  <div className="alert alert-success">
                    ✅ Excellent! Your equipment is performing well. Loss &lt; 5%
                  </div>
                ) : (
                  <div className="recommendations-list">
                    {result.coach_recommendations.map((rec, idx) => (
                      <div key={idx} className="alert alert-warning">
                        💡 {rec}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
