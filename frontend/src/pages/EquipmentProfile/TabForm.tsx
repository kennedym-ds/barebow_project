import { useState, useEffect } from 'react';
import { useTabs, useTab, useCreateTab, useUpdateTab, useDeleteTab } from '../../api/tabs';
import EquipmentSelector from '../../components/EquipmentSelector';
import Card from '../../components/ui/Card';
import type { TabSetupCreate } from '../../types/models';
import './EquipmentForms.css';

const DEFAULT_TAB: TabSetupCreate = {
  name: '',
  make: 'Zniper',
  model: 'Barebow Tab',
  marks: '',
};

export default function TabForm() {
  const [selectedId, setSelectedId] = useState<string>('new');
  const [formData, setFormData] = useState<TabSetupCreate>(DEFAULT_TAB);
  const [marksError, setMarksError] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: tab } = useTab(selectedId !== 'new' ? selectedId : null);
  const createTab = useCreateTab();
  const updateTab = useUpdateTab();
  const deleteTab = useDeleteTab();

  useEffect(() => {
    if (selectedId === 'new') {
      setFormData(DEFAULT_TAB);
      setMarksError('');
    } else if (tab) {
      const { id, ...rest } = tab;
      setFormData(rest);
      setMarksError('');
    }
  }, [selectedId, tab]);

  const handleChange = (field: keyof TabSetupCreate, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Validate marks field
    if (field === 'marks' && value) {
      const values = value.split(',').map(v => v.trim());
      const invalidValues = values.filter(v => v && isNaN(parseFloat(v)));
      if (invalidValues.length > 0) {
        setMarksError(`Invalid values: ${invalidValues.join(', ')}`);
      } else {
        setMarksError('');
      }
    } else if (field === 'marks') {
      setMarksError('');
    }
  };

  const handleSave = async () => {
    if (marksError) {
      setMessage({ type: 'error', text: 'Please fix validation errors before saving.' });
      return;
    }

    try {
      // Auto-generate name if not provided
      const name = formData.name || `${formData.make} ${formData.model}`.trim();
      const dataToSave = { ...formData, name };

      if (selectedId === 'new') {
        await createTab.mutateAsync(dataToSave);
        setMessage({ type: 'success', text: 'Tab profile created successfully!' });
      } else {
        await updateTab.mutateAsync({ id: selectedId, data: dataToSave });
        setMessage({ type: 'success', text: 'Tab profile updated successfully!' });
      }
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: `Error: ${error}` });
    }
  };

  const handleDelete = async () => {
    if (selectedId === 'new') return;
    if (!confirm('Are you sure you want to delete this tab profile?')) return;

    try {
      await deleteTab.mutateAsync(selectedId);
      setSelectedId('new');
      setMessage({ type: 'success', text: 'Tab profile deleted successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: `Error: ${error}` });
    }
  };

  return (
    <Card>
      <div className="form-header">
        <EquipmentSelector
          type="tab"
          value={selectedId}
          onChange={setSelectedId}
        />
        {message && (
          <div className={`message message-${message.type}`}>
            {message.text}
          </div>
        )}
      </div>

      <div className="form-simple">
        <div className="form-group">
          <label>Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Auto-generated from make & model"
          />
        </div>

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
          <label>Marks (comma-separated mm values)</label>
          <input
            type="text"
            value={formData.marks}
            onChange={(e) => handleChange('marks', e.target.value)}
            placeholder="e.g., 4.5, 9.0, 13.5, 18.0"
            className={marksError ? 'input-error' : ''}
          />
          {marksError && <span className="field-error">{marksError}</span>}
          <small className="field-hint">
            Enter mark positions in millimeters, separated by commas
          </small>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="form-actions">
        <button onClick={handleSave} className="btn-primary" disabled={!!marksError}>
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
