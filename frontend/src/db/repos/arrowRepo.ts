/**
 * ArrowSetup + ArrowShaft repository — CRUD operations for arrow equipment.
 */

import type {
  ArrowSetup,
  ArrowSetupCreate,
  ArrowSetupUpdate,
  ArrowShaft,
} from "../../types/models";
import { getDatabase, generateUUID, scheduleSave, runParams } from "../database";

// ---------------------------------------------------------------------------
// ArrowSetup
// ---------------------------------------------------------------------------

export const arrowRepo = {
  list(): ArrowSetup[] {
    const db = getDatabase();
    const stmt = db.prepare("SELECT * FROM arrowsetup ORDER BY make, model");
    const results: ArrowSetup[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as ArrowSetup);
    }
    stmt.free();
    return results;
  },

  getById(id: string): ArrowSetup | null {
    const db = getDatabase();
    const stmt = db.prepare("SELECT * FROM arrowsetup WHERE id = ?");
    stmt.bind([id]);
    let result: ArrowSetup | null = null;
    if (stmt.step()) {
      result = stmt.getAsObject() as unknown as ArrowSetup;
    }
    stmt.free();
    return result;
  },

  create(data: ArrowSetupCreate): ArrowSetup {
    const id = generateUUID();
    runParams(
      `INSERT INTO arrowsetup (
        id, make, model, spine, length_in, point_weight_gr,
        total_arrow_weight_gr, shaft_diameter_mm,
        fletching_type, nock_type, arrow_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, data.make, data.model, data.spine, data.length_in, data.point_weight_gr,
        data.total_arrow_weight_gr ?? null, data.shaft_diameter_mm ?? null,
        data.fletching_type, data.nock_type, data.arrow_count ?? 12,
      ]
    );
    scheduleSave();
    return this.getById(id)!;
  },

  update(id: string, data: ArrowSetupUpdate): ArrowSetup | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const ALLOWED_COLS = new Set([
      "make", "model", "spine", "length_in", "point_weight_gr",
      "total_arrow_weight_gr", "shaft_diameter_mm",
      "fletching_type", "nock_type", "arrow_count",
    ]);

    const fields = Object.entries(data).filter(([k, v]) => v !== undefined && ALLOWED_COLS.has(k));
    if (fields.length === 0) return existing;

    const setClauses = fields.map(([k]) => `${k} = ?`).join(", ");
    const params: unknown[] = fields.map(([, v]) => v);
    params.push(id);

    runParams(`UPDATE arrowsetup SET ${setClauses} WHERE id = ?`, params);
    scheduleSave();
    return this.getById(id);
  },

  delete(id: string): boolean {
    const db = getDatabase();
    runParams("DELETE FROM arrowsetup WHERE id = ?", [id]);
    scheduleSave();
    return db.getRowsModified() > 0;
  },
};

// ---------------------------------------------------------------------------
// ArrowShaft
// ---------------------------------------------------------------------------

export const shaftRepo = {
  listByArrowSetup(arrowSetupId: string): ArrowShaft[] {
    const db = getDatabase();
    const stmt = db.prepare(
      "SELECT * FROM arrowshaft WHERE arrow_setup_id = ? ORDER BY arrow_number"
    );
    stmt.bind([arrowSetupId]);
    const results: ArrowShaft[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as ArrowShaft);
    }
    stmt.free();
    return results;
  },

  getById(id: string): ArrowShaft | null {
    const db = getDatabase();
    const stmt = db.prepare("SELECT * FROM arrowshaft WHERE id = ?");
    stmt.bind([id]);
    let result: ArrowShaft | null = null;
    if (stmt.step()) {
      result = stmt.getAsObject() as unknown as ArrowShaft;
    }
    stmt.free();
    return result;
  },

  create(data: Omit<ArrowShaft, "id">): ArrowShaft {
    const id = generateUUID();
    runParams(
      `INSERT INTO arrowshaft (
        id, arrow_setup_id, arrow_number,
        measured_weight_gr, measured_spine_astm, straightness
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id, data.arrow_setup_id, data.arrow_number,
        data.measured_weight_gr ?? null, data.measured_spine_astm ?? null, data.straightness ?? null,
      ]
    );
    scheduleSave();
    return this.getById(id)!;
  },

  bulkCreate(arrowSetupId: string, shafts: Omit<ArrowShaft, "id" | "arrow_setup_id">[]): ArrowShaft[] {
    const db = getDatabase();
    const results: ArrowShaft[] = [];
    db.run("BEGIN TRANSACTION");
    try {
      for (const shaft of shafts) {
        const id = generateUUID();
        runParams(
          `INSERT INTO arrowshaft (
            id, arrow_setup_id, arrow_number,
            measured_weight_gr, measured_spine_astm, straightness
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            id, arrowSetupId, shaft.arrow_number,
            shaft.measured_weight_gr ?? null, shaft.measured_spine_astm ?? null, shaft.straightness ?? null,
          ]
        );
        results.push(this.getById(id)!);
      }
      db.run("COMMIT");
    } catch (e) {
      db.run("ROLLBACK");
      throw e;
    }
    scheduleSave();
    return results;
  },

  deleteByArrowSetup(arrowSetupId: string): number {
    const db = getDatabase();
    runParams("DELETE FROM arrowshaft WHERE arrow_setup_id = ?", [arrowSetupId]);
    scheduleSave();
    return db.getRowsModified();
  },

  delete(id: string): boolean {
    const db = getDatabase();
    runParams("DELETE FROM arrowshaft WHERE id = ?", [id]);
    scheduleSave();
    return db.getRowsModified() > 0;
  },
};
