import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { useSessions, useSession, useDeleteSession } from '../../api/sessions';
import type { Session, End, Shot } from '../../types/models';
import { useToast } from '../../components/Toast';
import './History.css';

const TargetFace = lazy(() => import('../../components/TargetFace'));

function exportSessionCSV(session: Session) {
  const rows: string[] = ['Date,Round,Distance_m,Face_cm,End,Arrow,Score,X_cm,Y_cm,Is_X'];
  const dateStr = new Date(session.date).toISOString().slice(0, 19);
  const sortedEnds = [...session.ends].sort((a: End, b: End) => a.end_number - b.end_number);
  
  for (const end of sortedEnds) {
    const sortedShots = [...end.shots].sort((a: Shot, b: Shot) => (a.arrow_number ?? Infinity) - (b.arrow_number ?? Infinity));
    for (const shot of sortedShots) {
      rows.push([
        dateStr,
        session.round_type,
        session.distance_m,
        session.target_face_size_cm,
        end.end_number,
        shot.arrow_number ?? '',
        shot.score,
        shot.x?.toFixed(2) ?? '',
        shot.y?.toFixed(2) ?? '',
        shot.is_x ? 'TRUE' : 'FALSE',
      ].join(','));
    }
  }
  
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `session_${dateStr.replace(/[T:]/g, '-')}_${session.round_type}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function History() {
  const { data: sessions, isLoading, isError: sessionsError, error: sessionsErrorObj } = useSessions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: session, isError: sessionError, error: sessionErrorObj } = useSession(selectedId);
  const deleteSession = useDeleteSession();
  const { toast } = useToast();

  // Replay state
  const [replayEnd, setReplayEnd] = useState<number | null>(null); // null = show all
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Computed values (must be before any early returns for hook ordering)
  const sessionEnds = useMemo(() => Array.isArray(session?.ends) ? session!.ends : [], [session]);
  const allShots = useMemo(() => sessionEnds.flatMap(end => Array.isArray(end.shots) ? end.shots : []), [sessionEnds]);
  const totalScore = allShots.reduce((sum, s) => sum + s.score, 0);
  const avgScore = allShots.length > 0 ? totalScore / allShots.length : 0;
  const sortedEnds = useMemo(() => [...sessionEnds].sort((a, b) => a.end_number - b.end_number), [sessionEnds]);
  const totalEnds = sortedEnds.length;

  // Replay: filter shots up to current end
  const visibleShots = useMemo(() =>
    replayEnd === null
      ? allShots
      : sortedEnds.filter(e => e.end_number <= replayEnd).flatMap(e => e.shots),
    [replayEnd, allShots, sortedEnds]
  );

  // Auto-advance playback
  useEffect(() => {
    if (playing && replayEnd !== null && totalEnds > 0) {
      timerRef.current = setInterval(() => {
        setReplayEnd(prev => {
          if (prev === null || prev >= sortedEnds[totalEnds - 1].end_number) {
            setPlaying(false);
            return prev;
          }
          const curIdx = sortedEnds.findIndex(e => e.end_number === prev);
          return sortedEnds[Math.min(curIdx + 1, totalEnds - 1)].end_number;
        });
      }, 1200);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [playing, replayEnd, totalEnds, sortedEnds]);

  // Reset replay when session changes
  useEffect(() => {
    setReplayEnd(null);
    setPlaying(false);
  }, [selectedId]);

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
        toast('Failed to delete session. Please try again.', 'error');
      }
    }
  };

  if (isLoading) {
    return <div className="history-page">Loading sessions...</div>;
  }

  if (sessionsError) {
    return (
      <div className="history-page">
        <h1>📜 Session History</h1>
        <div className="empty-state">
          <p>Could not load sessions right now.</p>
          <p style={{ color: '#b00020' }}>{String(sessionsErrorObj ?? 'Unknown error')}</p>
        </div>
      </div>
    );
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

  return (
    <div className="history-page">
      <h1>📜 Session History</h1>

      {sessionError && (
        <div className="empty-state" style={{ marginTop: '1rem' }}>
          <p>Could not load this session detail.</p>
          <p style={{ color: '#b00020' }}>{String(sessionErrorObj ?? 'Unknown error')}</p>
        </div>
      )}

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
          <div className="session-actions">
            {session && (
              <button className="export-btn" onClick={() => exportSessionCSV(session)}>
                📥 Export CSV
              </button>
            )}
            <button 
              className="delete-btn" 
              onClick={handleDelete}
              disabled={deleteSession.isPending}
            >
              🗑️ Delete Selected Session
            </button>
          </div>
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
              <div className="stat-value">{sessionEnds.length}</div>
            </div>
          </div>

          {/* Main Content */}
          <div className="content-row">
            {/* Left: Heatmap */}
            <div className="heatmap-section">
              <h2>🎯 Heatmap</h2>
              {allShots.length > 0 ? (
                <Suspense fallback={<p>Loading target view...</p>}>
                  <TargetFace
                    faceSizeCm={session.target_face_size_cm}
                    faceType={session.round_type?.toLowerCase().includes('flint') ? 'Flint' : 'WA'}
                    shots={visibleShots.map(s => ({
                      x: s.x,
                      y: s.y,
                      score: s.score,
                      arrow_number: s.arrow_number || undefined,
                    }))}
                    interactive={false}
                    width={450}
                    height={450}
                  />
                </Suspense>
              ) : (
                <p>No shots to plot.</p>
              )}

              {/* Replay controls */}
              {totalEnds > 1 && (
                <div className="replay-controls">
                  <button className="replay-btn" onClick={() => {
                    if (replayEnd === null) {
                      setReplayEnd(sortedEnds[0].end_number);
                      setPlaying(true);
                    } else {
                      setPlaying(!playing);
                    }
                  }}>
                    {playing ? '⏸ Pause' : replayEnd === null ? '▶ Replay' : '▶ Play'}
                  </button>
                  <button className="replay-btn" disabled={replayEnd === null} onClick={() => {
                    setPlaying(false);
                    setReplayEnd(prev => {
                      if (prev === null) return null;
                      const idx = sortedEnds.findIndex(e => e.end_number === prev);
                      return idx > 0 ? sortedEnds[idx - 1].end_number : prev;
                    });
                  }}>⏮</button>
                  <button className="replay-btn" disabled={replayEnd === null} onClick={() => {
                    setPlaying(false);
                    setReplayEnd(prev => {
                      if (prev === null) return null;
                      const idx = sortedEnds.findIndex(e => e.end_number === prev);
                      return idx < totalEnds - 1 ? sortedEnds[idx + 1].end_number : prev;
                    });
                  }}>⏭</button>
                  <button className="replay-btn" disabled={replayEnd === null} onClick={() => { setPlaying(false); setReplayEnd(null); }}>Show All</button>
                  <span className="replay-label">
                    {replayEnd === null ? `All ${totalEnds} ends` : `End ${replayEnd} of ${sortedEnds[totalEnds-1].end_number}`}
                  </span>
                </div>
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
                    .map((end) => {
                      const safeShots = Array.isArray(end.shots) ? end.shots : [];
                      const endScore = safeShots.reduce((sum, s) => sum + s.score, 0);
                      const runningTotal = sessionEnds
                        .filter(e => e.end_number <= end.end_number)
                        .reduce((sum, e) => {
                          const shots = Array.isArray(e.shots) ? e.shots : [];
                          return sum + shots.reduce((s, shot) => s + shot.score, 0);
                        }, 0);
                      
                      const shotScores = safeShots
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
