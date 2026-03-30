/**
 * Session, End, and Shot repository — CRUD with nested relationships.
 *
 * Sessions contain Ends which contain Shots. All cascade deletes are
 * handled by SQLite foreign keys (ON DELETE CASCADE).
 */

import type {
  Session,
  SessionCreate,
  End,
  EndCreate,
  Shot,
  ShotData,
  SessionSummary,
} from "../../types/models";
import { getDatabase, generateUUID, scheduleSave, runParams } from "../database";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rowToShot(row: Record<string, unknown>): Shot {
  return {
    id: row.id as string,
    end_id: row.end_id as string,
    score: row.score as number,
    is_x: Boolean(row.is_x),
    x: row.x as number,
    y: row.y as number,
    arrow_number: (row.arrow_number as number) ?? null,
  };
}

function getShotsForEnd(endId: string): Shot[] {
  const db = getDatabase();
  const stmt = db.prepare(
    "SELECT * FROM shot WHERE end_id = ? ORDER BY shot_sequence, arrow_number"
  );
  stmt.bind([endId]);
  const shots: Shot[] = [];
  while (stmt.step()) {
    shots.push(rowToShot(stmt.getAsObject()));
  }
  stmt.free();
  return shots;
}

function getEndsForSession(sessionId: string): End[] {
  const db = getDatabase();
  const stmt = db.prepare(
    'SELECT * FROM "end" WHERE session_id = ? ORDER BY end_number'
  );
  stmt.bind([sessionId]);
  const ends: End[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    ends.push({
      id: row.id as string,
      session_id: row.session_id as string,
      end_number: row.end_number as number,
      shots: getShotsForEnd(row.id as string),
    });
  }
  stmt.free();
  return ends;
}

function getBowSummary(bowId: string | null): Session["bow"] {
  if (!bowId) return null;
  const db = getDatabase();
  const stmt = db.prepare("SELECT id, name FROM bowsetup WHERE id = ?");
  stmt.bind([bowId]);
  let result: Session["bow"] = null;
  if (stmt.step()) {
    const row = stmt.getAsObject();
    result = { id: row.id as string, name: row.name as string };
  }
  stmt.free();
  return result;
}

function getArrowSummary(arrowId: string | null): Session["arrow"] {
  if (!arrowId) return null;
  const db = getDatabase();
  const stmt = db.prepare(
    "SELECT id, make, model, spine FROM arrowsetup WHERE id = ?"
  );
  stmt.bind([arrowId]);
  let result: Session["arrow"] = null;
  if (stmt.step()) {
    const row = stmt.getAsObject();
    result = {
      id: row.id as string,
      make: row.make as string,
      model: row.model as string,
      spine: row.spine as number,
    };
  }
  stmt.free();
  return result;
}

// ---------------------------------------------------------------------------
// Session Repo
// ---------------------------------------------------------------------------

export const sessionRepo = {
  list(): SessionSummary[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        s.id, s.date, s.round_type, s.distance_m, s.target_face_size_cm,
        COALESCE(agg.total_score, 0) as total_score,
        COALESCE(agg.shot_count, 0) as shot_count,
        CASE WHEN agg.shot_count > 0 THEN CAST(agg.total_score AS FLOAT) / agg.shot_count ELSE 0 END as avg_score,
        b.name as bow_name,
        CASE WHEN a.id IS NOT NULL THEN a.make || ' ' || a.model ELSE NULL END as arrow_name
      FROM session s
      LEFT JOIN bowsetup b ON s.bow_id = b.id
      LEFT JOIN arrowsetup a ON s.arrow_id = a.id
      LEFT JOIN (
        SELECT e.session_id,
               SUM(sh.score) as total_score,
               COUNT(sh.id) as shot_count
        FROM "end" e
        JOIN shot sh ON sh.end_id = e.id
        GROUP BY e.session_id
      ) agg ON agg.session_id = s.id
      ORDER BY s.date DESC
    `);
    const results: SessionSummary[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as SessionSummary);
    }
    stmt.free();
    return results;
  },

  getById(id: string): Session | null {
    const db = getDatabase();
    const stmt = db.prepare("SELECT * FROM session WHERE id = ?");
    stmt.bind([id]);
    let result: Session | null = null;
    if (stmt.step()) {
      const row = stmt.getAsObject();
      result = {
        id: row.id as string,
        date: row.date as string,
        bow_id: (row.bow_id as string) ?? null,
        arrow_id: (row.arrow_id as string) ?? null,
        round_type: row.round_type as string,
        target_face_size_cm: row.target_face_size_cm as number,
        distance_m: row.distance_m as number,
        notes: (row.notes as string) ?? "",
        ends: getEndsForSession(row.id as string),
        bow: getBowSummary((row.bow_id as string) ?? null),
        arrow: getArrowSummary((row.arrow_id as string) ?? null),
      };
    }
    stmt.free();
    return result;
  },

  create(data: SessionCreate): Session {
    const id = generateUUID();
    const now = new Date().toISOString();
    runParams(
      `INSERT INTO session (id, date, bow_id, arrow_id, round_type, target_face_size_cm, distance_m, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, now, data.bow_id ?? null, data.arrow_id ?? null, data.round_type, data.target_face_size_cm, data.distance_m, data.notes ?? ""]
    );
    scheduleSave();
    return this.getById(id)!;
  },

  delete(id: string): boolean {
    const db = getDatabase();
    runParams("DELETE FROM session WHERE id = ?", [id]);
    scheduleSave();
    return db.getRowsModified() > 0;
  },

  addEnd(sessionId: string, data: EndCreate): End {
    const db = getDatabase();
    const endId = generateUUID();
    db.run("BEGIN TRANSACTION");
    try {
      runParams(
        'INSERT INTO "end" (id, session_id, end_number) VALUES (?, ?, ?)',
        [endId, sessionId, data.end_number]
      );

      for (let i = 0; i < data.shots.length; i++) {
        const shot = data.shots[i];
        const shotId = generateUUID();
        runParams(
          `INSERT INTO shot (id, end_id, score, is_x, x, y, arrow_number, shot_sequence)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [shotId, endId, shot.score, shot.is_x ? 1 : 0, shot.x, shot.y, shot.arrow_number ?? null, i]
        );
      }

      db.run("COMMIT");
    } catch (e) {
      db.run("ROLLBACK");
      throw e;
    }

    scheduleSave();
    return {
      id: endId,
      session_id: sessionId,
      end_number: data.end_number,
      shots: getShotsForEnd(endId),
    };
  },

  deleteEnd(endId: string): boolean {
    const db = getDatabase();
    runParams('DELETE FROM "end" WHERE id = ?', [endId]);
    scheduleSave();
    return db.getRowsModified() > 0;
  },

  addShot(endId: string, data: ShotData): Shot {
    const db = getDatabase();
    const id = generateUUID();
    // Get next shot_sequence for this end
    const seqStmt = db.prepare(
      "SELECT COALESCE(MAX(shot_sequence), -1) + 1 as next_seq FROM shot WHERE end_id = ?"
    );
    seqStmt.bind([endId]);
    let nextSeq = 0;
    if (seqStmt.step()) {
      nextSeq = (seqStmt.getAsObject().next_seq as number) ?? 0;
    }
    seqStmt.free();

    runParams(
      `INSERT INTO shot (id, end_id, score, is_x, x, y, arrow_number, shot_sequence)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, endId, data.score, data.is_x ? 1 : 0, data.x, data.y, data.arrow_number ?? null, nextSeq]
    );
    scheduleSave();
    return {
      id,
      end_id: endId,
      score: data.score,
      is_x: data.is_x,
      x: data.x,
      y: data.y,
      arrow_number: data.arrow_number ?? null,
    };
  },

  /**
   * Get all shots for a session (flat list, for analytics).
   */
  getAllShots(sessionId: string): (Shot & { end_number: number })[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT sh.*, e.end_number
      FROM shot sh
      JOIN "end" e ON sh.end_id = e.id
      WHERE e.session_id = ?
      ORDER BY e.end_number, sh.shot_sequence, sh.arrow_number
    `);
    stmt.bind([sessionId]);
    const results: (Shot & { end_number: number })[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push({
        ...rowToShot(row),
        end_number: row.end_number as number,
      });
    }
    stmt.free();
    return results;
  },
};
