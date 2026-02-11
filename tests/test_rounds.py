"""Tests for round presets module."""
import pytest
from src.rounds import (
    get_round_preset,
    get_all_presets,
    get_max_score,
    get_score_percentage,
    RoundPreset,
)


def test_get_all_presets():
    """Test getting all round presets."""
    presets = get_all_presets()
    assert len(presets) == 21
    
    names = [p.name for p in presets]
    # Check primary frontend names
    assert "WA 18m (Indoor)" in names
    assert "WA 25m (Indoor)" in names
    assert "WA 50m (Barebow)" in names
    assert "Half WA 50m" in names
    assert "IFAA Flint (Indoor)" in names
    # Check legacy aliases
    assert "WA 18m" in names
    assert "WA 50m" in names
    assert "Indoor Field" in names
    assert "Flint" in names


def test_get_round_preset_exact_match():
    """Test getting a round preset by exact name."""
    preset = get_round_preset("WA 18m")
    assert preset is not None
    assert preset.name == "WA 18m"
    assert preset.arrow_count == 60
    assert preset.ends == 20
    assert preset.arrows_per_end == 3
    assert preset.distance_m == 18.0
    assert preset.face_size_cm == 40
    assert preset.max_score == 600
    assert preset.scoring_type == "wa"
    assert preset.multi_distance is False


def test_get_round_preset_case_insensitive():
    """Test case-insensitive round preset lookup."""
    preset = get_round_preset("wa 18m")
    assert preset is not None
    assert preset.name == "WA 18m"
    
    preset = get_round_preset("FLINT")
    assert preset is not None
    assert preset.name == "Flint"
    
    preset = get_round_preset("indoor field")
    assert preset is not None
    assert preset.name == "Indoor Field"


def test_get_round_preset_not_found():
    """Test getting a non-existent round preset."""
    preset = get_round_preset("Non-existent Round")
    assert preset is None


def test_flint_preset_multi_distance():
    """Test Flint round has multi_distance flag."""
    preset = get_round_preset("Flint")
    assert preset is not None
    assert preset.multi_distance is True
    assert preset.distance_m == 0.0  # Variable
    assert preset.face_size_cm == 0  # Variable


def test_indoor_field_scoring():
    """Test Indoor Field uses field scoring (max 5 per arrow)."""
    preset = get_round_preset("Indoor Field")
    assert preset is not None
    assert preset.scoring_type == "field"
    assert preset.max_score == 300  # 60 arrows × 5


def test_wa_50m_preset():
    """Test WA 50m preset details."""
    preset = get_round_preset("WA 50m")
    assert preset is not None
    assert preset.arrow_count == 72
    assert preset.ends == 12
    assert preset.arrows_per_end == 6
    assert preset.max_score == 720


def test_half_wa_50m_preset():
    """Test Half WA 50m preset."""
    preset = get_round_preset("Half WA 50m")
    assert preset is not None
    assert preset.arrow_count == 36
    assert preset.ends == 6
    assert preset.arrows_per_end == 6
    assert preset.max_score == 360


def test_get_max_score_with_preset_arrow_count():
    """Test max score calculation when arrow count matches preset."""
    # WA 18m with 60 arrows
    max_score = get_max_score("WA 18m", 60)
    assert max_score == 600
    
    # Indoor Field with 60 arrows
    max_score = get_max_score("Indoor Field", 60)
    assert max_score == 300


def test_get_max_score_with_custom_arrow_count():
    """Test max score calculation with custom arrow counts."""
    # WA scoring: 10 per arrow
    max_score = get_max_score("WA 18m", 30)
    assert max_score == 300  # 30 × 10
    
    # Field scoring: 5 per arrow
    max_score = get_max_score("Indoor Field", 30)
    assert max_score == 150  # 30 × 5
    
    # Flint scoring: 5 per arrow
    max_score = get_max_score("Flint", 28)
    assert max_score == 140  # 28 × 5


def test_get_max_score_unknown_round():
    """Test max score fallback for unknown round types."""
    # Should use WA scoring (10 per arrow) as fallback
    max_score = get_max_score("Unknown Round", 36)
    assert max_score == 360


def test_get_score_percentage():
    """Test score percentage calculation."""
    # Perfect score
    pct = get_score_percentage(600, "WA 18m", 60)
    assert pct == 100.0
    
    # Half score
    pct = get_score_percentage(300, "WA 18m", 60)
    assert pct == 50.0
    
    # Field scoring
    pct = get_score_percentage(150, "Indoor Field", 60)
    assert pct == 50.0
    
    # Zero score
    pct = get_score_percentage(0, "WA 18m", 60)
    assert pct == 0.0


def test_get_score_percentage_custom_arrow_count():
    """Test score percentage with custom arrow counts."""
    # 30 arrows, 270 score out of 300 max = 90%
    pct = get_score_percentage(270, "WA 18m", 30)
    assert pct == 90.0
    
    # 20 arrows field scoring, 80 score out of 100 max = 80%
    pct = get_score_percentage(80, "Indoor Field", 20)
    assert pct == 80.0


def test_preset_data_consistency():
    """Test that preset data is internally consistent."""
    for preset in get_all_presets():
        # Arrow count should equal ends × arrows_per_end
        assert preset.arrow_count == preset.ends * preset.arrows_per_end, \
            f"{preset.name}: arrow count mismatch"
        
        # Multi-distance rounds should have distance_m = 0
        if preset.multi_distance:
            assert preset.distance_m == 0.0, \
                f"{preset.name}: multi_distance rounds should have distance_m = 0"
        
        # Non-multi-distance rounds should have a positive distance
        if not preset.multi_distance:
            assert preset.distance_m > 0, \
                f"{preset.name}: single distance rounds should have distance_m > 0"


def test_all_round_types_have_valid_scoring():
    """Test that all rounds have valid scoring types."""
    valid_scoring_types = {"wa", "field", "flint"}
    for preset in get_all_presets():
        assert preset.scoring_type in valid_scoring_types, \
            f"{preset.name}: invalid scoring_type '{preset.scoring_type}'"
