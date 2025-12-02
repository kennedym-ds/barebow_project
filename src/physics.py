from src.models import BowSetup, ArrowSetup

def calculate_gpp(arrow_weight_gr: float, draw_weight_lbs: float) -> float:
    """Calculates Grains Per Pound."""
    if draw_weight_lbs <= 0:
        return 0.0
    return arrow_weight_gr / draw_weight_lbs

def calculate_foc(arrow_length_in: float, point_weight_gr: float, total_weight_gr: float, nock_weight_gr: float = 10.0, fletch_weight_gr: float = 15.0) -> float:
    """
    Calculates Front of Center (FOC) percentage.
    Simplified formula assuming standard component distribution if exact centers of gravity aren't known.
    Standard Formula: ((Balance Point - (Length/2)) / Length) * 100
    
    We can approximate Balance Point using moments if we don't have the physical measurement.
    But usually, FOC is an input or derived from component weights.
    
    Approximation using weights (assuming shaft is uniform):
    Moment from tip = (Point * 0) + (Shaft * L/2) + (Fletch * (L-1)) + (Nock * L)
    CG = Total Moment / Total Weight
    """
    # This is a complex estimation without knowing shaft weight specifically vs total.
    # Let's assume the user might input FOC or we use a heuristic.
    # For now, let's use a placeholder or a simple weight ratio heuristic if needed.
    # Actually, let's stick to the GPP for now as it's deterministic from our inputs.
    return 0.0 

def analyze_setup_safety(bow: BowSetup, arrow: ArrowSetup) -> list[str]:
    """Checks for dangerous configurations."""
    warnings = []
    gpp = calculate_gpp(arrow.total_arrow_weight_gr, bow.draw_weight_otf)
    
    if gpp < 5.0:
        warnings.append("CRITICAL: GPP is below 5.0. Risk of limb failure (Dry Fire equivalent).")
    elif gpp < 7.0:
        warnings.append("WARNING: GPP is below 7.0. Check limb manufacturer warranty.")
        
    return warnings

def score_setup_efficiency(bow: BowSetup, arrow: ArrowSetup, discipline: str = 'indoor') -> dict:
    """
    Scores the equipment setup based on the 'Barebow Triangle' logic.
    Returns a score (0-100) and feedback list.
    """
    score = 100
    feedback = []
    
    gpp = calculate_gpp(arrow.total_arrow_weight_gr, bow.draw_weight_otf)
    
    if discipline == 'indoor':
        # Indoor wants heavy arrows (High GPP) for stability
        if gpp < 8.0:
            score -= 30
            feedback.append(f"GPP ({gpp:.1f}) is too low for Indoor. Consider heavier points to slow the shot and reduce gaps.")
        elif gpp > 13.0:
            score -= 10
            feedback.append(f"GPP ({gpp:.1f}) is very high. Ensure trajectory allows reaching 18m with good sight mark.")
        else:
            feedback.append("Excellent GPP for Indoor stability.")
            
        if arrow.shaft_diameter_mm < 8.0:
            score -= 10
            feedback.append("Arrow is thin for Indoor. Consider 9.3mm shafts for line-cutting.")
            
    elif discipline == 'outdoor':
        # Outdoor wants speed (Low GPP) and low drag
        if gpp > 9.0:
            score -= 20
            feedback.append(f"GPP ({gpp:.1f}) is heavy for Outdoor. You may struggle with 50m sight marks.")
        elif gpp < 6.0:
            score -= 30 # Safety risk handled elsewhere, but bad for stability too
            feedback.append("GPP is critically low.")
            
        if arrow.shaft_diameter_mm > 6.0:
            score -= 15
            feedback.append("Arrow diameter is large for Outdoor. Wind drift will be significant.")
            
    return {
        "score": max(0, score),
        "gpp": round(gpp, 2),
        "feedback": feedback
    }
