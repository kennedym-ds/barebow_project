import type { End } from '../../types/models';
import type { ShotInProgress } from './useSessionLogger';

interface StatsTableProps {
  savedEnds: End[];
  currentEndNumber: number;
  shotsInCurrentEnd: ShotInProgress[];
}

interface EndStats {
  endNumber: number;
  score: number;
  arrows: number;
  runningTotal: number;
  runningAverage: number;
  isCurrent: boolean;
}

export default function StatsTable({
  savedEnds,
  currentEndNumber,
  shotsInCurrentEnd,
}: StatsTableProps) {
  const stats: EndStats[] = [];
  let runningTotal = 0;
  let totalArrows = 0;

  // Add saved ends
  savedEnds.forEach(end => {
    const score = end.shots.reduce((sum, s) => sum + s.score, 0);
    const arrows = end.shots.length;
    runningTotal += score;
    totalArrows += arrows;

    stats.push({
      endNumber: end.end_number,
      score,
      arrows,
      runningTotal,
      runningAverage: totalArrows > 0 ? runningTotal / totalArrows : 0,
      isCurrent: false,
    });
  });

  // Add current end (if has shots)
  if (shotsInCurrentEnd.length > 0) {
    const score = shotsInCurrentEnd.reduce((sum, s) => sum + s.score, 0);
    const arrows = shotsInCurrentEnd.length;
    const projectedTotal = runningTotal + score;
    const projectedArrows = totalArrows + arrows;

    stats.push({
      endNumber: currentEndNumber,
      score,
      arrows,
      runningTotal: projectedTotal,
      runningAverage: projectedArrows > 0 ? projectedTotal / projectedArrows : 0,
      isCurrent: true,
    });
  }

  return (
    <div className="stats-table">
      <h3>Session Statistics</h3>
      <table>
        <thead>
          <tr>
            <th>End</th>
            <th>Score</th>
            <th>Arrows</th>
            <th>Running Total</th>
            <th>Running Avg</th>
          </tr>
        </thead>
        <tbody>
          {stats.map(row => (
            <tr key={row.endNumber} className={row.isCurrent ? 'current-end' : ''}>
              <td>
                {row.endNumber}
                {row.isCurrent && <span className="current-label"> (Current)</span>}
              </td>
              <td>{row.score}</td>
              <td>{row.arrows}</td>
              <td>{row.runningTotal}</td>
              <td>{row.runningAverage.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
