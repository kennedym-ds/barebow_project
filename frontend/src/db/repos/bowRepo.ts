/**
 * BowSetup repository — CRUD operations for bow equipment.
 */

import type { BowSetup, BowSetupCreate, BowSetupUpdate } from "../../types/models";
import { getDatabase, generateUUID, scheduleSave, runParams } from "../database";

export const bowRepo = {
  list(): BowSetup[] {
    const db = getDatabase();
    const stmt = db.prepare("SELECT * FROM bowsetup ORDER BY name");
    const results: BowSetup[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as BowSetup);
    }
    stmt.free();
    return results;
  },

  getById(id: string): BowSetup | null {
    const db = getDatabase();
    const stmt = db.prepare("SELECT * FROM bowsetup WHERE id = ?");
    stmt.bind([id]);
    let result: BowSetup | null = null;
    if (stmt.step()) {
      result = stmt.getAsObject() as unknown as BowSetup;
    }
    stmt.free();
    return result;
  },

  create(data: BowSetupCreate): BowSetup {
    const id = generateUUID();
    runParams(
      `INSERT INTO bowsetup (
        id, name, riser_make, riser_model, riser_length_in,
        limbs_make, limbs_model, limbs_length, limbs_marked_poundage,
        draw_weight_otf, draw_length_in, brace_height_in,
        tiller_top_mm, tiller_bottom_mm, tiller_type,
        plunger_spring_tension, plunger_center_shot_mm,
        nocking_point_height_mm, riser_weights, limb_alignment,
        total_mass_g, string_material, strand_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, data.name, data.riser_make, data.riser_model, data.riser_length_in,
        data.limbs_make, data.limbs_model, data.limbs_length, data.limbs_marked_poundage,
        data.draw_weight_otf, data.draw_length_in ?? null, data.brace_height_in,
        data.tiller_top_mm, data.tiller_bottom_mm, data.tiller_type,
        data.plunger_spring_tension, data.plunger_center_shot_mm,
        data.nocking_point_height_mm, data.riser_weights ?? "", data.limb_alignment ?? "Straight",
        data.total_mass_g ?? 0, data.string_material ?? "", data.strand_count ?? 16,
      ]
    );
    scheduleSave();
    return this.getById(id)!;
  },

  update(id: string, data: BowSetupUpdate): BowSetup | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const fields = Object.entries(data).filter(([, v]) => v !== undefined);
    if (fields.length === 0) return existing;

    const setClauses = fields.map(([k]) => `${k} = ?`).join(", ");
    const params: unknown[] = fields.map(([, v]) => v);
    params.push(id);

    runParams(`UPDATE bowsetup SET ${setClauses} WHERE id = ?`, params);
    scheduleSave();
    return this.getById(id);
  },

  delete(id: string): boolean {
    const db = getDatabase();
    runParams("DELETE FROM bowsetup WHERE id = ?", [id]);
    scheduleSave();
    return db.getRowsModified() > 0;
  },
};
