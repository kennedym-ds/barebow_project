/**
 * TabSetup repository — CRUD operations for tab equipment.
 */

import type { TabSetup, TabSetupCreate, TabSetupUpdate } from "../../types/models";
import { getDatabase, generateUUID, scheduleSave, runParams } from "../database";

export const tabRepo = {
  list(): TabSetup[] {
    const db = getDatabase();
    const stmt = db.prepare("SELECT * FROM tabsetup ORDER BY name");
    const results: TabSetup[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as TabSetup);
    }
    stmt.free();
    return results;
  },

  getById(id: string): TabSetup | null {
    const db = getDatabase();
    const stmt = db.prepare("SELECT * FROM tabsetup WHERE id = ?");
    stmt.bind([id]);
    let result: TabSetup | null = null;
    if (stmt.step()) {
      result = stmt.getAsObject() as unknown as TabSetup;
    }
    stmt.free();
    return result;
  },

  create(data: TabSetupCreate): TabSetup {
    const id = generateUUID();
    runParams(
      `INSERT INTO tabsetup (id, name, make, model, marks)
       VALUES (?, ?, ?, ?, ?)`,
      [id, data.name, data.make ?? "Zniper", data.model ?? "Barebow Tab", data.marks ?? ""]
    );
    scheduleSave();
    return this.getById(id)!;
  },

  update(id: string, data: TabSetupUpdate): TabSetup | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const fields = Object.entries(data).filter(([, v]) => v !== undefined);
    if (fields.length === 0) return existing;

    const setClauses = fields.map(([k]) => `${k} = ?`).join(", ");
    const params: unknown[] = fields.map(([, v]) => v);
    params.push(id);

    runParams(`UPDATE tabsetup SET ${setClauses} WHERE id = ?`, params);
    scheduleSave();
    return this.getById(id);
  },

  delete(id: string): boolean {
    const db = getDatabase();
    runParams("DELETE FROM tabsetup WHERE id = ?", [id]);
    scheduleSave();
    return db.getRowsModified() > 0;
  },
};
