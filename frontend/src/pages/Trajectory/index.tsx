import { useState } from 'react';
import Plot from 'react-plotly.js';
import Card from '../../components/ui/Card';
import { usePredictTrajectory, useEstimateDrift } from '../../api/trajectory';
import type { TrajectoryResponse, DriftResponse } from '../../types/models';
import './Trajectory.css';

export default function Trajectory() {
  const [velocity, setVelocity] = useState(200);
  const [mass, setMass] = useState(400);
  const [diameter, setDiameter] = useState(5.5);
  const [length, setLength] = useState(29);
  const [drag, setDrag] = useState(0.3);
  const [distance, setDistance] = useState(18);
  const [elevation, setElevation] = useState(0);
  const [wind, setWind] = useState(3.0);

  const [trajectory, setTrajectory] = useState<TrajectoryResponse | null>(null);
  const [drift, setDrift] = useState<DriftResponse | null>(null);

  const predictMutation = usePredictTrajectory();
  const driftMutation = useEstimateDrift();

  const handleNumeric = (setter: (v: number) => void, raw: string) => {
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) setter(parsed);
  };

  const handlePredict = () => {
    predictMutation.mutate(
      {
        launch_velocity_fps: velocity,
        target_distance_m: distance,
        arrow_mass_gr: mass,
        shaft_diameter_mm: diameter,
        arrow_length_in: length,
        target_elevation_deg: elevation,
        drag_coefficient: drag,
      },
      { onSuccess: setTrajectory }
    );
  };

  const handleDrift = () => {
    driftMutation.mutate(
      {
        launch_velocity_fps: velocity,
        arrow_mass_gr: mass,
        shaft_diameter_mm: diameter,
        arrow_length_in: length,
        target_distance_m: distance,
        crosswind_speed_mps: wind,
        drag_coefficient: drag,
      },
      { onSuccess: setDrift }
    );
  };

  return (
    <div className="trajectory-page">
      <h2>Trajectory Prediction</h2>
      <p>Solve for the optimal launch angle to hit a target at a given distance and elevation, with crosswind drift estimation.</p>

      <div className="trajectory-panels">
        <Card>
          <div className="trajectory-inputs">
            <h3>Arrow Parameters</h3>
            <div className="form-group">
              <label>Launch Velocity (fps)</label>
              <input type="number" value={velocity} onChange={(e) => handleNumeric(setVelocity, e.target.value)} />
            </div>
            <div className="form-group">
              <label>Arrow Mass (gr)</label>
              <input type="number" value={mass} onChange={(e) => handleNumeric(setMass, e.target.value)} />
            </div>
            <div className="form-group">
              <label>Shaft Diameter (mm)</label>
              <input type="number" step="0.1" value={diameter} onChange={(e) => handleNumeric(setDiameter, e.target.value)} />
            </div>
            <div className="form-group">
              <label>Arrow Length (in)</label>
              <input type="number" step="0.25" value={length} onChange={(e) => handleNumeric(setLength, e.target.value)} />
            </div>
            <div className="form-group">
              <label>Drag Coefficient</label>
              <input type="number" step="0.01" value={drag} onChange={(e) => handleNumeric(setDrag, e.target.value)} />
            </div>

            <h3>Target</h3>
            <div className="form-group">
              <label>Target Distance (m)</label>
              <input type="number" value={distance} onChange={(e) => handleNumeric(setDistance, e.target.value)} />
            </div>
            <div className="form-group">
              <label>Target Elevation (°)</label>
              <input type="number" step="1" value={elevation} onChange={(e) => handleNumeric(setElevation, e.target.value)} />
              <span className="field-hint">Positive = uphill, negative = downhill</span>
            </div>

            <div className="trajectory-actions">
              <button className="btn-primary" onClick={handlePredict} disabled={predictMutation.isPending}>
                {predictMutation.isPending ? 'Solving…' : 'Solve Trajectory'}
              </button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="drift-inputs">
            <h3>Crosswind Drift</h3>
            <div className="form-group">
              <label>Crosswind Speed (m/s)</label>
              <input type="number" step="0.5" value={wind} onChange={(e) => handleNumeric(setWind, e.target.value)} />
            </div>
            <div className="trajectory-actions">
              <button className="btn-primary" onClick={handleDrift} disabled={driftMutation.isPending}>
                {driftMutation.isPending ? 'Computing…' : 'Estimate Drift'}
              </button>
            </div>

            {drift && (
              <div className="drift-result">
                <h4>Drift Results</h4>
                <div className="trajectory-stats">
                  <div className="traj-stat">
                    <span className="traj-stat-label">Lateral Drift</span>
                    <span className="traj-stat-value">{drift.drift_cm} cm</span>
                  </div>
                  <div className="traj-stat">
                    <span className="traj-stat-label">Ring Impact</span>
                    <span className="traj-stat-value">~{drift.drift_rings} rings</span>
                  </div>
                  <div className="traj-stat">
                    <span className="traj-stat-label">Time of Flight</span>
                    <span className="traj-stat-value">{drift.time_of_flight_s.toFixed(3)}s</span>
                  </div>
                </div>
                <p className="drift-advice">{drift.advice}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {trajectory && (
        <Card>
          <div className="trajectory-results">
            <h3>Trajectory Results</h3>
            <div className="trajectory-stats">
              <div className="traj-stat highlight">
                <span className="traj-stat-label">Solved Launch Angle</span>
                <span className="traj-stat-value">{trajectory.launch_angle_deg.toFixed(2)}°</span>
              </div>
              <div className="traj-stat">
                <span className="traj-stat-label">Target Elevation</span>
                <span className="traj-stat-value">{trajectory.target_elevation_deg}°</span>
              </div>
              <div className="traj-stat">
                <span className="traj-stat-label">Range</span>
                <span className="traj-stat-value">{trajectory.range_m} m</span>
              </div>
              <div className="traj-stat">
                <span className="traj-stat-label">Max Height</span>
                <span className="traj-stat-value">{(trajectory.max_height_m * 100).toFixed(1)} cm</span>
              </div>
              <div className="traj-stat">
                <span className="traj-stat-label">Flight Time</span>
                <span className="traj-stat-value">{trajectory.time_of_flight_s.toFixed(3)}s</span>
              </div>
              <div className="traj-stat">
                <span className="traj-stat-label">Impact Speed</span>
                <span className="traj-stat-value">{trajectory.impact_velocity_mps} m/s</span>
              </div>
              <div className="traj-stat">
                <span className="traj-stat-label">Impact Angle</span>
                <span className="traj-stat-value">{trajectory.impact_angle_deg}°</span>
              </div>
            </div>

            <Plot
              data={[
                {
                  x: trajectory.trajectory.map((p) => p.x_m),
                  y: trajectory.trajectory.map((p) => p.y_m),
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Trajectory',
                  line: { color: '#3b82f6', width: 2 },
                },
              ]}
              layout={{
                title: { text: `Arrow Trajectory (launch ${trajectory.launch_angle_deg.toFixed(1)}°)` },
                xaxis: { title: { text: 'Downrange (m)' }, zeroline: true },
                yaxis: { title: { text: 'Height (m)' }, zeroline: true, scaleanchor: 'x' },
                height: 400,
                margin: { t: 40, r: 20, b: 50, l: 60 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: '#94a3b8' },
              }}
              config={{ responsive: true, displayModeBar: false }}
              style={{ width: '100%' }}
            />

            {Object.keys(trajectory.drop_at_distances).length > 0 && (
              <>
                <h4>Arrow Drop vs Bore-Sight</h4>
                <table className="drop-table">
                  <thead>
                    <tr>
                      <th>Distance</th>
                      <th>Drop</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(trajectory.drop_at_distances)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([dist, drop]) => (
                        <tr key={dist}>
                          <td>{dist} m</td>
                          <td>{drop} cm</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
