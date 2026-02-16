from src.physics import (
    arrow_natural_frequency,
    calculate_dynamic_spine,
    calculate_flexural_rigidity,
    calculate_foc,
    check_spine_match,
    estimate_launch_velocity,
    recommend_spine,
    spine_frequency_match,
)


def test_calculate_foc_standard():
    # Example:
    # Arrow Length: 30"
    # Point: 150gr
    # Nock: 10gr
    # Fletch: 15gr
    # Total: 450gr
    # Shaft: 450 - 150 - 10 - 15 = 275gr

    # Moments:
    # Nock: 0
    # Fletch: 15 * 1.5 = 22.5
    # Shaft: 275 * 15 = 4125
    # Point: 150 * 30 = 4500
    # Total Moment: 8647.5

    # CG = 8647.5 / 450 = 19.216 inches from nock

    # FOC = (19.216 - 15) / 30 = 4.216 / 30 = 0.1405 => 14.1%

    foc = calculate_foc(30, 150, 450, 10, 15)
    assert abs(foc - 14.1) < 0.2


def test_calculate_foc_high():
    # Heavy point
    # Arrow Length: 30"
    # Point: 250gr
    # Nock: 10gr
    # Fletch: 15gr
    # Total: 550gr
    # Shaft: 275gr

    foc = calculate_foc(30, 250, 550, 10, 15)
    # CG calculation:
    # Shaft: 275*15 = 4125
    # Point: 250*30 = 7500
    # Fletch: 22.5
    # Total M: 11647.5
    # CG: 11647.5 / 550 = 21.177
    # FOC: (21.177 - 15) / 30 = 6.177 / 30 = 0.2059 => 20.6%

    assert abs(foc - 20.6) < 0.2


def test_calculate_foc_zero():
    assert calculate_foc(0, 0, 0) == 0.0


# ---------------------------------------------------------------------------
# estimate_launch_velocity
# ---------------------------------------------------------------------------


def test_launch_velocity_typical():
    """A 40 lb barebow at 28" with 350 gr arrow should be ~170-220 fps."""
    fps = estimate_launch_velocity(40.0, 28.0, 350.0)
    assert 170 < fps < 220


def test_launch_velocity_heavy_arrow():
    """Heavier arrow → slower."""
    light = estimate_launch_velocity(40.0, 28.0, 300.0)
    heavy = estimate_launch_velocity(40.0, 28.0, 500.0)
    assert heavy < light


def test_launch_velocity_higher_draw_weight():
    """More draw weight → faster."""
    low = estimate_launch_velocity(30.0, 28.0, 350.0)
    high = estimate_launch_velocity(50.0, 28.0, 350.0)
    assert high > low


def test_launch_velocity_zero_inputs():
    assert estimate_launch_velocity(0.0, 28.0, 350.0) == 0.0
    assert estimate_launch_velocity(40.0, 0.0, 350.0) == 0.0
    assert estimate_launch_velocity(40.0, 28.0, 0.0) == 0.0


def test_launch_velocity_custom_efficiency():
    """Lower bow efficiency → slower arrow."""
    normal = estimate_launch_velocity(40.0, 28.0, 350.0, bow_efficiency=0.80)
    low_eff = estimate_launch_velocity(40.0, 28.0, 350.0, bow_efficiency=0.60)
    assert low_eff < normal


# ---------------------------------------------------------------------------
# calculate_dynamic_spine (energy-corrected multiplicative model)
# ---------------------------------------------------------------------------


def test_dynamic_spine_baseline():
    """28" arrow, 125 gr point, 28" draw, 8" brace, 16 strands → equals static spine."""
    ds = calculate_dynamic_spine(500.0, 28.0, 125.0, 40.0, 28.0, 8.0, 16)
    assert ds == 500.0


def test_dynamic_spine_longer_arrow():
    """Longer arrow → higher (weaker) dynamic spine."""
    short = calculate_dynamic_spine(500.0, 27.0, 125.0, 40.0, 28.0, 8.0)
    long = calculate_dynamic_spine(500.0, 30.0, 125.0, 40.0, 28.0, 8.0)
    assert long > short


def test_dynamic_spine_heavier_point():
    """Heavier point → weaker dynamic spine (higher number)."""
    light = calculate_dynamic_spine(500.0, 28.0, 100.0, 40.0, 28.0, 8.0)
    heavy = calculate_dynamic_spine(500.0, 28.0, 200.0, 40.0, 28.0, 8.0)
    assert heavy > light


def test_dynamic_spine_lower_brace_height():
    """Lower brace height → longer power stroke → stiffer requirement (higher dynamic spine)."""
    high_brace = calculate_dynamic_spine(500.0, 28.0, 125.0, 40.0, 28.0, 9.0)
    low_brace = calculate_dynamic_spine(500.0, 28.0, 125.0, 40.0, 28.0, 7.5)
    assert low_brace > high_brace


def test_dynamic_spine_longer_draw():
    """Longer draw length → more force → higher dynamic spine."""
    short_draw = calculate_dynamic_spine(500.0, 28.0, 125.0, 40.0, 27.0, 8.0)
    long_draw = calculate_dynamic_spine(500.0, 28.0, 125.0, 40.0, 30.0, 8.0)
    assert long_draw > short_draw


def test_dynamic_spine_more_strands():
    """More string strands → absorbs energy → lower dynamic spine."""
    light_string = calculate_dynamic_spine(500.0, 28.0, 125.0, 40.0, 28.0, 8.0, 14)
    heavy_string = calculate_dynamic_spine(500.0, 28.0, 125.0, 40.0, 28.0, 8.0, 20)
    assert heavy_string < light_string


def test_dynamic_spine_zero_static():
    assert calculate_dynamic_spine(0.0, 28.0, 125.0, 40.0) == 0.0


def test_dynamic_spine_zero_draw_weight():
    assert calculate_dynamic_spine(500.0, 28.0, 125.0, 0.0) == 0.0


# ---------------------------------------------------------------------------
# calculate_flexural_rigidity
# ---------------------------------------------------------------------------


def test_flexural_rigidity_typical():
    """500 spine, 5mm shaft → reasonable EI (order of magnitude ~5-20 N·m²)."""
    ei = calculate_flexural_rigidity(500.0, 5.0)
    assert 1.0 < ei < 30.0


def test_flexural_rigidity_stiffer_shaft():
    """Lower spine number (stiffer) → higher EI."""
    stiff = calculate_flexural_rigidity(300.0, 5.0)
    weak = calculate_flexural_rigidity(700.0, 5.0)
    assert stiff > weak


def test_flexural_rigidity_zero_inputs():
    assert calculate_flexural_rigidity(0.0, 5.0) == 0.0
    assert calculate_flexural_rigidity(500.0, 0.0) == 0.0


# ---------------------------------------------------------------------------
# recommend_spine
# ---------------------------------------------------------------------------


def test_recommend_spine_40lbs_28in():
    """40 lbs, 28", 125 gr → ~500 spine."""
    rec = recommend_spine(40.0, 28.0, 125.0, 28.0)
    assert 450 <= rec["recommended_spine"] <= 550
    assert rec["range_low"] < rec["recommended_spine"] < rec["range_high"]
    assert rec["effective_draw_weight"] > 0


def test_recommend_spine_heavy_point():
    """Heavy point → weaker (higher) spine recommendation."""
    light = recommend_spine(40.0, 28.0, 100.0, 28.0)
    heavy = recommend_spine(40.0, 28.0, 200.0, 28.0)
    assert heavy["recommended_spine"] >= light["recommended_spine"]


def test_recommend_spine_zero_draw_weight():
    rec = recommend_spine(0.0, 28.0, 125.0, 28.0)
    assert rec["recommended_spine"] == 0


def test_recommend_spine_notes():
    """Non-standard setup produces explanatory notes."""
    rec = recommend_spine(40.0, 30.0, 175.0, 30.0)
    assert len(rec["notes"]) >= 1


def test_recommend_spine_brace_height_effect():
    """Lower brace height → higher effective draw weight → stiffer recommendation."""
    high_brace = recommend_spine(40.0, 28.0, 125.0, 28.0, brace_height_in=9.0)
    low_brace = recommend_spine(40.0, 28.0, 125.0, 28.0, brace_height_in=7.0)
    assert low_brace["effective_draw_weight"] > high_brace["effective_draw_weight"]
    # Stiffer = lower spine number
    assert low_brace["recommended_spine"] <= high_brace["recommended_spine"]


# ---------------------------------------------------------------------------
# check_spine_match
# ---------------------------------------------------------------------------


def test_check_spine_matched():
    """Spine within 10% of recommendation → matched."""
    result = check_spine_match(500.0, 40.0, 28.0, 125.0, 28.0)
    assert result["status"] == "matched"
    assert "effective_draw_weight" in result
    assert result["effective_draw_weight"] > 0


def test_check_spine_too_stiff():
    """Very stiff arrow with low draw weight → too_stiff."""
    result = check_spine_match(300.0, 25.0, 28.0, 125.0, 28.0)
    assert result["status"] in ("slightly_stiff", "too_stiff")


def test_check_spine_too_weak():
    """Very weak arrow with high draw weight → too_weak."""
    result = check_spine_match(800.0, 55.0, 28.0, 125.0, 28.0)
    assert result["status"] in ("slightly_weak", "too_weak")


def test_check_spine_has_message():
    result = check_spine_match(500.0, 40.0, 28.0, 125.0, 28.0)
    assert "message" in result
    assert len(result["message"]) > 0


def test_check_spine_with_frequency_match():
    """When total weight and shaft diameter are provided, frequency analysis is included."""
    result = check_spine_match(
        actual_spine=500.0,
        draw_weight_lbs=40.0,
        draw_length_in=28.0,
        point_weight_gr=125.0,
        arrow_length_in=28.0,
        total_arrow_weight_gr=400.0,
        shaft_diameter_mm=5.5,
    )
    assert result["frequency_match"] is not None
    fm = result["frequency_match"]
    assert fm["match_quality"] in ("excellent", "good", "too_stiff", "too_weak")
    assert fm["arrow_frequency_hz"] > 0
    assert fm["power_stroke_duration_ms"] > 0
    assert fm["oscillations_during_power_stroke"] > 0


def test_check_spine_without_frequency():
    """Without total weight / diameter, frequency_match is None."""
    result = check_spine_match(500.0, 40.0, 28.0, 125.0, 28.0)
    assert result["frequency_match"] is None


# ---------------------------------------------------------------------------
# arrow_natural_frequency
# ---------------------------------------------------------------------------


def test_natural_frequency_typical():
    """A typical arrow should have a natural frequency in the 50-200 Hz range."""
    freq = arrow_natural_frequency(500.0, 5.5, 400.0, 29.0)
    assert 30 < freq < 300


def test_natural_frequency_stiffer_higher():
    """Stiffer shaft (lower spine) → higher frequency."""
    stiff = arrow_natural_frequency(300.0, 5.5, 400.0, 29.0)
    weak = arrow_natural_frequency(700.0, 5.5, 400.0, 29.0)
    assert stiff > weak


def test_natural_frequency_heavier_lower():
    """Heavier arrow → lower frequency."""
    light = arrow_natural_frequency(500.0, 5.5, 300.0, 29.0)
    heavy = arrow_natural_frequency(500.0, 5.5, 500.0, 29.0)
    assert light > heavy


def test_natural_frequency_zero_inputs():
    assert arrow_natural_frequency(0.0, 5.5, 400.0, 29.0) == 0.0
    assert arrow_natural_frequency(500.0, 0.0, 400.0, 29.0) == 0.0
    assert arrow_natural_frequency(500.0, 5.5, 0.0, 29.0) == 0.0
    assert arrow_natural_frequency(500.0, 5.5, 400.0, 0.0) == 0.0


# ---------------------------------------------------------------------------
# spine_frequency_match
# ---------------------------------------------------------------------------


def test_spine_frequency_match_ideal():
    """~1 oscillation during power stroke → excellent."""
    # PS=20"=1.667ft, avg_v=100fps, duration=16.67ms, 65Hz×0.01667s≈1.08 osc
    result = spine_frequency_match(65.0, 28.0, 8.0, 200.0)
    assert result["match_quality"] in ("excellent", "good")
    assert result["oscillations_during_power_stroke"] > 0


def test_spine_frequency_match_too_stiff():
    """Very low frequency → too few oscillations → too stiff."""
    result = spine_frequency_match(20.0, 28.0, 8.0, 200.0)
    assert result["match_quality"] == "too_stiff"


def test_spine_frequency_match_too_weak():
    """Very high frequency → too many oscillations → too weak."""
    result = spine_frequency_match(500.0, 28.0, 8.0, 200.0)
    assert result["match_quality"] == "too_weak"


def test_spine_frequency_match_zero_input():
    result = spine_frequency_match(0.0, 28.0, 8.0, 200.0)
    assert result["match_quality"] == "unknown"
