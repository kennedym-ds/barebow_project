/**
 * Session service — mirrors api/routers/sessions.py.
 * CRUD for sessions, ends, and shots with FK validation.
 */

import type {
  Session,
  SessionCreate,
  SessionSummary,
  End,
  EndCreate,
} from "../types/models";
import { sessionRepo, bowRepo, arrowRepo } from "../db";

export const sessionService = {
  list(bowId?: string, arrowId?: string): SessionSummary[] {
    const all = sessionRepo.list();
    if (!bowId && !arrowId) return all;

    // Client-side filtering (sessionRepo.list() returns all summaries)
    return all.filter((s) => {
      // We need to check the raw session for bow_id / arrow_id
      const session = sessionRepo.getById(s.id);
      if (!session) return false;
      if (bowId && session.bow_id !== bowId) return false;
      if (arrowId && session.arrow_id !== arrowId) return false;
      return true;
    });
  },

  getById(id: string): Session | null {
    return sessionRepo.getById(id);
  },

  create(data: SessionCreate): Session {
    // Validate FK references
    if (data.bow_id) {
      const bow = bowRepo.getById(data.bow_id);
      if (!bow) throw new Error("Referenced bow setup not found");
    }
    if (data.arrow_id) {
      const arrow = arrowRepo.getById(data.arrow_id);
      if (!arrow) throw new Error("Referenced arrow setup not found");
    }

    // Validate fields
    if (data.target_face_size_cm <= 0) {
      throw new Error("target_face_size_cm must be > 0");
    }
    if (data.distance_m <= 0) {
      throw new Error("distance_m must be > 0");
    }

    return sessionRepo.create(data);
  },

  delete(id: string): boolean {
    return sessionRepo.delete(id);
  },

  saveEnd(sessionId: string, data: EndCreate): End {
    const session = sessionRepo.getById(sessionId);
    if (!session) throw new Error("Session not found");

    // Validate shots
    for (const shot of data.shots) {
      if (shot.score < 0 || shot.score > 11) {
        throw new Error("Shot score must be between 0 and 11");
      }
      if (Math.abs(shot.x) > 500 || Math.abs(shot.y) > 500) {
        throw new Error("Shot coordinates must be within ±500");
      }
    }

    return sessionRepo.addEnd(sessionId, data);
  },
};
