/**
 * Round service — mirrors api/routers/rounds.py.
 * Thin wrapper over domain/rounds.ts constants.
 */

import { getAllPresets, getRoundPreset, type RoundPreset } from "../domain/rounds";

export const roundService = {
  listPresets(): RoundPreset[] {
    return getAllPresets();
  },

  getPreset(name: string): RoundPreset | null {
    return getRoundPreset(name);
  },
};
