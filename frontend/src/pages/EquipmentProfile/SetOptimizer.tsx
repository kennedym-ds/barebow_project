import { useState } from 'react';
import { useOptimizeArrows } from '../../api/arrows';
import type { OptimizedSetResponse } from '../../types/models';
import './EquipmentForms.css';

interface SetOptimizerProps {
  arrowId: string;
  shaftCount: number;
}

export default function SetOptimizer({ arrowId, shaftCount }: SetOptimizerProps) {
  const [setSize, setSetSize] = useState(6);
  const [results, setResults] = useState<OptimizedSetResponse[] | null>(null);
  const optimize = useOptimizeArrows();

  const canOptimize = shaftCount >= setSize;

  const handleOptimize = async () => {
    try {
      const data = await optimize.mutateAsync({
        arrowId,
        request: {
          set_size: setSize,
          top_n: 5,
          weight_priority: 0.4,
          spine_priority: 0.35,
          straightness_priority: 0.25,
        },
      });
      setResults(data);
    } catch {
      setResults(null);
    }
  };

  return (
    <div className="optimizer-panel">
      <h5>Set Optimizer</h5>
      <p className="optimizer-description">
        Find the most consistent subset of arrows from your full set.
      </p>

      <div className="optimizer-controls">
        <div className="form-group">
          <label>Set Size</label>
          <select value={setSize} onChange={(e) => setSetSize(parseInt(e.target.value))}>
            {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
              .filter((n) => n <= shaftCount)
              .map((n) => (
                <option key={n} value={n}>{n} arrows</option>
              ))}
          </select>
        </div>

        <button
          onClick={handleOptimize}
          className="btn-primary"
          disabled={!canOptimize || optimize.isPending}
        >
          {optimize.isPending ? 'Optimizing...' : 'Find Best Sets'}
        </button>
      </div>

      {!canOptimize && (
        <p className="optimizer-note">Need at least {setSize} shafts with data to optimize.</p>
      )}

      {results && results.length > 0 && (
        <div className="optimizer-results">
          <table className="shaft-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Arrows</th>
                <th>Score</th>
                <th>Weight σ</th>
                <th>Spine σ</th>
                <th>Straight. σ</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.rank} className={r.rank === 1 ? 'best-set-row' : ''}>
                  <td>{r.rank === 1 ? '🏆' : `#${r.rank}`}</td>
                  <td>{r.arrow_numbers.join(', ')}</td>
                  <td>{r.consistency_score.toFixed(4)}</td>
                  <td>{r.weight_std_gr.toFixed(2)} gr</td>
                  <td>{r.spine_std.toFixed(1)}</td>
                  <td>{r.straightness_std.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
