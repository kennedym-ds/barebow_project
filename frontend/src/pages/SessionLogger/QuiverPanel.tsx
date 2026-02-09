import type { ShotInProgress } from './useSessionLogger';

interface QuiverPanelProps {
  arrowCount: number; // total in quiver (e.g., 12)
  arrowsPerEnd: number; // how many per end (e.g., 3)
  activeArrow: number;
  shotsInEnd: ShotInProgress[];
  onSelectArrow: (num: number) => void;
}

export default function QuiverPanel({
  arrowCount,
  arrowsPerEnd,
  activeArrow,
  shotsInEnd,
  onSelectArrow,
}: QuiverPanelProps) {
  const shotMap = new Map(shotsInEnd.map(s => [s.arrow_number, s]));

  return (
    <div className="quiver-panel">
      <h3>The Quiver</h3>
      <p className="active-indicator">Active: Arrow #{activeArrow}</p>
      
      <div className="quiver-grid">
        {Array.from({ length: arrowCount }, (_, i) => i + 1).map(num => {
          const shot = shotMap.get(num);
          const isActive = num === activeArrow;
          const isUsableThisEnd = num <= arrowsPerEnd;

          return (
            <button
              key={num}
              className={`quiver-arrow ${isActive ? 'active' : ''} ${shot ? 'shot' : ''} ${!isUsableThisEnd ? 'disabled' : ''}`}
              onClick={() => isUsableThisEnd && onSelectArrow(num)}
              disabled={!isUsableThisEnd}
            >
              <div className="arrow-number">#{num}</div>
              {shot && <div className="arrow-score">[{shot.score}]</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
