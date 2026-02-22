import { useState } from 'react';
import Plot from 'react-plotly.js';
import Card from '../../components/ui/Card';
import { useArrowAnalytics, useFindSimilar } from '../../api/arrows';
import type { SimilarArrowResult } from '../../types/models';

interface ArrowChartsProps {
  arrowId: string;
}

const GRADE_COLORS: Record<string, string> = {
  Premium: '#22c55e',
  Competition: '#3b82f6',
  Amateur: '#f59e0b',
  Recreational: '#ef4444',
};

export default function ArrowCharts({ arrowId }: ArrowChartsProps) {
  const { data: analytics } = useArrowAnalytics(arrowId);
  const findSimilarMutation = useFindSimilar();
  const [referenceArrows, setReferenceArrows] = useState('');
  const [similarResults, setSimilarResults] = useState<SimilarArrowResult[] | null>(null);

  if (!analytics || analytics.grades.length === 0) {
    return null;
  }

  const grades = analytics.grades;

  // 3D Scatter data — group by grade
  const gradeGroups = new Map<string, typeof grades>();
  for (const g of grades) {
    const list = gradeGroups.get(g.grade) ?? [];
    list.push(g);
    gradeGroups.set(g.grade, list);
  }

  const scatter3dTraces = Array.from(gradeGroups.entries()).map(([grade, shafts]) => ({
    x: shafts.map((s) => s.measured_weight_gr ?? 0),
    y: shafts.map((s) => s.measured_spine_astm ?? 0),
    z: shafts.map((s) => s.straightness ?? 0),
    text: shafts.map((s) => `Arrow #${s.arrow_number}`),
    type: 'scatter3d' as const,
    mode: 'text+markers' as const,
    name: grade,
    marker: { size: 6, color: GRADE_COLORS[grade] ?? '#94a3b8' },
    textposition: 'top center' as const,
    textfont: { size: 9 },
  }));

  // Radar chart: set consistency metrics
  const stats = analytics.group_stats;
  const radarCategories = ['Weight CV', 'Spine CV', 'Mean Straightness', 'Quality Score', 'Shaft Count'];

  const weightCV = stats.weight?.cv_pct ?? 0;
  const spineCV = stats.spine?.cv_pct ?? 0;
  const meanStraight = stats.straightness?.mean ?? 0;
  // Quality score: % of premium + competition grades
  const qualityScore =
    (grades.filter((g) => g.grade === 'Premium' || g.grade === 'Competition').length / grades.length) * 100;
  // Normalized shaft count (cap at 24 for visual)
  const shaftNorm = Math.min(stats.shaft_count / 24, 1) * 100;

  // Invert CV values: lower CV = better = higher on radar
  const radarValues = [
    Math.max(0, 100 - weightCV * 50), // Amplify CV impact
    Math.max(0, 100 - spineCV * 50),
    Math.max(0, (1 - meanStraight / 0.01) * 100), // 0.01 = bad straightness
    qualityScore,
    shaftNorm,
  ];

  const handleFindSimilar = () => {
    const nums = referenceArrows
      .split(',')
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n));
    if (nums.length === 0) return;

    findSimilarMutation.mutate(
      { arrowId, request: { reference_arrow_numbers: nums, top_n: 5 } },
      { onSuccess: setSimilarResults }
    );
  };

  return (
    <div className="arrow-charts">
      <Card>
        <h4>3D Arrow Distribution</h4>
        <p className="chart-description">
          Shafts plotted by weight, spine, and straightness. Color-coded by quality grade.
        </p>
        <Plot
          data={scatter3dTraces}
          layout={{
            height: 500,
            scene: {
              xaxis: { title: { text: 'Weight (gr)' } },
              yaxis: { title: { text: 'Spine (ASTM)' } },
              zaxis: { title: { text: 'Straightness' } },
            },
            margin: { t: 20, r: 20, b: 20, l: 20 },
            paper_bgcolor: 'transparent',
            font: { color: '#94a3b8' },
            legend: { x: 0, y: 1 },
          }}
          config={{ responsive: true, displayModeBar: false }}
          style={{ width: '100%' }}
        />
      </Card>

      <Card>
        <h4>Set Consistency Radar</h4>
        <Plot
          data={[
            {
              type: 'scatterpolar',
              r: [...radarValues, radarValues[0]],
              theta: [...radarCategories, radarCategories[0]],
              fill: 'toself',
              fillcolor: 'rgba(59, 130, 246, 0.15)',
              line: { color: '#3b82f6' },
              name: 'Current Set',
            },
          ]}
          layout={{
            height: 400,
            polar: {
              radialaxis: { range: [0, 100], visible: true, ticksuffix: '' },
            },
            margin: { t: 30, r: 40, b: 30, l: 40 },
            paper_bgcolor: 'transparent',
            font: { color: '#94a3b8' },
            showlegend: false,
          }}
          config={{ responsive: true, displayModeBar: false }}
          style={{ width: '100%' }}
        />
      </Card>

      <Card>
        <h4>Find Similar Arrows</h4>
        <p className="chart-description">
          Enter reference arrow numbers (comma-separated) to find the most similar arrows in your set.
        </p>
        <div className="similar-controls">
          <input
            type="text"
            placeholder="e.g. 1, 2, 3"
            value={referenceArrows}
            onChange={(e) => setReferenceArrows(e.target.value)}
          />
          <button className="btn-primary" onClick={handleFindSimilar} disabled={findSimilarMutation.isPending}>
            {findSimilarMutation.isPending ? 'Searching…' : 'Find Similar'}
          </button>
        </div>

        {similarResults && similarResults.length > 0 && (
          <table className="similar-table">
            <thead>
              <tr>
                <th>Arrow #</th>
                <th>Similarity</th>
                <th>Weight Diff</th>
                <th>Spine Diff</th>
                <th>Straightness Diff</th>
              </tr>
            </thead>
            <tbody>
              {similarResults.map((r) => (
                <tr key={r.arrow_number}>
                  <td>{r.arrow_number}</td>
                  <td>{r.similarity_score}%</td>
                  <td>{r.weight_diff_gr > 0 ? '+' : ''}{r.weight_diff_gr} gr</td>
                  <td>{r.spine_diff > 0 ? '+' : ''}{r.spine_diff}</td>
                  <td>{r.straightness_diff > 0 ? '+' : ''}{r.straightness_diff.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {similarResults && similarResults.length === 0 && (
          <p className="chart-description">No similar arrows found — all non-reference arrows may lack measurement data.</p>
        )}
      </Card>
    </div>
  );
}
