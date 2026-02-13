import { useState, useEffect } from 'react';
import { useArrow, useCreateArrow, useUpdateArrow, useDeleteArrow, useShafts, useDeleteShafts } from '../../api/arrows';
import EquipmentSelector from '../../components/EquipmentSelector';
import Card from '../../components/ui/Card';
import ShaftDataUploader from './ShaftDataUploader';
import type { ArrowSetupCreate } from '../../types/models';
import './EquipmentForms.css';

const DEFAULT_ARROW: ArrowSetupCreate = {
  make: '',
  model: '',
  spine: 500,
  length_in: 29,
  point_weight_gr: 120,
  total_arrow_weight_gr: 400,
  shaft_diameter_mm: 5.5,
  fletching_type: 'Spin Wing',
  nock_type: 'Pin',
  arrow_count: 12,
};

export default function ArrowForm() {
  const [selectedId, setSelectedId] = useState<string>('new');
  const [formData, setFormData] = useState<ArrowSetupCreate>(DEFAULT_ARROW);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: arrow } = useArrow(selectedId !== 'new' ? selectedId : null);
  const { data: shafts } = useShafts(selectedId !== 'new' ? selectedId : null);
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

  const handleChange = (field: keyof ArrowSetupCreate, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNumericChange = (field: keyof ArrowSetupCreate, raw: string) => {
    const parsed = parseFloat(raw);
    handleChange(field, isNaN(parsed) ? '' : parsed);
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
              value={formData.total_arrow_weight_gr}
              onChange={(e) => handleNumericChange('total_arrow_weight_gr', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Shaft Diameter (mm)</label>
            <input
              type="number"
              step="0.1"
              value={formData.shaft_diameter_mm}
              onChange={(e) => handleNumericChange('shaft_diameter_mm', e.target.value)}
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
                    </tr>
                  </thead>
                  <tbody>
                    {shafts.map((shaft) => (
                      <tr key={shaft.id}>
                        <td>{shaft.arrow_number}</td>
                        <td>{shaft.measured_weight_gr?.toFixed(1) ?? '-'}</td>
                        <td>{shaft.measured_spine_astm?.toFixed(0) ?? '-'}</td>
                        <td>{shaft.straightness?.toFixed(3) ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
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
