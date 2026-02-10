import { useState } from 'react';
import EquipmentSelector from '../../components/EquipmentSelector';
import { useArrows } from '../../api/arrows';
import { ROUND_DEFINITIONS } from '../../types/models';
import type { FaceType } from '../../types/models';

interface SessionConfigProps {
  onStartSession: (config: {
    bowId?: string;
    arrowId?: string;
    roundType: string;
    faceSizeCm: number;
    distanceM: number;
    faceType: FaceType;
    xIs11: boolean;
    arrowsPerEnd: number;
    totalArrows: number;
    arrowCount: number;
    shaftDiameterMm: number;
    notes: string;
  }) => void;
}

export default function SessionConfig({ onStartSession }: SessionConfigProps) {
  const [bowId, setBowId] = useState('');
  const [arrowId, setArrowId] = useState('');
  const [roundType, setRoundType] = useState('WA 18m (Indoor)');
  
  // Arrows per end — initialised from the default round preset, editable by the user
  const [arrowsPerEnd, setArrowsPerEnd] = useState(ROUND_DEFINITIONS['WA 18m (Indoor)'].arrows_end);

  // Custom overrides (used when roundType === 'Custom')
  const [customDistance, setCustomDistance] = useState(18);
  const [customFaceSize, setCustomFaceSize] = useState(40);
  const [customTotalArrows, setCustomTotalArrows] = useState(30);
  const [xIs11, setXIs11] = useState(false);
  const [notes, setNotes] = useState('');

  const { data: arrows } = useArrows();
  const selectedArrow = arrows?.find(a => a.id === arrowId);

  const handleRoundTypeChange = (value: string) => {
    setRoundType(value);
    // Sync arrows-per-end to the new preset default
    const def = ROUND_DEFINITIONS[value];
    if (def) setArrowsPerEnd(def.arrows_end);
  };

  const handleStart = () => {
    const isCustom = roundType === 'Custom';
    const roundDef = ROUND_DEFINITIONS[roundType];

    const config = {
      bowId: bowId || undefined,
      arrowId: arrowId || undefined,
      roundType: isCustom ? 'Custom' : roundType,
      faceSizeCm: isCustom ? customFaceSize : roundDef.face,
      distanceM: isCustom ? customDistance : roundDef.dist,
      faceType: isCustom ? ('WA' as FaceType) : roundDef.type,
      xIs11: isCustom ? xIs11 : roundDef.x_11,
      arrowsPerEnd,
      totalArrows: isCustom ? customTotalArrows : roundDef.total,
      arrowCount: selectedArrow?.arrow_count || 12,
      shaftDiameterMm: selectedArrow?.shaft_diameter_mm || 5.2,
      notes,
    };

    onStartSession(config);
  };

  return (
    <div className="session-config">
      <h2>Session Setup</h2>
      
      <div className="config-form">
        <div className="form-group">
          <label>Select Bow</label>
          <EquipmentSelector 
            type="bow" 
            value={bowId} 
            onChange={setBowId}
            includeCreateNew={false}
          />
        </div>

        <div className="form-group">
          <label>Select Arrow</label>
          <EquipmentSelector 
            type="arrow" 
            value={arrowId} 
            onChange={setArrowId}
            includeCreateNew={false}
          />
        </div>

        <div className="form-group">
          <label>Round Type</label>
          <select value={roundType} onChange={(e) => handleRoundTypeChange(e.target.value)}>
            {Object.keys(ROUND_DEFINITIONS).map(key => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Arrows per End</label>
          <select value={arrowsPerEnd} onChange={(e) => setArrowsPerEnd(Number(e.target.value))}>
            {[3, 4, 5, 6].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {roundType === 'Custom' && (
          <div className="custom-config">
            <div className="form-group">
              <label>Distance (m)</label>
              <input 
                type="number" 
                value={customDistance} 
                onChange={(e) => setCustomDistance(Number(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label>Face Size (cm)</label>
              <select 
                value={customFaceSize} 
                onChange={(e) => setCustomFaceSize(Number(e.target.value))}
              >
                <option value={40}>40</option>
                <option value={60}>60</option>
                <option value={80}>80</option>
                <option value={122}>122</option>
              </select>
            </div>

            <div className="form-group">
              <label>Total Arrows</label>
              <input 
                type="number" 
                min={1}
                step={3}
                value={customTotalArrows} 
                onChange={(e) => setCustomTotalArrows(Number(e.target.value))}
              />
            </div>
          </div>
        )}

        <div className="form-group">
          <label>
            <input 
              type="checkbox" 
              checked={xIs11} 
              onChange={(e) => setXIs11(e.target.checked)}
            />
            <span>Score X as 11</span>
          </label>
        </div>

        <div className="form-group">
          <label>Session Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Wind conditions, goals, equipment changes..."
            rows={2}
            style={{ width: '100%', resize: 'vertical', padding: '0.375rem', borderRadius: '4px', border: '1px solid #ccc', fontFamily: 'inherit', fontSize: '0.95rem' }}
          />
        </div>

        <button 
          className="btn-primary" 
          onClick={handleStart}
          disabled={!arrowId}
        >
          Start Logging
        </button>
      </div>
    </div>
  );
}
