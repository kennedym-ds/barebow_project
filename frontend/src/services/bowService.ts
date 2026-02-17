/**
 * Bow service — mirrors api/routers/bows.py.
 * Bridges bowRepo CRUD with name auto-generation logic.
 */

import type { BowSetup, BowSetupCreate, BowSetupUpdate } from "../types/models";
import { bowRepo } from "../db";

function generateBowName(data: {
  riser_make?: string;
  riser_model?: string;
  limbs_make?: string;
  limbs_model?: string;
}): string {
  const riser = [data.riser_make, data.riser_model].filter(Boolean).join(" ");
  const limbs = [data.limbs_make, data.limbs_model].filter(Boolean).join(" ");
  if (riser && limbs) return `${riser} / ${limbs}`;
  return riser || limbs || "Unnamed Bow";
}

export const bowService = {
  list(): BowSetup[] {
    return bowRepo.list();
  },

  getById(id: string): BowSetup | null {
    return bowRepo.getById(id);
  },

  create(data: BowSetupCreate): BowSetup {
    const name = generateBowName(data);
    return bowRepo.create({ ...data, name });
  },

  update(id: string, data: BowSetupUpdate): BowSetup | null {
    // If any make/model fields changed, regenerate name
    const nameFields = ["riser_make", "riser_model", "limbs_make", "limbs_model"] as const;
    const hasNameChange = nameFields.some((f) => data[f] !== undefined);

    if (hasNameChange) {
      const existing = bowRepo.getById(id);
      if (!existing) return null;
      const merged = {
        riser_make: data.riser_make ?? existing.riser_make,
        riser_model: data.riser_model ?? existing.riser_model,
        limbs_make: data.limbs_make ?? existing.limbs_make,
        limbs_model: data.limbs_model ?? existing.limbs_model,
      };
      return bowRepo.update(id, { ...data, name: generateBowName(merged) });
    }

    return bowRepo.update(id, data);
  },

  delete(id: string): boolean {
    return bowRepo.delete(id);
  },
};
