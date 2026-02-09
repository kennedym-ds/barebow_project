import TargetFace from '../../components/TargetFace';
import type { FaceType, End } from '../../types/models';
import type { ShotInProgress } from './useSessionLogger';

interface TargetPlotProps {
  faceSizeCm: number;
  faceType: FaceType;
  shotsInCurrentEnd: ShotInProgress[];
  savedEnds: End[];
  viewMode: 'current' | 'cumulative';
  onPlaceShot: (x: number, y: number) => void;
  onToggleView: () => void;
}

export default function TargetPlot({
  faceSizeCm,
  faceType,
  shotsInCurrentEnd,
  savedEnds,
  viewMode,
  onPlaceShot,
  onToggleView,
}: TargetPlotProps) {
  // Build shot array for rendering
  const shots = [];

  if (viewMode === 'cumulative') {
    // Show all previous shots in white/grey
    for (const end of savedEnds) {
      for (const shot of end.shots) {
        shots.push({
          x: shot.x,
          y: shot.y,
          score: shot.score,
          arrow_number: shot.arrow_number || undefined,
          color: 'rgba(255, 255, 255, 0.8)',
        });
      }
    }
  }

  // Add current end shots in green
  for (const shot of shotsInCurrentEnd) {
    shots.push({
      x: shot.x,
      y: shot.y,
      score: shot.score,
      arrow_number: shot.arrow_number,
      color: '#00FF00', // Neon green
    });
  }

  return (
    <div className="target-plot">
      <div className="view-mode-toggle">
        <button onClick={onToggleView}>
          {viewMode === 'current' ? 'Show Cumulative' : 'Show Current End'}
        </button>
      </div>

      <TargetFace
        faceSizeCm={faceSizeCm}
        faceType={faceType}
        shots={shots}
        onPlotClick={onPlaceShot}
        showMedianCenter={viewMode === 'cumulative' && shots.length > 0}
        width={600}
        height={600}
        interactive={true}
      />
    </div>
  );
}
