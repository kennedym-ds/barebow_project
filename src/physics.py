from src.models import ArrowSetup, BowSetup


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
