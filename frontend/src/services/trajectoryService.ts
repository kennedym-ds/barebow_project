/**
 * Trajectory service — mirrors api/routers/trajectory.py.
 * Pure computation, no database access.
 */

import type {
  TrajectoryRequest,
  TrajectoryResponse,
  DriftRequest,
  DriftResponse,
} from "../types/models";
import { predictTrajectory, estimateCrosswindDrift } from "../domain/trajectory";

export const trajectoryService = {
  predict(request: TrajectoryRequest): TrajectoryResponse {
    const result = predictTrajectory(
      request.launch_velocity_fps,
      request.target_distance_m,
      request.arrow_mass_gr,
      request.shaft_diameter_mm,
      request.arrow_length_in,
      request.target_elevation_deg ?? 0,
      request.drag_coefficient ?? 0.47
    );
    return result;
  },

  estimateDrift(request: DriftRequest): DriftResponse {
    const result = estimateCrosswindDrift(
      request.launch_velocity_fps,
      request.arrow_mass_gr,
      request.shaft_diameter_mm,
      request.arrow_length_in,
      request.target_distance_m,
      request.crosswind_speed_mps,
      request.drag_coefficient ?? 0.47
    );
    return result;
  },
};
