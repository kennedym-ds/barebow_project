/**
 * Point-mass trajectory prediction for archery arrows.
 * Ported from src/trajectory.py — 2D Euler ODE solver, pure math.
 *
 * Provides gravity + quadratic drag trajectory, bisection launch-angle solver,
 * and crosswind drift estimation.
 */

// Physical constants
const AIR_DENSITY_KG_M3 = 1.225;
const GRAVITY_MPS2 = 9.80665;
const GRAINS_PER_KG = 15432.358;
const INCHES_PER_METER = 39.3701;
const MM_PER_METER = 1000.0;
const FPS_TO_MPS = 0.3048;

// Standard distances for drop table (metres)
const DROP_DISTANCES_M = [10, 18, 30, 50, 70];

// Solver defaults
const SOLVER_ANGLE_MIN_DEG = -10.0;
const SOLVER_ANGLE_MAX_DEG = 45.0;
const SOLVER_TOL_M = 0.005;
const SOLVER_MAX_ITER = 80;

interface TrajectoryPoint {
  t: number;
  x_m: number;
  y_m: number;
  v_mps: number;
}

interface SimResult {
  y_at_target: number | null;
  t_at_target: number | null;
  trajectory: TrajectoryPoint[];
  max_height_m: number;
  range_m: number;
  time_of_flight_s: number;
  impact_velocity_mps: number;
  impact_angle_deg: number;
}

function crossSectionM2(shaftDiameterMm: number): number {
  const radiusM = (shaftDiameterMm / MM_PER_METER) / 2.0;
  return Math.PI * radiusM * radiusM;
}

function simulate(
  v0Mps: number,
  launchAngleDeg: number,
  massKg: number,
  kDrag: number,
  targetX: number,
  dt = 0.001,
  maxTime = 5.0,
  recordPoints = false,
): SimResult {
  const angleRad = (launchAngleDeg * Math.PI) / 180;
  let x = 0.0, y = 0.0;
  let vx = v0Mps * Math.cos(angleRad);
  let vy = v0Mps * Math.sin(angleRad);
  let t = 0.0;

  const points: TrajectoryPoint[] = [];
  if (recordPoints) {
    points.push({ t: 0.0, x_m: 0.0, y_m: 0.0, v_mps: Math.round(v0Mps * 100) / 100 });
  }

  let maxHeight = 0.0;
  let yAtTarget: number | null = null;
  let tAtTarget: number | null = null;
  let prevX = 0.0;
  let step = 0;

  while (t < maxTime) {
    const v = Math.sqrt(vx * vx + vy * vy);
    if (v < 1e-6) break;

    const dragAx = (-kDrag * v * vx) / massKg;
    const dragAy = (-kDrag * v * vy) / massKg;

    vx += dragAx * dt;
    vy += (dragAy - GRAVITY_MPS2) * dt;
    x += vx * dt;
    y += vy * dt;
    t += dt;
    step++;

    if (y > maxHeight) maxHeight = y;

    if (yAtTarget === null && prevX < targetX && targetX <= x) {
      const frac = x !== prevX ? (targetX - prevX) / (x - prevX) : 1.0;
      yAtTarget = y - vy * dt * (1.0 - frac);
      tAtTarget = t - dt * (1.0 - frac);
    }

    prevX = x;

    if (recordPoints && step % 5 === 0) {
      const vCurr = Math.sqrt(vx * vx + vy * vy);
      points.push({
        t: Math.round(t * 10000) / 10000,
        x_m: Math.round(x * 10000) / 10000,
        y_m: Math.round(y * 10000) / 10000,
        v_mps: Math.round(vCurr * 100) / 100,
      });
    }

    if (x > targetX * 1.2 && y < 0) break;
  }

  const vFinal = Math.sqrt(vx * vx + vy * vy);
  const impactAngle = vx > 0 ? (Math.atan2(-vy, vx) * 180) / Math.PI : 0.0;

  return {
    y_at_target: yAtTarget,
    t_at_target: tAtTarget,
    trajectory: points,
    max_height_m: maxHeight,
    range_m: x,
    time_of_flight_s: t,
    impact_velocity_mps: vFinal,
    impact_angle_deg: impactAngle,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface TrajectoryResult {
  launch_angle_deg: number;
  target_elevation_deg: number;
  trajectory: TrajectoryPoint[];
  max_height_m: number;
  range_m: number;
  time_of_flight_s: number;
  impact_velocity_mps: number;
  impact_angle_deg: number;
  drop_at_distances: Record<number, number>;
}

/**
 * Solve for the minimum-flight-time launch angle that reaches the target.
 * Uses bisection to find the launch angle θ such that the arrow's y-coordinate
 * at target_distance_m equals target_distance_m × tan(target_elevation_deg).
 */
export function predictTrajectory(
  launchVelocityFps: number,
  targetDistanceM: number,
  arrowMassGr: number,
  shaftDiameterMm: number,
  _arrowLengthIn: number,
  targetElevationDeg = 0.0,
  dragCoefficient = 0.30,
  dt = 0.001,
  maxTime = 5.0,
): TrajectoryResult {
  const v0 = launchVelocityFps * FPS_TO_MPS;
  const massKg = arrowMassGr / GRAINS_PER_KG;
  const areaM2 = crossSectionM2(shaftDiameterMm);
  const kDrag = 0.5 * AIR_DENSITY_KG_M3 * dragCoefficient * areaM2;

  const yTarget = targetDistanceM * Math.tan((targetElevationDeg * Math.PI) / 180);

  function miss(angleDeg: number): number | null {
    const sim = simulate(v0, angleDeg, massKg, kDrag, targetDistanceM, dt, maxTime);
    if (sim.y_at_target === null) return null;
    return sim.y_at_target - yTarget;
  }

  let lo = SOLVER_ANGLE_MIN_DEG;
  let hi = SOLVER_ANGLE_MAX_DEG;
  let solvedAngle: number;

  const missLo = miss(lo);
  const missHi = miss(hi);

  if (missHi === null || missLo === null) {
    solvedAngle = targetElevationDeg + 2.0;
  } else if (missLo > 0) {
    solvedAngle = lo;
  } else if (missHi < 0) {
    solvedAngle = hi;
  } else {
    solvedAngle = (lo + hi) / 2.0;
    for (let i = 0; i < SOLVER_MAX_ITER; i++) {
      const mid = (lo + hi) / 2.0;
      const missMid = miss(mid);
      if (missMid === null) {
        hi = mid;
        continue;
      }
      if (Math.abs(missMid) < SOLVER_TOL_M) {
        solvedAngle = mid;
        break;
      }
      if (missMid < 0) {
        lo = mid;
      } else {
        hi = mid;
      }
      solvedAngle = mid;
    }
  }

  // Final simulation with full trajectory recording
  const sim = simulate(v0, solvedAngle, massKg, kDrag, targetDistanceM, dt, maxTime, true);

  // Drop at standard distances
  const angleRad = (solvedAngle * Math.PI) / 180;
  const dropAt: Record<number, number> = {};

  for (const d of DROP_DISTANCES_M) {
    if (d > targetDistanceM) continue;
    let best: TrajectoryPoint | null = null;
    for (const pt of sim.trajectory) {
      if (best === null || Math.abs(pt.x_m - d) < Math.abs(best.x_m - d)) {
        best = pt;
      }
    }
    if (best && Math.abs(best.x_m - d) < d * 0.15) {
      const yBore = Math.cos(angleRad) > 1e-6 ? best.x_m * Math.tan(angleRad) : 0.0;
      const dropCm = (yBore - best.y_m) * 100.0;
      dropAt[d] = Math.round(dropCm * 10) / 10;
    }
  }

  return {
    launch_angle_deg: Math.round(solvedAngle * 1000) / 1000,
    target_elevation_deg: Math.round(targetElevationDeg * 100) / 100,
    trajectory: sim.trajectory,
    max_height_m: Math.round(sim.max_height_m * 1000) / 1000,
    range_m: Math.round(sim.range_m * 100) / 100,
    time_of_flight_s: Math.round((sim.t_at_target ?? sim.time_of_flight_s) * 10000) / 10000,
    impact_velocity_mps: Math.round(sim.impact_velocity_mps * 100) / 100,
    impact_angle_deg: Math.round(sim.impact_angle_deg * 100) / 100,
    drop_at_distances: dropAt,
  };
}

export interface CrosswindDriftResult {
  drift_cm: number;
  drift_rings: number;
  time_of_flight_s: number;
  advice: string;
}

/**
 * Estimate lateral drift from crosswind at target distance.
 */
export function estimateCrosswindDrift(
  launchVelocityFps: number,
  arrowMassGr: number,
  shaftDiameterMm: number,
  arrowLengthIn: number,
  targetDistanceM: number,
  crosswindSpeedMps: number,
  dragCoefficient = 0.30,
): CrosswindDriftResult {
  const v0 = launchVelocityFps * FPS_TO_MPS;
  const massKg = arrowMassGr / GRAINS_PER_KG;
  const areaM2 = crossSectionM2(shaftDiameterMm);

  const lateralArea = (shaftDiameterMm / MM_PER_METER) * (arrowLengthIn / INCHES_PER_METER);
  const kLateral = 0.5 * AIR_DENSITY_KG_M3 * dragCoefficient * lateralArea;
  const kForward = 0.5 * AIR_DENSITY_KG_M3 * dragCoefficient * areaM2;

  let x = 0.0;
  let vx = v0;
  let t = 0.0;
  const dt = 0.001;

  let vyLateral = 0.0;
  let driftM = 0.0;

  while (x < targetDistanceM && t < 10.0) {
    const v = Math.abs(vx);
    const dragAx = (-kForward * v * vx) / massKg;
    vx += dragAx * dt;
    x += vx * dt;

    const lateralForce = kLateral * crosswindSpeedMps * crosswindSpeedMps;
    const lateralAcc = lateralForce / massKg;
    vyLateral += lateralAcc * dt;
    driftM += vyLateral * dt;
    t += dt;
  }

  const driftCm = Math.abs(driftM) * 100.0;
  const ringWidthCm = 2.0;
  const driftRings = driftCm / ringWidthCm;

  const direction = crosswindSpeedMps > 0 ? "left" : "right";
  const advice = driftCm >= 0.5
    ? `Aim ${driftCm.toFixed(1)}cm ${direction} to compensate`
    : "Negligible drift — no adjustment needed";

  return {
    drift_cm: Math.round(driftCm * 10) / 10,
    drift_rings: Math.round(driftRings * 10) / 10,
    time_of_flight_s: Math.round(t * 10000) / 10000,
    advice,
  };
}
