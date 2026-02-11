"""Round preset definitions and utilities for standard archery round types."""
from dataclasses import dataclass
from typing import Optional


@dataclass
class RoundPreset:
    """Standard archery round configuration."""
    name: str
    arrow_count: int
    ends: int
    arrows_per_end: int
    distance_m: float
    face_size_cm: int
    max_score: int
    scoring_type: str  # "wa", "field", "flint"
    multi_distance: bool = False


# Registry of standard rounds
# Keys match the frontend ROUND_DEFINITIONS names exactly
_ROUND_PRESETS: dict[str, RoundPreset] = {
    # ── Indoor ──
    "WA 18m (Indoor)": RoundPreset(
        name="WA 18m (Indoor)",
        arrow_count=60,
        ends=20,
        arrows_per_end=3,
        distance_m=18.0,
        face_size_cm=40,
        max_score=600,
        scoring_type="wa",
        multi_distance=False,
    ),
    "WA 25m (Indoor)": RoundPreset(
        name="WA 25m (Indoor)",
        arrow_count=60,
        ends=20,
        arrows_per_end=3,
        distance_m=25.0,
        face_size_cm=60,
        max_score=600,
        scoring_type="wa",
        multi_distance=False,
    ),
    "Portsmouth": RoundPreset(
        name="Portsmouth",
        arrow_count=60,
        ends=20,
        arrows_per_end=3,
        distance_m=18.0,
        face_size_cm=60,
        max_score=600,
        scoring_type="wa",
        multi_distance=False,
    ),
    "Bray I": RoundPreset(
        name="Bray I",
        arrow_count=30,
        ends=10,
        arrows_per_end=3,
        distance_m=18.0,
        face_size_cm=40,
        max_score=300,
        scoring_type="wa",
        multi_distance=False,
    ),
    "Bray II": RoundPreset(
        name="Bray II",
        arrow_count=30,
        ends=10,
        arrows_per_end=3,
        distance_m=25.0,
        face_size_cm=60,
        max_score=300,
        scoring_type="wa",
        multi_distance=False,
    ),
    "Lancaster Quali": RoundPreset(
        name="Lancaster Quali",
        arrow_count=60,
        ends=20,
        arrows_per_end=3,
        distance_m=18.0,
        face_size_cm=40,
        max_score=600,
        scoring_type="wa",
        multi_distance=False,
    ),
    "IFAA Flint (Indoor)": RoundPreset(
        name="IFAA Flint (Indoor)",
        arrow_count=56,
        ends=14,
        arrows_per_end=4,
        distance_m=20.0,
        face_size_cm=35,
        max_score=280,
        scoring_type="flint",
        multi_distance=False,
    ),
    # ── Outdoor ──
    "WA 30m": RoundPreset(
        name="WA 30m",
        arrow_count=36,
        ends=6,
        arrows_per_end=6,
        distance_m=30.0,
        face_size_cm=80,
        max_score=360,
        scoring_type="wa",
        multi_distance=False,
    ),
    "WA 40m": RoundPreset(
        name="WA 40m",
        arrow_count=36,
        ends=6,
        arrows_per_end=6,
        distance_m=40.0,
        face_size_cm=80,
        max_score=360,
        scoring_type="wa",
        multi_distance=False,
    ),
    "WA 50m (Barebow)": RoundPreset(
        name="WA 50m (Barebow)",
        arrow_count=72,
        ends=12,
        arrows_per_end=6,
        distance_m=50.0,
        face_size_cm=122,
        max_score=720,
        scoring_type="wa",
        multi_distance=False,
    ),
    "WA 60m": RoundPreset(
        name="WA 60m",
        arrow_count=36,
        ends=6,
        arrows_per_end=6,
        distance_m=60.0,
        face_size_cm=122,
        max_score=360,
        scoring_type="wa",
        multi_distance=False,
    ),
    "WA 70m (Recurve)": RoundPreset(
        name="WA 70m (Recurve)",
        arrow_count=72,
        ends=12,
        arrows_per_end=6,
        distance_m=70.0,
        face_size_cm=122,
        max_score=720,
        scoring_type="wa",
        multi_distance=False,
    ),
    "Half WA 50m": RoundPreset(
        name="Half WA 50m",
        arrow_count=36,
        ends=6,
        arrows_per_end=6,
        distance_m=50.0,
        face_size_cm=122,
        max_score=360,
        scoring_type="wa",
        multi_distance=False,
    ),
    # ── National / Practice ──
    "National (Barebow)": RoundPreset(
        name="National (Barebow)",
        arrow_count=48,
        ends=8,
        arrows_per_end=6,
        distance_m=50.0,
        face_size_cm=122,
        max_score=480,
        scoring_type="wa",
        multi_distance=False,
    ),
    "Short National": RoundPreset(
        name="Short National",
        arrow_count=48,
        ends=8,
        arrows_per_end=6,
        distance_m=40.0,
        face_size_cm=122,
        max_score=480,
        scoring_type="wa",
        multi_distance=False,
    ),
    "Practice (30 arrows)": RoundPreset(
        name="Practice (30 arrows)",
        arrow_count=30,
        ends=10,
        arrows_per_end=3,
        distance_m=18.0,
        face_size_cm=40,
        max_score=300,
        scoring_type="wa",
        multi_distance=False,
    ),
    # ── Legacy aliases (for backward compatibility with old data) ──
    "WA 18m": RoundPreset(
        name="WA 18m",
        arrow_count=60,
        ends=20,
        arrows_per_end=3,
        distance_m=18.0,
        face_size_cm=40,
        max_score=600,
        scoring_type="wa",
        multi_distance=False,
    ),
    "WA 25m": RoundPreset(
        name="WA 25m",
        arrow_count=60,
        ends=20,
        arrows_per_end=3,
        distance_m=25.0,
        face_size_cm=60,
        max_score=600,
        scoring_type="wa",
        multi_distance=False,
    ),
    "WA 50m": RoundPreset(
        name="WA 50m",
        arrow_count=72,
        ends=12,
        arrows_per_end=6,
        distance_m=50.0,
        face_size_cm=122,
        max_score=720,
        scoring_type="wa",
        multi_distance=False,
    ),
    "Indoor Field": RoundPreset(
        name="Indoor Field",
        arrow_count=60,
        ends=20,
        arrows_per_end=3,
        distance_m=18.0,
        face_size_cm=40,
        max_score=300,
        scoring_type="field",
        multi_distance=False,
    ),
    "Flint": RoundPreset(
        name="Flint",
        arrow_count=56,
        ends=14,
        arrows_per_end=4,
        distance_m=0.0,
        face_size_cm=0,
        max_score=280,
        scoring_type="flint",
        multi_distance=True,
    ),
}


def get_round_preset(name: str) -> Optional[RoundPreset]:
    """
    Lookup a round preset by name (case-insensitive).
    
    Args:
        name: The round type name (e.g., "WA 18m", "flint")
    
    Returns:
        RoundPreset if found, None otherwise
    """
    # Case-insensitive lookup
    for key, preset in _ROUND_PRESETS.items():
        if key.lower() == name.lower():
            return preset
    return None


def get_all_presets() -> list[RoundPreset]:
    """
    Get all defined round presets.
    
    Returns:
        List of all RoundPreset instances
    """
    return list(_ROUND_PRESETS.values())


def get_max_score(round_type: str, arrow_count: int) -> int:
    """
    Calculate maximum possible score for a round.
    
    Args:
        round_type: The round type name
        arrow_count: Actual number of arrows shot
    
    Returns:
        Maximum possible score based on round type and arrow count
    """
    preset = get_round_preset(round_type)
    
    if preset:
        # If arrow count matches preset, use preset max
        if arrow_count == preset.arrow_count:
            return preset.max_score
        
        # Otherwise, calculate proportionally
        if preset.scoring_type == "field":
            # Field scoring: max 5 per arrow
            return arrow_count * 5
        elif preset.scoring_type == "wa":
            # WA scoring: max 10 per arrow
            return arrow_count * 10
        elif preset.scoring_type == "flint":
            # Flint scoring: max 5 per arrow
            return arrow_count * 5
    
    # Fallback: assume WA scoring (max 10 per arrow)
    return arrow_count * 10


def get_score_percentage(total_score: int, round_type: str, arrow_count: int) -> float:
    """
    Calculate score as percentage of maximum possible.
    
    Args:
        total_score: Archer's total score
        round_type: The round type name
        arrow_count: Number of arrows shot
    
    Returns:
        Percentage (0.0 to 100.0)
    """
    max_score = get_max_score(round_type, arrow_count)
    if max_score == 0:
        return 0.0
    return (total_score / max_score) * 100.0
