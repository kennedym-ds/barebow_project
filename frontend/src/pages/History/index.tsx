import { useState } from 'react';
import { useSessions, useSession, useDeleteSession } from '../../api/sessions';
import TargetFace from '../../components/TargetFace';
import './History.css';

export default function History() {
  const { data: sessions, isLoading } = useSessions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: session } = useSession(selectedId);
  const deleteSession = useDeleteSession();

  const handleDelete = async () => {
    if (!selectedId) return;
    
    const confirmed = window.confirm(
      'Are you sure you want to delete this session? This action cannot be undone.'
    );
    
    if (confirmed) {
      try {
        await deleteSession.mutateAsync(selectedId);
        setSelectedId(null);
      } catch (error) {
        console.error('Failed to delete session:', error);
        alert('Failed to delete session. Please try again.');
      }
    }
  };

  if (isLoading) {
    return <div className="history-page">Loading sessions...</div>;
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div className="history-page">
        <h1>📜 Session History</h1>
        <div className="empty-state">
          <p>No sessions recorded yet.</p>
          <p>Go to the <strong>Session Logger</strong> to start shooting!</p>
        </div>
      </div>
    );
  }

  const allShots = session?.ends.flatMap(end => end.shots) || [];
  const totalScore = allShots.reduce((sum, s) => sum + s.score, 0);
  const avgScore = allShots.length > 0 ? totalScore / allShots.length : 0;

  return (
    <div className="history-page">
      <h1>📜 Session History</h1>

      {/* Session Selector */}
      <div className="session-selector">
        <div className="selector-wrapper">
          <label htmlFor="session-select">Select a Session:</label>
          <select
            id="session-select"
            value={selectedId || ''}
            onChange={(e) => setSelectedId(e.target.value || null)}
          >
            <option value="">-- Choose a session --</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {new Date(s.date).toLocaleString()} | {s.round_type} ({s.distance_m}m) | Score: {s.total_score}
              </option>
            ))}
          </select>
        </div>
        
        {selectedId && (
          <button 
            className="delete-btn" 
            onClick={handleDelete}
            disabled={deleteSession.isPending}
          >
            🗑️ Delete Selected Session
          </button>
        )}
      </div>

      {/* Detail View */}
      {session && (
        <>
          <hr />
          
          {/* Stats Row */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-label">Total Score</div>
              <div className="stat-value">{totalScore}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Average Arrow</div>
              <div className="stat-value">{avgScore.toFixed(2)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Arrows</div>
              <div className="stat-value">{allShots.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Ends</div>
              <div className="stat-value">{session.ends.length}</div>
            </div>
          </div>

          {/* Main Content */}
          <div className="content-row">
            {/* Left: Heatmap */}
            <div className="heatmap-section">
              <h2>🎯 Heatmap</h2>
              {allShots.length > 0 ? (
                <TargetFace
                  faceSizeCm={session.target_face_size_cm}
                  faceType="WA"
                  shots={allShots.map(s => ({
                    x: s.x,
                    y: s.y,
                    score: s.score,
                    arrow_number: s.arrow_number || undefined,
                  }))}
                  interactive={false}
                  width={450}
                  height={450}
                />
              ) : (
                <p>No shots to plot.</p>
              )}
            </div>

            {/* Right: Scorecard */}
            <div className="scorecard-section">
              <h2>📝 Scorecard</h2>
              
              {/* Metadata */}
              <div className="session-metadata">
                <p><strong>Date:</strong> {new Date(session.date).toLocaleString()}</p>
                <p><strong>Round:</strong> {session.round_type}</p>
                <p><strong>Equipment:</strong> {session.bow?.name || 'Unknown Bow'} / {session.arrow ? `${session.arrow.make} ${session.arrow.model}` : 'Unknown Arrow'}</p>
                {session.notes && (
                  <div className="notes">
                    <strong>Notes:</strong> {session.notes}
                  </div>
                )}
              </div>

              {/* Scorecard Table */}
              <table className="scorecard-table">
                <thead>
                  <tr>
                    <th>End</th>
                    <th>Arrows</th>
                    <th>End Score</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {session.ends
                    .sort((a, b) => a.end_number - b.end_number)
                    .map((end, idx) => {
                      const endScore = end.shots.reduce((sum, s) => sum + s.score, 0);
                      const runningTotal = session.ends
                        .filter(e => e.end_number <= end.end_number)
                        .reduce((sum, e) => sum + e.shots.reduce((s, shot) => s + shot.score, 0), 0);
                      
                      const shotScores = end.shots
                        .map(s => s.score)
                        .sort((a, b) => b - a)
                        .join(', ');

                      return (
                        <tr key={end.id}>
                          <td>{end.end_number}</td>
                          <td>{shotScores}</td>
                          <td>{endScore}</td>
                          <td>{runningTotal}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
