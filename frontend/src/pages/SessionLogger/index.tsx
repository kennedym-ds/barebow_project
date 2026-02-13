import { useSessionLogger } from './useSessionLogger';
import { useCreateSession, useSaveEnd } from '../../api/sessions';
import { useToast } from '../../components/Toast';
import SessionConfig from './SessionConfig';
import TargetPlot from './TargetPlot';
import QuiverPanel from './QuiverPanel';
import EndControls from './EndControls';
import StatsTable from './StatsTable';
import './SessionLogger.css';

export default function SessionLogger() {
  const { state, actions } = useSessionLogger();
  const createSession = useCreateSession();
  const saveEnd = useSaveEnd();
  const { toast } = useToast();

  const handleStartSession = async (config: {
    bowId?: string;
    arrowId?: string;
    roundType: string;
    faceSizeCm: number;
    distanceM: number;
    faceType: 'WA' | 'Flint';
    xIs11: boolean;
    arrowsPerEnd: number;
    totalArrows: number;
    arrowCount: number;
    shaftDiameterMm: number;
    notes: string;
  }) => {
    try {
      const session = await createSession.mutateAsync({
        bow_id: config.bowId,
        arrow_id: config.arrowId,
        round_type: config.roundType,
        target_face_size_cm: config.faceSizeCm,
        distance_m: config.distanceM,
        notes: config.notes,
      });

      actions.startSession({
        sessionId: session.id,
        ...config,
      });
    } catch (error) {
      console.error('Failed to create session:', error);
      toast('Failed to create session. Please try again.', 'error');
    }
  };

  const handleSaveEnd = async () => {
    if (!state.sessionId || state.shotsInCurrentEnd.length === 0) return;

    try {
      const end = await saveEnd.mutateAsync({
        sessionId: state.sessionId,
        data: {
          end_number: state.currentEndNumber,
          shots: state.shotsInCurrentEnd.map(s => ({
            score: s.score,
            is_x: s.is_x,
            x: s.x,
            y: s.y,
            arrow_number: s.arrow_number,
          })),
        },
      });

      actions.endSaved(end);
    } catch (error) {
      console.error('Failed to save end:', error);
      toast('Failed to save end. Please try again.', 'error');
    }
  };

  // Configuring phase
  if (state.phase === 'configuring') {
    return (
      <div className="session-logger">
        <SessionConfig onStartSession={handleStartSession} />
      </div>
    );
  }

  // Complete phase
  if (state.phase === 'complete') {
    const totalScore = state.savedEnds.reduce(
      (sum, end) => sum + end.shots.reduce((s, shot) => s + shot.score, 0),
      0
    );
    const totalShots = state.savedEnds.reduce(
      (sum, end) => sum + end.shots.length,
      0
    );
    const average = totalShots > 0 ? totalScore / totalShots : 0;

    return (
      <div className="session-logger session-complete">
        <h2>Session Complete!</h2>
        <div className="summary-stats">
          <div className="stat-card">
            <div className="stat-label">Total Score</div>
            <div className="stat-value">{totalScore}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Arrows</div>
            <div className="stat-value">{totalShots}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Average Score</div>
            <div className="stat-value">{average.toFixed(2)}</div>
          </div>
        </div>
        <button className="btn-primary" onClick={() => window.location.href = '/'}>
          Return to Home
        </button>
      </div>
    );
  }

  // Logging phase
  return (
    <div className="session-logger logging-active">
      <header className="session-header">
        <h1>Session Logger</h1>
        <div className="session-info">
          <span>{state.roundType}</span>
          <span>{state.distanceM}m</span>
          <span>{state.faceSizeCm}cm face</span>
        </div>
        <button 
          className="btn-end-session" 
          onClick={actions.endSessionEarly}
        >
          End Session Early
        </button>
      </header>

      <div className="logging-layout">
        <div className="target-area">
          <TargetPlot
            faceSizeCm={state.faceSizeCm}
            faceType={state.faceType}
            shotsInCurrentEnd={state.shotsInCurrentEnd}
            savedEnds={state.savedEnds}
            viewMode={state.viewMode}
            onPlaceShot={actions.placeShot}
            onToggleView={actions.toggleView}
            shaftDiameterMm={state.shaftDiameterMm}
            xIs11={state.xIs11}
          />
        </div>

        <div className="controls-area">
          <QuiverPanel
            arrowCount={state.arrowCount}
            arrowsPerEnd={state.arrowsPerEnd}
            activeArrow={state.activeArrow}
            shotsInEnd={state.shotsInCurrentEnd}
            onSelectArrow={actions.selectArrow}
          />

          <EndControls
            currentEndNumber={state.currentEndNumber}
            shotsInEnd={state.shotsInCurrentEnd}
            onSaveEnd={handleSaveEnd}
            isSaving={saveEnd.isPending}
          />
        </div>
      </div>

      <div className="stats-area">
        <StatsTable
          savedEnds={state.savedEnds}
          currentEndNumber={state.currentEndNumber}
          shotsInCurrentEnd={state.shotsInCurrentEnd}
        />
      </div>
    </div>
  );
}
