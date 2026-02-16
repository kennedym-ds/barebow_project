"""Trajectory prediction and crosswind drift endpoints."""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from src.trajectory import estimate_crosswind_drift, predict_trajectory

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------


class TrajectoryPoint(BaseModel):
    t: float
    x_m: float
    y_m: float
    v_mps: float


class TrajectoryRequest(BaseModel):
    launch_velocity_fps: float = Field(gt=0)
    target_distance_m: float = Field(gt=0)
    arrow_mass_gr: float = Field(gt=0)
    shaft_diameter_mm: float = Field(gt=0)
    arrow_length_in: float = Field(gt=0)
    target_elevation_deg: float = Field(ge=-45, le=45, default=0.0)
    drag_coefficient: float = Field(gt=0, le=2.0, default=0.30)


class TrajectoryResponse(BaseModel):
    launch_angle_deg: float
    target_elevation_deg: float
    trajectory: list[TrajectoryPoint]
    max_height_m: float
    range_m: float
    time_of_flight_s: float
    impact_velocity_mps: float
    impact_angle_deg: float
    drop_at_distances: dict[int, float]


class DriftRequest(BaseModel):
    launch_velocity_fps: float = Field(gt=0)
    arrow_mass_gr: float = Field(gt=0)
    shaft_diameter_mm: float = Field(gt=0)
    arrow_length_in: float = Field(gt=0)
    target_distance_m: float = Field(gt=0)
    crosswind_speed_mps: float
    drag_coefficient: float = Field(gt=0, le=2.0, default=0.30)


class DriftResponse(BaseModel):
    drift_cm: float
    drift_rings: float
    time_of_flight_s: float
    advice: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/predict", response_model=TrajectoryResponse)
def trajectory_predict(request: TrajectoryRequest):
    """Solve for the minimum-flight-time launch angle to hit the target."""
    result = predict_trajectory(
        launch_velocity_fps=request.launch_velocity_fps,
        target_distance_m=request.target_distance_m,
        arrow_mass_gr=request.arrow_mass_gr,
        shaft_diameter_mm=request.shaft_diameter_mm,
        arrow_length_in=request.arrow_length_in,
        target_elevation_deg=request.target_elevation_deg,
        drag_coefficient=request.drag_coefficient,
    )
    return TrajectoryResponse(**result)


@router.post("/drift", response_model=DriftResponse)
def trajectory_drift(request: DriftRequest):
    """Estimate lateral drift from crosswind at target distance."""
    result = estimate_crosswind_drift(
        launch_velocity_fps=request.launch_velocity_fps,
        arrow_mass_gr=request.arrow_mass_gr,
        shaft_diameter_mm=request.shaft_diameter_mm,
        arrow_length_in=request.arrow_length_in,
        target_distance_m=request.target_distance_m,
        crosswind_speed_mps=request.crosswind_speed_mps,
        drag_coefficient=request.drag_coefficient,
    )
    return DriftResponse(**result)
