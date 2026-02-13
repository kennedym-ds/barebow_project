"""Round preset endpoints."""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from src.rounds import RoundPreset, get_all_presets, get_round_preset

router = APIRouter()


class RoundPresetResponse(BaseModel):
    """Response schema for round preset."""

    name: str
    arrow_count: int
    ends: int
    arrows_per_end: int
    distance_m: float
    face_size_cm: int
    max_score: int
    scoring_type: str
    multi_distance: bool


def _preset_to_response(preset: RoundPreset) -> RoundPresetResponse:
    """Convert domain RoundPreset to API response schema."""
    return RoundPresetResponse(
        name=preset.name,
        arrow_count=preset.arrow_count,
        ends=preset.ends,
        arrows_per_end=preset.arrows_per_end,
        distance_m=preset.distance_m,
        face_size_cm=preset.face_size_cm,
        max_score=preset.max_score,
        scoring_type=preset.scoring_type,
        multi_distance=preset.multi_distance,
    )


@router.get("/presets", response_model=list[RoundPresetResponse])
def list_round_presets():
    """
    Get all available round presets.

    Returns all standard round configurations with arrow counts,
    distances, target face sizes, and maximum scores.
    """
    presets = get_all_presets()
    return [_preset_to_response(p) for p in presets]


@router.get("/presets/{name}", response_model=RoundPresetResponse)
def get_round_preset_by_name(name: str):
    """
    Get a specific round preset by name.

    Args:
        name: Round type name (case-insensitive), e.g., "WA 18m", "Flint"

    Returns:
        Round preset details

    Raises:
        404: Round preset not found
    """
    preset = get_round_preset(name)
    if not preset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Round preset '{name}' not found")
    return _preset_to_response(preset)
