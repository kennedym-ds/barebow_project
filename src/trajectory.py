"""Point-mass trajectory prediction for archery arrows.

Provides a simplified 3-DOF solver (2D plane: x=downrange, y=up) using
gravity + quadratic drag, plus crosswind drift estimation.

The main entry-point, ``predict_trajectory``, accepts a **target distance**
and an optional **target elevation angle** (positive = uphill, negative =
downhill) and *solves* for the launch angle that minimises flight time to
the target centre.
"""

import math

# Physical constants
AIR_DENSITY_KG_M3 = 1.225  # sea level, 15°C
GRAVITY_MPS2 = 9.80665
GRAINS_PER_KG = 15432.358
INCHES_PER_METER = 39.3701
MM_PER_METER = 1000.0
FPS_TO_MPS = 0.3048

# Standard distances for drop table (metres)
DROP_DISTANCES_M = (10, 18, 30, 50, 70)

# Solver defaults
_SOLVER_ANGLE_MIN_DEG = -10.0
_SOLVER_ANGLE_MAX_DEG = 45.0
_SOLVER_TOL_M = 0.005  # 5 mm accuracy at target
_SOLVER_MAX_ITER = 80


def _cross_section_m2(shaft_diameter_mm: float) -> float:
    """Arrow frontal cross-section area in m²."""
    radius_m = (shaft_diameter_mm / MM_PER_METER) / 2.0
    return math.pi * radius_m ** 2


# ── Low-level simulation (used by solver & returned as final result) ───


def _simulate(
    v0_mps: float,
    launch_angle_deg: float,
    mass_kg: float,
    k_drag: float,
    target_x: float,
    dt: float = 0.001,
    max_time: float = 5.0,
    record_points: bool = False,
) -> dict:
    """Run a single Euler trajectory and return summary data.

    When *record_points* is False only the miss-distance at the target
    x-position is computed (fast path used by the solver).  When True the
    full point list and auxiliary metrics are included.
    """
    angle_rad = math.radians(launch_angle_deg)
    x, y = 0.0, 0.0
    vx = v0_mps * math.cos(angle_rad)
    vy = v0_mps * math.sin(angle_rad)
    t = 0.0

    points: list[dict] = []
    if record_points:
        points.append({"t": 0.0, "x_m": 0.0, "y_m": 0.0, "v_mps": round(v0_mps, 2)})

    max_height = 0.0
    y_at_target: float | None = None
    t_at_target: float | None = None
    prev_x = 0.0

    while t < max_time:
        v = math.sqrt(vx ** 2 + vy ** 2)
        if v < 1e-6:
            break

        drag_ax = -k_drag * v * vx / mass_kg
        drag_ay = -k_drag * v * vy / mass_kg

        vx += drag_ax * dt
        vy += (drag_ay - GRAVITY_MPS2) * dt
        x += vx * dt
        y += vy * dt
        t += dt

        if y > max_height:
            max_height = y

        # Detect crossing the target x-position
        if y_at_target is None and prev_x < target_x <= x:
            # Linear interpolation for better accuracy
            frac = (target_x - prev_x) / (x - prev_x) if x != prev_x else 1.0
            y_at_target = y - vy * dt * (1.0 - frac)
            t_at_target = t - dt * (1.0 - frac)

        prev_x = x

        if record_points and int(t / dt) % 5 == 0:
            v_curr = math.sqrt(vx ** 2 + vy ** 2)
            points.append({"t": round(t, 4), "x_m": round(x, 4), "y_m": round(y, 4), "v_mps": round(v_curr, 2)})

        # Stop once well past target and below ground
        if x > target_x * 1.2 and y < 0:
            break

    v_final = math.sqrt(vx ** 2 + vy ** 2)
    impact_angle = math.degrees(math.atan2(-vy, vx)) if vx > 0 else 0.0

    return {
        "y_at_target": y_at_target,
        "t_at_target": t_at_target,
        "trajectory": points,
        "max_height_m": max_height,
        "range_m": x,
        "time_of_flight_s": t,
        "impact_velocity_mps": v_final,
        "impact_angle_deg": impact_angle,
    }


# ── Public API ─────────────────────────────────────────────────────────


def predict_trajectory(
    launch_velocity_fps: float,
    target_distance_m: float,
    arrow_mass_gr: float,
    shaft_diameter_mm: float,
    arrow_length_in: float,
    target_elevation_deg: float = 0.0,
    drag_coefficient: float = 0.30,
    dt: float = 0.001,
    max_time: float = 5.0,
) -> dict:
    """Solve for the minimum-flight-time launch angle that reaches the target.

    Parameters
    ----------
    target_distance_m : Horizontal distance to the target (m).
    target_elevation_deg : Angle from horizontal to target centre
        (positive = uphill, negative = downhill).

    The solver uses bisection to find the launch angle θ such that the
    arrow's y-coordinate at ``target_distance_m`` equals
    ``target_distance_m × tan(target_elevation_deg)``.  Among valid
    solutions the one with *minimum flight time* (flattest arc) is chosen.

    Returns dict including the solved ``launch_angle_deg``.
    """
    v0 = launch_velocity_fps * FPS_TO_MPS
    mass_kg = arrow_mass_gr / GRAINS_PER_KG
    area_m2 = _cross_section_m2(shaft_diameter_mm)
    k_drag = 0.5 * AIR_DENSITY_KG_M3 * drag_coefficient * area_m2

    # Target y-position
    y_target = target_distance_m * math.tan(math.radians(target_elevation_deg))

    # ── Bisection solver ──────────────────────────────────────────────
    def _miss(angle_deg: float) -> float | None:
        """Return (y_at_target − y_target); None if arrow never reaches target x."""
        sim = _simulate(v0, angle_deg, mass_kg, k_drag, target_distance_m, dt, max_time)
        if sim["y_at_target"] is None:
            return None
        return sim["y_at_target"] - y_target

    # Determine search range — start low for minimum flight time
    lo = _SOLVER_ANGLE_MIN_DEG
    hi = _SOLVER_ANGLE_MAX_DEG

    # Narrow the bracket: find lo where miss < 0 and hi where miss > 0
    miss_lo = _miss(lo)
    miss_hi = _miss(hi)

    # If the arrow can't even reach at max angle, use the max angle
    if miss_hi is None or miss_lo is None:
        # Fallback: use the elevation angle itself
        solved_angle = target_elevation_deg + 2.0
    elif miss_lo is not None and miss_lo > 0:
        # Even the lowest angle overshoots — use it
        solved_angle = lo
    elif miss_hi is not None and miss_hi < 0:
        # Even the highest angle undershoots — use it
        solved_angle = hi
    else:
        # Valid bracket — bisect
        solved_angle = (lo + hi) / 2.0
        for _ in range(_SOLVER_MAX_ITER):
            mid = (lo + hi) / 2.0
            miss_mid = _miss(mid)
            if miss_mid is None:
                hi = mid
                continue
            if abs(miss_mid) < _SOLVER_TOL_M:
                solved_angle = mid
                break
            if miss_mid < 0:
                lo = mid
            else:
                hi = mid
            solved_angle = mid

    # ── Final simulation with full trajectory recording ───────────────
    sim = _simulate(v0, solved_angle, mass_kg, k_drag, target_distance_m, dt, max_time, record_points=True)

    # Drop at standard distances relative to bore-sight line from launch
    angle_rad = math.radians(solved_angle)
    drop_at: dict[int, float] = {}
    for d in DROP_DISTANCES_M:
        if d > target_distance_m:
            continue
        best = None
        for pt in sim["trajectory"]:
            if best is None or abs(pt["x_m"] - d) < abs(best["x_m"] - d):
                best = pt
        if best and abs(best["x_m"] - d) < d * 0.15:
            y_bore = best["x_m"] * math.tan(angle_rad) if math.cos(angle_rad) > 1e-6 else 0.0
            drop_cm = (y_bore - best["y_m"]) * 100.0
            drop_at[d] = round(drop_cm, 1)

    return {
        "launch_angle_deg": round(solved_angle, 3),
        "target_elevation_deg": round(target_elevation_deg, 2),
        "trajectory": sim["trajectory"],
        "max_height_m": round(sim["max_height_m"], 3),
        "range_m": round(sim["range_m"], 2),
        "time_of_flight_s": round(sim["t_at_target"] or sim["time_of_flight_s"], 4),
        "impact_velocity_mps": round(sim["impact_velocity_mps"], 2),
        "impact_angle_deg": round(sim["impact_angle_deg"], 2),
        "drop_at_distances": drop_at,
    }


def estimate_crosswind_drift(
    launch_velocity_fps: float,
    arrow_mass_gr: float,
    shaft_diameter_mm: float,
    arrow_length_in: float,
    target_distance_m: float,
    crosswind_speed_mps: float,
    drag_coefficient: float = 0.30,
) -> dict:
    """Estimate lateral drift from crosswind at target distance.

    Uses a simplified model: integrate lateral drag force produced by
    crosswind over the arrow's time of flight.  The time of flight is
    estimated from a flat trajectory (0° launch angle).

    Returns dict with drift_cm, drift_rings, time_of_flight_s, advice.
    """
    v0 = launch_velocity_fps * FPS_TO_MPS
    mass_kg = arrow_mass_gr / GRAINS_PER_KG
    area_m2 = _cross_section_m2(shaft_diameter_mm)

    # Lateral area exposed to wind: shaft diameter × arrow length
    lateral_area = (shaft_diameter_mm / MM_PER_METER) * (arrow_length_in / INCHES_PER_METER)

    k_lateral = 0.5 * AIR_DENSITY_KG_M3 * drag_coefficient * lateral_area

    # Estimate time-of-flight using simplified 1D trajectory (no vertical)
    k_forward = 0.5 * AIR_DENSITY_KG_M3 * drag_coefficient * area_m2
    x = 0.0
    vx = v0
    t = 0.0
    dt = 0.001

    # Accumulate lateral drift: track lateral velocity from wind force
    vy_lateral = 0.0
    drift_m = 0.0

    while x < target_distance_m and t < 10.0:
        v = abs(vx)
        drag_ax = -k_forward * v * vx / mass_kg
        vx += drag_ax * dt
        x += vx * dt

        # Lateral acceleration from crosswind force
        lateral_force = k_lateral * crosswind_speed_mps ** 2
        lateral_acc = lateral_force / mass_kg
        vy_lateral += lateral_acc * dt
        drift_m += vy_lateral * dt

        t += dt

    drift_cm = abs(drift_m) * 100.0

    # Ring impact: WA 40cm face has ~2cm per ring (10 rings, 20cm radius)
    ring_width_cm = 2.0
    drift_rings = drift_cm / ring_width_cm

    direction = "left" if crosswind_speed_mps > 0 else "right"
    advice = f"Aim {drift_cm:.1f}cm {direction} to compensate" if drift_cm >= 0.5 else "Negligible drift — no adjustment needed"

    return {
        "drift_cm": round(drift_cm, 1),
        "drift_rings": round(drift_rings, 1),
        "time_of_flight_s": round(t, 4),
        "advice": advice,
    }
