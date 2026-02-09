import type { ShotInProgress } from './useSessionLogger';

interface EndControlsProps {
  currentEndNumber: number;
  shotsInEnd: ShotInProgress[];
  onSaveEnd: () => void;
  isSaving: boolean;
}

export default function EndControls({
  currentEndNumber,
  shotsInEnd,
  onSaveEnd,
  isSaving,
}: EndControlsProps) {
  const currentScore = shotsInEnd.reduce((sum, s) => sum + s.score, 0);
  const hasShots = shotsInEnd.length > 0;

  return (
    <div className="end-controls">
      <div className="end-info">
        <h3>End {currentEndNumber}</h3>
        <p className="current-score">Score: {currentScore}</p>
        <p className="arrow-count">{shotsInEnd.length} arrows shot</p>
      </div>

      <button
        className="btn-save-end"
        onClick={onSaveEnd}
        disabled={!hasShots || isSaving}
      >
        {isSaving ? 'Saving...' : 'Save End'}
      </button>
    </div>
  );
}
