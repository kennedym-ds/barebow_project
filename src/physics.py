from src.models import ArrowSetup, BowSetup

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

GRAINS_PER_KG = 15432.358
INCHES_PER_METER = 39.3701
MM_PER_INCH = 25.4


def calculate_gpp(arrow_weight_gr: float, draw_weight_lbs: float) -> float:
    """Calculates Grains Per Pound."""
    if draw_weight_lbs <= 0:
        return 0.0
    return arrow_weight_gr / draw_weight_lbs


def calculate_foc(
    arrow_length_in: float,
    point_weight_gr: float,
    total_weight_gr: float,
    nock_weight_gr: float = 10.0,
    fletch_weight_gr: float = 15.0,
) -> float:
    """
    Calculates Front of Center (FOC) percentage using component estimation.

    Formula: FOC% = 100 * (Balance Point - Length/2) / Length

    We calculate Balance Point (Center of Gravity) using the Law of Moments from the nock end.

    Assumptions:
    - Point is at x = Length
    - Nock is at x = 0
    - Fletching CG is approx 1.5 inches from Nock (x = 1.5)
    - Shaft is uniform, CG at x = Length / 2
    """
    if arrow_length_in <= 0 or total_weight_gr <= 0:
        return 0.0

    # Calculate Shaft Weight
    shaft_weight_gr = total_weight_gr - point_weight_gr - nock_weight_gr - fletch_weight_gr

    if shaft_weight_gr < 0:
        # Fallback if weights are inconsistent
        shaft_weight_gr = 0

    # Calculate Moments (from Nock, i.e., 0)
    # Note: Traditional FOC measures from Nock Groove, so L is full length.
    # However, usually FOC is calculated relative to the arrow length.
    # Let's use distance from Nock groove.

    m_nock = nock_weight_gr * 0.0
    m_fletch = fletch_weight_gr * 1.5  # Approx 1.5" from nock groove
    m_shaft = shaft_weight_gr * (arrow_length_in / 2.0)
    m_point = point_weight_gr * arrow_length_in  # Point weight acts at the tip (approx)

    total_moment = m_nock + m_fletch + m_shaft + m_point
    center_of_gravity_from_nock = total_moment / total_weight_gr

    # FOC Calculation
    # FOC = (CG - Center_of_Arrow) / Arrow_Length
    center_of_arrow = arrow_length_in / 2.0

    # We need to measure CG from the Nock?
    # Usually FOC is (A - L/2) / L where A is distance from Nock to CG.
    # Let's verify direction.
    # If heavy point, CG is closer to point (Large A).
    # A > L/2 -> Positive FOC.

    foc_decimal = (center_of_gravity_from_nock - center_of_arrow) / arrow_length_in
    return round(foc_decimal * 100.0, 1)


def analyze_setup_safety(bow: BowSetup, arrow: ArrowSetup) -> list[str]:
    """Checks for dangerous configurations."""
    warnings = []
    gpp = calculate_gpp(arrow.total_arrow_weight_gr, bow.draw_weight_otf)

    if gpp < 5.0:
        warnings.append("CRITICAL: GPP is below 5.0. Risk of limb failure (Dry Fire equivalent).")
    elif gpp < 7.0:
        warnings.append("WARNING: GPP is below 7.0. Check limb manufacturer warranty.")

    return warnings


def score_setup_efficiency(bow: BowSetup, arrow: ArrowSetup, discipline: str = "indoor") -> dict:
    """
    Scores the equipment setup based on the 'Barebow Triangle' logic.
    Returns a score (0-100) and feedback list.
    """
    score = 100
    feedback = []

    gpp = calculate_gpp(arrow.total_arrow_weight_gr, bow.draw_weight_otf)

    if discipline == "indoor":
        # Indoor wants heavy arrows (High GPP) for stability
        if gpp < 8.0:
            score -= 30
            feedback.append(
                f"GPP ({gpp:.1f}) is too low for Indoor. Consider heavier points to slow the shot and reduce gaps."
            )
        elif gpp > 13.0:
            score -= 10
            feedback.append(
                f"GPP ({gpp:.1f}) is very high. Ensure trajectory allows reaching 18m with good sight mark."
            )
        else:
            feedback.append("Excellent GPP for Indoor stability.")

        if arrow.shaft_diameter_mm < 8.0:
            score -= 10
            feedback.append("Arrow is thin for Indoor. Consider 9.3mm shafts for line-cutting.")

    elif discipline == "outdoor":
        # Outdoor wants speed (Low GPP) and low drag
        if gpp > 9.0:
            score -= 20
            feedback.append(f"GPP ({gpp:.1f}) is heavy for Outdoor. You may struggle with 50m sight marks.")
        elif gpp < 6.0:
            score -= 30  # Safety risk handled elsewhere, but bad for stability too
            feedback.append("GPP is critically low.")

        if arrow.shaft_diameter_mm > 6.0:
            score -= 15
            feedback.append("Arrow diameter is large for Outdoor. Wind drift will be significant.")

    return {"score": max(0, score), "gpp": round(gpp, 2), "feedback": feedback}


# ---------------------------------------------------------------------------
# Launch velocity estimation
# ---------------------------------------------------------------------------


def estimate_launch_velocity(
    draw_weight_lbs: float,
    draw_length_in: float,
    arrow_weight_gr: float,
    bow_efficiency: float = 0.80,
    string_mass_gr: float = 60.0,
) -> float:
    """Estimate arrow launch velocity in feet per second.

    Uses simplified energy-balance method:
        Stored energy ≈ ½ · F · d  (linear draw-force approximation)
        KE_arrow = η · E_stored
        v = sqrt(2 · KE / m_effective)
        m_effective = arrow_mass + ⅓ · string_mass  (virtual mass model)

    Returns 0.0 for non-positive inputs.
    """
    if draw_weight_lbs <= 0 or draw_length_in <= 0 or arrow_weight_gr <= 0:
        return 0.0

    # Convert to SI
    force_n = draw_weight_lbs * 4.44822  # lbs → N
    draw_m = draw_length_in / INCHES_PER_METER  # in → m
    arrow_kg = arrow_weight_gr / GRAINS_PER_KG
    string_kg = string_mass_gr / GRAINS_PER_KG

    stored_energy_j = 0.5 * force_n * draw_m
    kinetic_energy_j = bow_efficiency * stored_energy_j

    effective_mass_kg = arrow_kg + (string_kg / 3.0)
    if effective_mass_kg <= 0:
        return 0.0

    velocity_mps = (2.0 * kinetic_energy_j / effective_mass_kg) ** 0.5
    velocity_fps = velocity_mps * 3.28084
    return round(velocity_fps, 1)


# ---------------------------------------------------------------------------
# Dynamic spine — Energy-corrected multiplicative model
# ---------------------------------------------------------------------------

# Reference values (ASTM / Easton baseline)
_REF_DRAW_LENGTH_IN = 28.0
_REF_BRACE_HEIGHT_IN = 8.0
_REF_POWER_STROKE_IN = _REF_DRAW_LENGTH_IN - _REF_BRACE_HEIGHT_IN  # 20"
_REF_POINT_WEIGHT_GR = 125.0
_REF_STRAND_COUNT = 16


def calculate_dynamic_spine(
    static_spine: float,
    arrow_length_in: float,
    point_weight_gr: float,
    draw_weight_lbs: float,
    draw_length_in: float = 28.0,
    brace_height_in: float = 8.0,
    strand_count: int = 16,
) -> float:
    """Estimate dynamic spine using the energy-corrected multiplicative model.

    Instead of simple additive corrections (Stu Miller), this model applies
    multiplicative factors grounded in Euler-Bernoulli beam theory and
    energy-balance physics:

    S_dynamic = S_static × C_length × C_point × C_draw_length × C_brace_height × C_string

    Factors (all relative to ASTM reference: 28" draw, 8" brace, 125 gr point, 16 strands):
      * C_length:  Arrow length vs 28" — longer arrow deflects more (beam L³ effect).
      * C_point:   Point weight vs 125 gr — heavier point shifts vibration node.
      * C_draw_length: Draw length vs 28" — more draw = more force on arrow.
      * C_brace_height: Power stroke correction — lower brace = longer acceleration.
      * C_string:  String mass via strand count — heavier string absorbs energy.

    Returns 0.0 for non-positive static_spine or draw_weight_lbs.
    """
    if static_spine <= 0 or draw_weight_lbs <= 0:
        return 0.0

    # Arrow-side corrections
    c_length = 1.0 + ((arrow_length_in - _REF_DRAW_LENGTH_IN) / _REF_DRAW_LENGTH_IN) * 1.5
    c_point = 1.0 + ((point_weight_gr - _REF_POINT_WEIGHT_GR) / _REF_POINT_WEIGHT_GR) * 0.4

    # Bow-side corrections (effective force ratio)
    c_draw_length = draw_length_in / _REF_DRAW_LENGTH_IN
    power_stroke = max(draw_length_in - brace_height_in, 10.0)
    c_brace_height = power_stroke / _REF_POWER_STROKE_IN
    c_string = max(1.0 - 0.003 * (strand_count - _REF_STRAND_COUNT), 0.90)

    dynamic = static_spine * c_length * c_point * c_draw_length * c_brace_height * c_string
    return round(max(dynamic, 50.0), 1)


# ---------------------------------------------------------------------------
# Flexural rigidity
# ---------------------------------------------------------------------------


def calculate_flexural_rigidity(
    spine_astm: float,
    shaft_diameter_mm: float,
) -> float:
    """Calculate flexural rigidity (EI) in N·m² from ASTM spine and shaft diameter.

    ASTM spine is deflection in thousandths of an inch under an 880 g (1.94 lbs)
    centre-load on a 28-inch (0.7112 m) span. Using Euler beam formula:
        EI = F · L³ / (48 · δ)

    Where F = 0.880 kg × 9.81 m/s² = 8.6328 N, L = 0.7112 m,
    δ = spine / 1000 · 0.0254 m.

    Returns 0.0 for non-positive inputs.
    """
    if spine_astm <= 0 or shaft_diameter_mm <= 0:
        return 0.0

    force_n = 0.880 * 9.81  # 880 g test weight
    span_m = 28.0 / INCHES_PER_METER  # 28" test span
    deflection_m = (spine_astm / 1000.0) * (1.0 / INCHES_PER_METER)  # thousandths-inch → m

    if deflection_m <= 0:
        return 0.0

    ei = (force_n * span_m**3) / (48.0 * deflection_m)
    return round(ei, 4)


# ---------------------------------------------------------------------------
# Arrow natural frequency & spine-frequency match
# ---------------------------------------------------------------------------

import math  # noqa: E402 — grouped with physics section


def arrow_natural_frequency(
    spine_astm: float,
    shaft_diameter_mm: float,
    total_weight_gr: float,
    arrow_length_in: float,
) -> float:
    """Calculate fundamental natural frequency (Hz) of the arrow in free-free vibration.

    Uses Euler-Bernoulli beam theory:
        f₁ = (β₁²) / (2π L²) × √(EI / μ)

    where β₁L = 1.506π for the first bending mode of a free-free beam,
    EI is flexural rigidity, and μ is linear mass density (kg/m).

    Returns 0.0 for non-positive inputs.
    """
    if spine_astm <= 0 or shaft_diameter_mm <= 0 or total_weight_gr <= 0 or arrow_length_in <= 0:
        return 0.0

    ei = calculate_flexural_rigidity(spine_astm, shaft_diameter_mm)
    if ei <= 0:
        return 0.0

    mass_kg = total_weight_gr / GRAINS_PER_KG
    length_m = arrow_length_in / INCHES_PER_METER
    mu = mass_kg / length_m  # linear mass density

    beta1_L = 1.506 * math.pi
    beta1 = beta1_L / length_m
    omega1 = beta1**2 * math.sqrt(ei / mu)
    freq_hz = omega1 / (2.0 * math.pi)
    return round(freq_hz, 1)


def spine_frequency_match(
    arrow_freq_hz: float,
    draw_length_in: float,
    brace_height_in: float,
    launch_velocity_fps: float,
) -> dict:
    """Check if the arrow's vibration frequency matches the power-stroke timing.

    Proper spine matching ≈ arrow completes ~1 full oscillation during the
    power stroke (per Kooi-Bergman theory).

    The power-stroke duration is estimated as the average of rest-to-launch
    acceleration over the stroke distance:
        t_ps ≈ 2 × stroke_ft / v_launch_fps

    Returns match_quality, oscillations, arrow_frequency_hz,
    power_stroke_duration_ms, and a human-readable message.
    """
    if arrow_freq_hz <= 0 or launch_velocity_fps <= 0:
        return {
            "match_quality": "unknown",
            "oscillations_during_power_stroke": 0.0,
            "arrow_frequency_hz": 0.0,
            "power_stroke_duration_ms": 0.0,
            "message": "Insufficient data for frequency analysis",
        }

    ps_in = max(draw_length_in - brace_height_in, 5.0)
    ps_ft = ps_in / 12.0
    avg_v_fps = launch_velocity_fps / 2.0
    ps_duration_s = ps_ft / avg_v_fps

    oscillations = arrow_freq_hz * ps_duration_s

    if 0.8 <= oscillations <= 1.2:
        quality = "excellent"
        msg = f"Arrow completes {oscillations:.2f} oscillations — near-ideal paradox clearance"
    elif 0.6 <= oscillations <= 1.4:
        quality = "good"
        msg = f"Arrow completes {oscillations:.2f} oscillations — acceptable clearance"
    elif oscillations < 0.6:
        quality = "too_stiff"
        msg = f"Arrow completes only {oscillations:.2f} oscillations — too stiff, won't flex around riser"
    else:
        quality = "too_weak"
        msg = f"Arrow completes {oscillations:.2f} oscillations — too weak, excessive flexing"

    return {
        "match_quality": quality,
        "oscillations_during_power_stroke": round(oscillations, 2),
        "arrow_frequency_hz": round(arrow_freq_hz, 1),
        "power_stroke_duration_ms": round(ps_duration_s * 1000, 2),
        "message": msg,
    }


# ---------------------------------------------------------------------------
# Spine recommendation & matching
# ---------------------------------------------------------------------------

# Easton-style base spine chart: draw_weight_lbs → recommended spine
# Interpolated for barebow recurve with 28" draw, 125 gr point.
# Extended with additional data points for better interpolation in common range.
_SPINE_CHART: list[tuple[float, int]] = [
    (20, 900),
    (22, 850),
    (25, 800),
    (27, 750),
    (30, 700),
    (35, 600),
    (40, 500),
    (45, 450),
    (50, 400),
    (55, 350),
    (60, 300),
    (70, 250),
]


def _interpolate_spine(draw_weight_lbs: float) -> float:
    """Linear interpolation on the spine chart."""
    if draw_weight_lbs <= _SPINE_CHART[0][0]:
        return float(_SPINE_CHART[0][1])
    if draw_weight_lbs >= _SPINE_CHART[-1][0]:
        return float(_SPINE_CHART[-1][1])

    for i in range(len(_SPINE_CHART) - 1):
        w0, s0 = _SPINE_CHART[i]
        w1, s1 = _SPINE_CHART[i + 1]
        if w0 <= draw_weight_lbs <= w1:
            t = (draw_weight_lbs - w0) / (w1 - w0)
            return s0 + t * (s1 - s0)
    return float(_SPINE_CHART[-1][1])  # fallback


def recommend_spine(
    draw_weight_lbs: float,
    draw_length_in: float,
    point_weight_gr: float,
    arrow_length_in: float,
    brace_height_in: float = 8.0,
    strand_count: int = 16,
) -> dict:
    """Recommend optimal spine range using the energy-corrected model.

    Uses the effective draw weight (corrected for brace height, draw length,
    and string mass) to look up the Easton spine chart, then applies
    multiplicative arrow-side corrections for length and point weight.

    Returns dict with recommended_spine, effective_draw_weight, range_low,
    range_high, and explanatory notes.
    """
    if draw_weight_lbs <= 0:
        return {
            "recommended_spine": 0,
            "effective_draw_weight": 0.0,
            "range_low": 0,
            "range_high": 0,
            "notes": ["Invalid draw weight"],
        }

    # Effective draw weight (bow-side corrections)
    c_draw_length = draw_length_in / _REF_DRAW_LENGTH_IN
    power_stroke = max(draw_length_in - brace_height_in, 10.0)
    c_brace = power_stroke / _REF_POWER_STROKE_IN
    c_string = max(1.0 - 0.003 * (strand_count - _REF_STRAND_COUNT), 0.90)

    eff_weight = draw_weight_lbs * c_draw_length * c_brace * c_string
    base_spine = _interpolate_spine(eff_weight)

    notes: list[str] = []

    # Arrow-side multiplicative corrections
    c_length = 1.0 + ((arrow_length_in - _REF_DRAW_LENGTH_IN) / _REF_DRAW_LENGTH_IN) * 1.5
    c_point = 1.0 + ((point_weight_gr - _REF_POINT_WEIGHT_GR) / _REF_POINT_WEIGHT_GR) * 0.4

    if abs(arrow_length_in - _REF_DRAW_LENGTH_IN) >= 0.5:
        direction = "weaker" if arrow_length_in > _REF_DRAW_LENGTH_IN else "stiffer"
        notes.append(f"Arrow length {arrow_length_in}\" — effective spine is {direction} vs 28\" ref")

    if abs(point_weight_gr - _REF_POINT_WEIGHT_GR) >= 10:
        direction = "weaker" if point_weight_gr > _REF_POINT_WEIGHT_GR else "stiffer"
        notes.append(f"Point weight {point_weight_gr} gr — effective spine is {direction} vs 125 gr ref")

    if abs(draw_length_in - _REF_DRAW_LENGTH_IN) >= 0.5:
        notes.append(f"Draw length {draw_length_in}\" (effective draw weight {eff_weight:.1f} lbs)")

    if abs(brace_height_in - _REF_BRACE_HEIGHT_IN) >= 0.25:
        direction = "more force" if brace_height_in < _REF_BRACE_HEIGHT_IN else "less force"
        notes.append(f"Brace height {brace_height_in}\" — {direction} than 8\" reference")

    if strand_count != _REF_STRAND_COUNT:
        notes.append(f"String strand count {strand_count} (ref 16)")

    adjusted = base_spine * c_length * c_point
    recommended = int(round(adjusted / 10) * 10)

    # Range: ±40 spine (tighter than old ±50 thanks to better model)
    range_low = max(recommended - 40, 200)
    range_high = recommended + 40

    if not notes:
        notes.append("Standard setup — no significant adjustments needed")

    return {
        "recommended_spine": recommended,
        "effective_draw_weight": round(eff_weight, 1),
        "range_low": range_low,
        "range_high": range_high,
        "notes": notes,
    }


def check_spine_match(
    actual_spine: float,
    draw_weight_lbs: float,
    draw_length_in: float,
    point_weight_gr: float,
    arrow_length_in: float,
    brace_height_in: float = 8.0,
    strand_count: int = 16,
    total_arrow_weight_gr: float | None = None,
    shaft_diameter_mm: float | None = None,
) -> dict:
    """Check if actual spine matches recommendation using energy-corrected model.

    Optionally performs natural-frequency analysis when total_arrow_weight_gr
    and shaft_diameter_mm are provided (needed for Kooi-Bergman frequency match).

    Returns status, recommended_spine, actual_dynamic_spine, effective_draw_weight,
    deviation_pct, message, and optional frequency_match.
    """
    rec = recommend_spine(
        draw_weight_lbs, draw_length_in, point_weight_gr, arrow_length_in, brace_height_in, strand_count
    )
    recommended = rec["recommended_spine"]

    if recommended == 0:
        return {
            "status": "unknown",
            "recommended_spine": 0,
            "effective_draw_weight": 0.0,
            "actual_dynamic_spine": actual_spine,
            "deviation_pct": 0.0,
            "message": "Cannot determine recommendation — check bow parameters",
            "frequency_match": None,
        }

    dynamic = calculate_dynamic_spine(
        actual_spine, arrow_length_in, point_weight_gr, draw_weight_lbs, draw_length_in, brace_height_in, strand_count
    )
    deviation_pct = ((dynamic - recommended) / recommended) * 100.0

    if abs(deviation_pct) <= 10:
        status = "matched"
        message = f"Spine is well-matched (dynamic {dynamic:.0f} vs recommended {recommended})"
    elif 10 < deviation_pct <= 20:
        status = "slightly_weak"
        message = f"Spine may be slightly weak — dynamic {dynamic:.0f} vs recommended {recommended}"
    elif deviation_pct > 20:
        status = "too_weak"
        message = f"Spine is too weak — dynamic {dynamic:.0f} vs recommended {recommended}. Consider stiffer shafts."
    elif -20 <= deviation_pct < -10:
        status = "slightly_stiff"
        message = f"Spine may be slightly stiff — dynamic {dynamic:.0f} vs recommended {recommended}"
    else:
        status = "too_stiff"
        message = f"Spine is too stiff — dynamic {dynamic:.0f} vs recommended {recommended}. Consider weaker shafts."

    # Optional frequency analysis
    freq_result: dict | None = None
    if total_arrow_weight_gr and shaft_diameter_mm:
        freq_hz = arrow_natural_frequency(actual_spine, shaft_diameter_mm, total_arrow_weight_gr, arrow_length_in)
        if freq_hz > 0:
            launch_v = estimate_launch_velocity(draw_weight_lbs, draw_length_in, total_arrow_weight_gr)
            if launch_v > 0:
                freq_result = spine_frequency_match(freq_hz, draw_length_in, brace_height_in, launch_v)

    return {
        "status": status,
        "recommended_spine": recommended,
        "effective_draw_weight": rec["effective_draw_weight"],
        "actual_dynamic_spine": round(dynamic, 1),
        "deviation_pct": round(deviation_pct, 1),
        "message": message,
        "frequency_match": freq_result,
    }
