import { useState } from 'react';
import { useBows } from '../../api/bows';
import { useArrows } from '../../api/arrows';
import './TuningWizard.css';

export default function TuningWizard() {
  const { data: bows } = useBows();
  const { data: arrows } = useArrows();

  const [selectedBowId, setSelectedBowId] = useState('');
  const [selectedArrowId, setSelectedArrowId] = useState('');
  const [handedness, setHandedness] = useState<'right' | 'left'>('right');
  const [verticalImpact, setVerticalImpact] = useState<'good' | 'high' | 'low'>('good');
  const [horizontalImpact, setHorizontalImpact] = useState<'good' | 'left' | 'right'>('good');

  if (!bows || !arrows) {
    return <div className="tuning-wizard">Loading equipment...</div>;
  }

  if (bows.length === 0 || arrows.length === 0) {
    return (
      <div className="tuning-wizard">
        <h1>🔧 Tuning Wizard</h1>
        <div className="warning-box">
          <p>Please define at least one Bow and Arrow profile in the <strong>Equipment Manager</strong> first.</p>
        </div>
      </div>
    );
  }

  // Determine the tuning diagnosis
  let verticalStatus: 'good' | 'error' = 'good';
  let verticalMessage = '';
  let verticalFixes: string[] = [];

  if (verticalImpact === 'high') {
    verticalStatus = 'error';
    verticalMessage = 'Nocking Point Too Low';
    verticalFixes = [
      'Raise Nocking Point (Move tie-on nocks up)',
      'Check Tiller (Top limb might be too strong)',
    ];
  } else if (verticalImpact === 'low') {
    verticalStatus = 'error';
    verticalMessage = 'Nocking Point Too High';
    verticalFixes = [
      'Lower Nocking Point (Move tie-on nocks down)',
      'Check Tiller (Bottom limb might be too strong)',
    ];
  } else {
    verticalMessage = 'Vertical Tune is Good';
  }

  // Horizontal logic
  let horizontalStatus: 'good' | 'stiff' | 'weak' = 'good';
  let horizontalMessage = '';
  let primaryFixes: string[] = [];
  let secondaryFixes: string[] = [];

  if (handedness === 'right') {
    if (horizontalImpact === 'left') {
      horizontalStatus = 'stiff';
    } else if (horizontalImpact === 'right') {
      horizontalStatus = 'weak';
    }
  } else {
    // Left handed
    if (horizontalImpact === 'right') {
      horizontalStatus = 'stiff';
    } else if (horizontalImpact === 'left') {
      horizontalStatus = 'weak';
    }
  }

  if (horizontalStatus === 'stiff') {
    horizontalMessage = 'Arrow is Acting STIFF';
    primaryFixes = [
      'Increase Bow Weight (Turn limb bolts in)',
      'Increase Point Weight (Use heavier points)',
      'Decrease Plunger Tension (Softer spring)',
    ];
    secondaryFixes = [
      'Increase Brace Height (Slightly)',
      'Use longer arrows (if cutting is an option)',
    ];
  } else if (horizontalStatus === 'weak') {
    horizontalMessage = 'Arrow is Acting WEAK';
    primaryFixes = [
      'Decrease Bow Weight (Turn limb bolts out)',
      'Decrease Point Weight (Use lighter points)',
      'Increase Plunger Tension (Stiffer spring)',
    ];
    secondaryFixes = [
      'Decrease Brace Height (Slightly)',
      'Cut arrows shorter (stiffens dynamic spine)',
    ];
  } else {
    horizontalMessage = 'Horizontal Tune is Good';
  }

  const isPerfectTune = verticalStatus === 'good' && horizontalStatus === 'good';

  return (
    <div className="tuning-wizard">
      <h1>🔧 Tuning Wizard</h1>
      <p className="subtitle">Use this tool to diagnose tuning issues based on <strong>Bareshaft Tuning</strong> logic.</p>

      {/* Section 1: Equipment */}
      <section className="section">
        <h2>1. Equipment</h2>
        <div className="equipment-grid">
          <div className="form-group">
            <label htmlFor="bow-select">Select Bow:</label>
            <select
              id="bow-select"
              value={selectedBowId}
              onChange={(e) => setSelectedBowId(e.target.value)}
            >
              <option value="">-- Choose a bow --</option>
              {bows.map(bow => (
                <option key={bow.id} value={bow.id}>
                  {bow.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="arrow-select">Select Arrow:</label>
            <select
              id="arrow-select"
              value={selectedArrowId}
              onChange={(e) => setSelectedArrowId(e.target.value)}
            >
              <option value="">-- Choose an arrow --</option>
              {arrows.map(arrow => (
                <option key={arrow.id} value={arrow.id}>
                  {arrow.make} {arrow.model}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Archer Handedness:</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="handedness"
                value="right"
                checked={handedness === 'right'}
                  onChange={() => setHandedness('right')}
              />
              Right Handed
            </label>
            <label>
              <input
                type="radio"
                name="handedness"
                value="left"
                checked={handedness === 'left'}
                  onChange={() => setHandedness('left')}
              />
              Left Handed
            </label>
          </div>
        </div>
      </section>

      <hr />

      {/* Section 2: Observation */}
      <section className="section">
        <h2>2. Observation</h2>
        <p>Shoot 3 fletched arrows and 1 bareshaft at 18m (or 30m). Where did the <strong>bareshaft</strong> land relative to the fletched group?</p>

        <div className="observation-grid">
          <div className="observation-group">
            <h3>Vertical Impact</h3>
            <p className="hint">Height relative to group:</p>
            <div className="radio-group-vertical">
              <label>
                <input
                  type="radio"
                  name="vertical"
                  value="good"
                  checked={verticalImpact === 'good'}
                  onChange={() => setVerticalImpact('good')}
                />
                In Group (Good)
              </label>
              <label>
                <input
                  type="radio"
                  name="vertical"
                  value="high"
                  checked={verticalImpact === 'high'}
                  onChange={() => setVerticalImpact('high')}
                />
                High
              </label>
              <label>
                <input
                  type="radio"
                  name="vertical"
                  value="low"
                  checked={verticalImpact === 'low'}
                  onChange={() => setVerticalImpact('low')}
                />
                Low
              </label>
            </div>
          </div>

          <div className="observation-group">
            <h3>Horizontal Impact</h3>
            <p className="hint">Lateral position relative to group:</p>
            <div className="radio-group-vertical">
              <label>
                <input
                  type="radio"
                  name="horizontal"
                  value="good"
                  checked={horizontalImpact === 'good'}
                  onChange={() => setHorizontalImpact('good')}
                />
                In Group (Good)
              </label>
              <label>
                <input
                  type="radio"
                  name="horizontal"
                  value="left"
                  checked={horizontalImpact === 'left'}
                  onChange={() => setHorizontalImpact('left')}
                />
                Left
              </label>
              <label>
                <input
                  type="radio"
                  name="horizontal"
                  value="right"
                  checked={horizontalImpact === 'right'}
                  onChange={() => setHorizontalImpact('right')}
                />
                Right
              </label>
            </div>
          </div>
        </div>
      </section>

      <hr />

      {/* Section 3: Diagnosis & Fixes */}
      <section className="section">
        <h2>3. Diagnosis & Fixes</h2>

        {/* Vertical Diagnosis */}
        {verticalStatus === 'error' ? (
          <div className="diagnosis-box error">
            <h3>🔴 {verticalMessage}</h3>
            <ul>
              {verticalFixes.map((fix, idx) => (
                <li key={idx}>{fix}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="diagnosis-box success">
            <h3>🟢 {verticalMessage}</h3>
          </div>
        )}

        {/* Horizontal Diagnosis */}
        <h3 className="section-subtitle">Spine / Stiffness</h3>
        {horizontalStatus === 'good' ? (
          <div className="diagnosis-box success">
            <h3>🟢 {horizontalMessage}</h3>
          </div>
        ) : (
          <div className="diagnosis-box warning">
            <h3>🟠 {horizontalMessage}</h3>
            <div className="fixes-section">
              <h4>Primary Fixes:</h4>
              <ul>
                {primaryFixes.map((fix, idx) => (
                  <li key={idx}>{fix}</li>
                ))}
              </ul>
              <h4>Secondary Fixes:</h4>
              <ul>
                {secondaryFixes.map((fix, idx) => (
                  <li key={idx}>{fix}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Perfect Tune Celebration */}
        {isPerfectTune && (
          <div className="perfect-tune-banner">
            <h2>🎉 Perfect Tune! Go shoot some 10s.</h2>
          </div>
        )}
      </section>
    </div>
  );
}
