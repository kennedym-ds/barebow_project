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
  }) => void;
}

export default function SessionConfig({ onStartSession }: SessionConfigProps) {
  const [bowId, setBowId] = useState('');
  const [arrowId, setArrowId] = useState('');
  const [roundType, setRoundType] = useState('WA 18m (Indoor)');
  
  // Custom overrides (used when roundType === 'Custom')
  const [customDistance, setCustomDistance] = useState(18);
  const [customFaceSize, setCustomFaceSize] = useState(40);
  const [customArrowsPerEnd, setCustomArrowsPerEnd] = useState(3);
  const [customTotalArrows, setCustomTotalArrows] = useState(30);
  const [xIs11, setXIs11] = useState(false);

  const { data: arrows } = useArrows();
  const selectedArrow = arrows?.find(a => a.id === arrowId);

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
      arrowsPerEnd: isCustom ? customArrowsPerEnd : roundDef.arrows_end,
      totalArrows: isCustom ? customTotalArrows : roundDef.total,
      arrowCount: selectedArrow?.arrow_count || 12,
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
          <select value={roundType} onChange={(e) => setRoundType(e.target.value)}>
            {Object.keys(ROUND_DEFINITIONS).map(key => (
              <option key={key} value={key}>{key}</option>
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
              <label>Arrows per End</label>
              <input 
                type="number" 
                min={1}
                value={customArrowsPerEnd} 
                onChange={(e) => setCustomArrowsPerEnd(Number(e.target.value))}
              />
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
