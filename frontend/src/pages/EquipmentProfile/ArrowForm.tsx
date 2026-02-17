import { useState, useEffect, lazy, Suspense } from 'react';
import { useArrow, useCreateArrow, useUpdateArrow, useDeleteArrow, useShafts, useDeleteShafts, useArrowAnalytics, useSpineCheck } from '../../api/arrows';
import { useBows } from '../../api/bows';
import EquipmentSelector from '../../components/EquipmentSelector';
import Card from '../../components/ui/Card';
import ShaftDataUploader from './ShaftDataUploader';
import SetOptimizer from './SetOptimizer';
import type { ArrowSetupCreate, MetricStats } from '../../types/models';
import './EquipmentForms.css';

const ArrowCharts = lazy(() => import('./ArrowCharts'));

const DEFAULT_ARROW: ArrowSetupCreate = {
  make: '',
  model: '',
  spine: 500,
  length_in: 29,
  point_weight_gr: 120,
  total_arrow_weight_gr: null,
  shaft_diameter_mm: null,
  fletching_type: 'Spin Wing',
  nock_type: 'Pin',
  arrow_count: 12,
};

export default function ArrowForm() {
  const [selectedId, setSelectedId] = useState<string>('new');
  const [formData, setFormData] = useState<ArrowSetupCreate>(DEFAULT_ARROW);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [selectedBowId, setSelectedBowId] = useState<string | null>(null);

  const { data: arrow } = useArrow(selectedId !== 'new' ? selectedId : null);
  const { data: shafts } = useShafts(selectedId !== 'new' ? selectedId : null);
  const { data: analytics } = useArrowAnalytics(selectedId !== 'new' ? selectedId : null);
  const { data: bows } = useBows();
  const { data: spineCheck } = useSpineCheck(selectedId !== 'new' ? selectedId : null, selectedBowId);
  const createArrow = useCreateArrow();
  const updateArrow = useUpdateArrow();
  const deleteArrow = useDeleteArrow();
  const deleteShafts = useDeleteShafts();

  useEffect(() => {
    if (selectedId === 'new') {
      setFormData(DEFAULT_ARROW);
    } else if (arrow) {
      const { id, ...rest } = arrow;
      void id;
      setFormData(rest);
    }
  }, [selectedId, arrow]);

  const handleChange = <K extends keyof ArrowSetupCreate>(field: K, value: ArrowSetupCreate[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNumericChange = <K extends keyof ArrowSetupCreate>(field: K, raw: string) => {
    if (raw === '') return;
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      handleChange(field, parsed as ArrowSetupCreate[K]);
    }
  };

  const handleNullableNumericChange = <K extends keyof ArrowSetupCreate>(field: K, raw: string) => {
    if (raw === '') {
      handleChange(field, null as ArrowSetupCreate[K]);
      return;
    }
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      handleChange(field, parsed as ArrowSetupCreate[K]);
    }
  };

  const handleSave = async () => {
    try {
      if (selectedId === 'new') {
        await createArrow.mutateAsync(formData);
        setMessage({ type: 'success', text: 'Arrow profile created successfully!' });
      } else {
        await updateArrow.mutateAsync({ id: selectedId, data: formData });
        setMessage({ type: 'success', text: 'Arrow profile updated successfully!' });
      }
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: `Error: ${error}` });
    }
  };

  const handleDelete = async () => {
    if (selectedId === 'new') return;
    if (!confirm('Are you sure you want to delete this arrow profile?')) return;

    try {
      await deleteArrow.mutateAsync(selectedId);
      setSelectedId('new');
      setMessage({ type: 'success', text: 'Arrow profile deleted successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: `Error: ${error}` });
    }
  };

  const handleClearShafts = async () => {
    if (selectedId === 'new') return;
    if (!confirm('Are you sure you want to clear all shaft data?')) return;

    try {
      await deleteShafts.mutateAsync(selectedId);
      setMessage({ type: 'success', text: 'Shaft data cleared!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: `Error: ${error}` });
    }
  };

  const renderStatBlock = (label: string, stats: MetricStats | null, unit: string) => {
    if (!stats) return null;
    return (
      <div className="stat-block">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{stats.mean.toFixed(2)}{unit ? ` ${unit}` : ''}</span>
        <span className="stat-detail">±{stats.std.toFixed(2)} | CV {stats.cv_pct.toFixed(1)}%</span>
      </div>
    );
  };

  return (
    <Card>
      <div className="form-header">
        <EquipmentSelector
          type="arrow"
          value={selectedId}
          onChange={setSelectedId}
        />
        {message && (
          <div className={`message message-${message.type}`}>
            {message.text}
          </div>
        )}
      </div>

      <div className="form-grid">
        {/* Column 1 */}
        <div className="form-column">
          <h4>Arrow Specifications</h4>
          
          <div className="form-group">
            <label>Make</label>
            <input
              type="text"
              value={formData.make}
              onChange={(e) => handleChange('make', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Model</label>
            <input
              type="text"
              value={formData.model}
              onChange={(e) => handleChange('model', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Spine</label>
            <input
              type="number"
              step="1"
              value={formData.spine}
              onChange={(e) => handleNumericChange('spine', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Length (in)</label>
            <input
              type="number"
              step="0.125"
              value={formData.length_in}
              onChange={(e) => handleNumericChange('length_in', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Arrow Count</label>
            <input
              type="number"
              value={formData.arrow_count}
              onChange={(e) => handleChange('arrow_count', parseInt(e.target.value))}
            />
          </div>
        </div>

        {/* Column 2 */}
        <div className="form-column">
          <h4>Components</h4>
          
          <div className="form-group">
            <label>Point Weight (gr)</label>
            <input
              type="number"
              step="5"
              value={formData.point_weight_gr}
              onChange={(e) => handleNumericChange('point_weight_gr', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Total Arrow Weight (gr)</label>
            <input
              type="number"
              step="1"
              placeholder="Optional"
              value={formData.total_arrow_weight_gr ?? ''}
              onChange={(e) => handleNullableNumericChange('total_arrow_weight_gr', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Shaft Diameter (mm)</label>
            <input
              type="number"
              step="0.1"
              placeholder="Optional"
              value={formData.shaft_diameter_mm ?? ''}
              onChange={(e) => handleNullableNumericChange('shaft_diameter_mm', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Fletching Type</label>
            <input
              type="text"
              value={formData.fletching_type}
              onChange={(e) => handleChange('fletching_type', e.target.value)}
              placeholder="e.g., Spin Wing, AAE Elite"
            />
          </div>

          <div className="form-group">
            <label>Nock Type</label>
            <input
              type="text"
              value={formData.nock_type}
              onChange={(e) => handleChange('nock_type', e.target.value)}
              placeholder="e.g., Pin, Push-in"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="form-actions">
        <button onClick={handleSave} className="btn-primary">
          {selectedId === 'new' ? 'Create' : 'Update'}
        </button>
        {selectedId !== 'new' && (
          <button onClick={handleDelete} className="btn-danger">
            Delete
          </button>
        )}
      </div>

      {/* Shaft Data Section - only when editing */}
      {selectedId !== 'new' && (
        <div className="shaft-data-section">
          <h4>Shaft Data</h4>
          
          <ShaftDataUploader 
            arrowId={selectedId}
            onSuccess={(msg) => {
              setMessage({ type: 'success', text: msg });
              setTimeout(() => setMessage(null), 3000);
            }}
            onError={(msg) => {
              setMessage({ type: 'error', text: msg });
            }}
          />

          {shafts && shafts.length > 0 && (
            <>
              <div className="shaft-table-container">
                <table className="shaft-table">
                  <thead>
                    <tr>
                      <th>Arrow #</th>
                      <th>Weight (gr)</th>
                      <th>Spine (ASTM)</th>
                      <th>Straightness</th>
                      {analytics && <th>Grade</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {shafts.map((shaft) => {
                      const gradeEntry = analytics?.grades.find(g => g.arrow_number === shaft.arrow_number);
                      const isOutlier = analytics?.outliers.some(o => o.arrow_number === shaft.arrow_number);
                      return (
                        <tr key={shaft.id} className={isOutlier ? 'outlier-row' : ''}>
                          <td>{shaft.arrow_number}</td>
                          <td>{shaft.measured_weight_gr?.toFixed(1) ?? '-'}</td>
                          <td>{shaft.measured_spine_astm?.toFixed(0) ?? '-'}</td>
                          <td>{shaft.straightness?.toFixed(3) ?? '-'}</td>
                          {analytics && (
                            <td>
                              <span className={`grade-badge grade-${gradeEntry?.grade.toLowerCase() ?? 'unknown'}`}>
                                {gradeEntry?.grade ?? '-'}
                              </span>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Group Stats */}
              {analytics && analytics.group_stats.shaft_count > 0 && (
                <div className="analytics-panel">
                  <h5>Set Consistency</h5>
                  <div className="stats-grid">
                    {renderStatBlock('Weight', analytics.group_stats.weight, 'gr')}
                    {renderStatBlock('Spine', analytics.group_stats.spine, '')}
                    {renderStatBlock('Straightness', analytics.group_stats.straightness, '')}
                  </div>

                  {analytics.outliers.length > 0 && (
                    <div className="outlier-warnings">
                      <h5>⚠ Outliers Detected</h5>
                      <ul>
                        {analytics.outliers.map((o, i) => (
                          <li key={i}>
                            Arrow #{o.arrow_number}: {o.feature} = {o.value.toFixed(2)} ({o.z_score.toFixed(1)}σ from mean)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Spine Check */}
                  <div className="spine-check-section">
                    <h5>Spine Check</h5>
                    <div className="spine-check-controls">
                      <select
                        value={selectedBowId ?? ''}
                        onChange={(e) => setSelectedBowId(e.target.value || null)}
                      >
                        <option value="">Select a bow to check spine…</option>
                        {bows?.map((bow) => (
                          <option key={bow.id} value={bow.id}>{bow.name}</option>
                        ))}
                      </select>
                    </div>
                    {spineCheck && (
                      <div className="spine-check-result">
                        <span className={`spine-status spine-${spineCheck.status}`}>
                          {spineCheck.status.replace(/_/g, ' ')}
                        </span>
                        <p className="spine-message">{spineCheck.message}</p>
                        <p className="spine-detail">
                          Recommended: {spineCheck.recommended_spine} · Dynamic: {spineCheck.actual_dynamic_spine.toFixed(0)} · Deviation: {spineCheck.deviation_pct.toFixed(1)}%
                        </p>
                        <p className="spine-detail">
                          Effective Draw Weight: {spineCheck.effective_draw_weight.toFixed(1)} lbs
                        </p>
                        {spineCheck.frequency_match && (
                          <div className="frequency-match">
                            <p className="spine-detail">
                              <span className={`spine-status spine-${spineCheck.frequency_match.match_quality === 'excellent' || spineCheck.frequency_match.match_quality === 'good' ? 'matched' : spineCheck.frequency_match.match_quality}`}>
                                Frequency: {spineCheck.frequency_match.match_quality}
                              </span>
                              {' '}— {spineCheck.frequency_match.arrow_frequency_hz.toFixed(1)} Hz · {spineCheck.frequency_match.oscillations_during_power_stroke.toFixed(2)} oscillations
                            </p>
                            <p className="spine-detail spine-message">{spineCheck.frequency_match.message}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Set Optimizer */}
              <SetOptimizer arrowId={selectedId} shaftCount={shafts.length} />

              {/* Arrow Charts (Plotly - lazy loaded) */}
              <Suspense fallback={<div>Loading charts…</div>}>
                <ArrowCharts arrowId={selectedId} />
              </Suspense>

              <button onClick={handleClearShafts} className="btn-secondary">
                Clear All Shaft Data
              </button>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
