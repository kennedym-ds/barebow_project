import { useState, useEffect } from 'react';
import { useBow, useCreateBow, useUpdateBow, useDeleteBow } from '../../api/bows';
import EquipmentSelector from '../../components/EquipmentSelector';
import Card from '../../components/ui/Card';
import type { BowSetupCreate } from '../../types/models';
import './EquipmentForms.css';

const DEFAULT_BOW: BowSetupCreate = {
  name: '',
  riser_make: '',
  riser_model: '',
  riser_length_in: 25,
  limbs_make: '',
  limbs_model: '',
  limbs_length: 'Medium',
  limbs_marked_poundage: 30,
  draw_weight_otf: 30,
  brace_height_in: 8.5,
  tiller_top_mm: 0,
  tiller_bottom_mm: 0,
  tiller_type: 'neutral',
  nocking_point_height_mm: 10,
  plunger_center_shot_mm: 2.5,
  plunger_spring_tension: 5,
  string_material: 'BCY-X',
  strand_count: 16,
  limb_alignment: 'Straight',
  total_mass_g: 0,
  riser_weights: '',
};

export default function BowForm() {
  const [selectedId, setSelectedId] = useState<string>('new');
  const [formData, setFormData] = useState<BowSetupCreate>(DEFAULT_BOW);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: bow } = useBow(selectedId !== 'new' ? selectedId : null);
  const createBow = useCreateBow();
  const updateBow = useUpdateBow();
  const deleteBow = useDeleteBow();

  useEffect(() => {
    if (selectedId === 'new') {
      setFormData(DEFAULT_BOW);
    } else if (bow) {
      const { id, ...rest } = bow;
      void id;
      setFormData(rest);
    }
  }, [selectedId, bow]);

  const handleChange = (field: keyof BowSetupCreate, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNumericChange = (field: keyof BowSetupCreate, raw: string) => {
    const parsed = parseFloat(raw);
    handleChange(field, isNaN(parsed) ? '' : parsed);
  };

  const handleSave = async () => {
    try {
      // Auto-generate name from riser and limbs make
      const name = `${formData.riser_make} - ${formData.limbs_make}`.trim();
      const dataToSave = { ...formData, name };

      if (selectedId === 'new') {
        await createBow.mutateAsync(dataToSave);
        setMessage({ type: 'success', text: 'Bow profile created successfully!' });
      } else {
        await updateBow.mutateAsync({ id: selectedId, data: dataToSave });
        setMessage({ type: 'success', text: 'Bow profile updated successfully!' });
      }
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: `Error: ${error}` });
    }
  };

  const handleDelete = async () => {
    if (selectedId === 'new') return;
    if (!confirm('Are you sure you want to delete this bow profile?')) return;

    try {
      await deleteBow.mutateAsync(selectedId);
      setSelectedId('new');
      setMessage({ type: 'success', text: 'Bow profile deleted successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: `Error: ${error}` });
    }
  };

  return (
    <Card>
      <div className="form-header">
        <EquipmentSelector
          type="bow"
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
        {/* Column 1 - Riser & Limbs */}
        <div className="form-column">
          <h4>Riser & Limbs</h4>
          
          <div className="form-group">
            <label>Riser Make</label>
            <input
              type="text"
              value={formData.riser_make}
              onChange={(e) => handleChange('riser_make', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Riser Model</label>
            <input
              type="text"
              value={formData.riser_model}
              onChange={(e) => handleChange('riser_model', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Riser Length (in)</label>
            <input
              type="number"
              step="0.1"
              value={formData.riser_length_in}
              onChange={(e) => handleNumericChange('riser_length_in', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Limbs Make</label>
            <input
              type="text"
              value={formData.limbs_make}
              onChange={(e) => handleChange('limbs_make', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Limbs Model</label>
            <input
              type="text"
              value={formData.limbs_model}
              onChange={(e) => handleChange('limbs_model', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Limbs Length</label>
            <select
              value={formData.limbs_length}
              onChange={(e) => handleChange('limbs_length', e.target.value)}
            >
              <option value="Short">Short</option>
              <option value="Medium">Medium</option>
              <option value="Long">Long</option>
            </select>
          </div>

          <div className="form-group">
            <label>Marked Poundage (lbs)</label>
            <input
              type="number"
              step="0.5"
              value={formData.limbs_marked_poundage}
              onChange={(e) => handleNumericChange('limbs_marked_poundage', e.target.value)}
            />
          </div>
        </div>

        {/* Column 2 - Tuning Specs */}
        <div className="form-column">
          <h4>Tuning Specs</h4>
          
          <div className="form-group">
            <label>Draw Weight OTF (lbs)</label>
            <input
              type="number"
              step="0.5"
              value={formData.draw_weight_otf}
              onChange={(e) => handleNumericChange('draw_weight_otf', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Brace Height (in)</label>
            <input
              type="number"
              step="0.1"
              value={formData.brace_height_in}
              onChange={(e) => handleNumericChange('brace_height_in', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Tiller Top (mm)</label>
            <input
              type="number"
              step="0.5"
              value={formData.tiller_top_mm}
              onChange={(e) => handleNumericChange('tiller_top_mm', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Tiller Bottom (mm)</label>
            <input
              type="number"
              step="0.5"
              value={formData.tiller_bottom_mm}
              onChange={(e) => handleNumericChange('tiller_bottom_mm', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Tiller Type</label>
            <select
              value={formData.tiller_type}
              onChange={(e) => handleChange('tiller_type', e.target.value)}
            >
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
          </div>

          <div className="form-group">
            <label>Plunger Spring Tension (1-10)</label>
            <input
              type="number"
              min="1"
              max="10"
              step="0.5"
              value={formData.plunger_spring_tension}
              onChange={(e) => handleNumericChange('plunger_spring_tension', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Plunger Center Shot (mm)</label>
            <input
              type="number"
              step="0.1"
              value={formData.plunger_center_shot_mm}
              onChange={(e) => handleNumericChange('plunger_center_shot_mm', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Nocking Point Height (mm)</label>
            <input
              type="number"
              step="0.5"
              value={formData.nocking_point_height_mm}
              onChange={(e) => handleNumericChange('nocking_point_height_mm', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Additional Fields */}
      <details className="form-details">
        <summary>Additional Details</summary>
        <div className="form-grid">
          <div className="form-group">
            <label>String Material</label>
            <input
              type="text"
              value={formData.string_material}
              onChange={(e) => handleChange('string_material', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Strand Count</label>
            <input
              type="number"
              value={formData.strand_count}
              onChange={(e) => handleChange('strand_count', parseInt(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label>Limb Alignment</label>
            <select
              value={formData.limb_alignment}
              onChange={(e) => handleChange('limb_alignment', e.target.value)}
            >
              <option value="Straight">Straight</option>
              <option value="Out of Line">Out of Line</option>
            </select>
          </div>

          <div className="form-group">
            <label>Total Mass (g)</label>
            <input
              type="number"
              step="1"
              value={formData.total_mass_g}
              onChange={(e) => handleNumericChange('total_mass_g', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Riser Weights (description)</label>
            <input
              type="text"
              value={formData.riser_weights}
              onChange={(e) => handleChange('riser_weights', e.target.value)}
              placeholder="e.g., 2x50g on limb pockets"
            />
          </div>
        </div>
      </details>

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
    </Card>
  );
}
