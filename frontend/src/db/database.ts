/**
 * BareTrack Database — sql.js (WASM SQLite) initialization and persistence.
 *
 * Provides a singleton database instance that:
 * - Creates tables on first launch
 * - Loads existing .db file on subsequent launches (via Tauri FS)
 * - Auto-saves to disk on mutation (debounced)
 */

import initSqlJs, { type Database as SqlJsDatabase, type BindParams } from "sql.js";

// Schema SQL — imported as string at build time via Vite's ?raw suffix
import schemaSql from "./schema.sql?raw";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Database = SqlJsDatabase;

export interface DatabaseConfig {
  /** Load existing database bytes (e.g., from Tauri FS read). */
  existingData?: ArrayLike<number>;
  /** Called after each mutation to persist the database. */
  onSave?: (data: Uint8Array) => void | Promise<void>;
  /** Debounce interval for auto-save in ms (default: 1000). */
  saveDebounceMs?: number;
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let _db: SqlJsDatabase | null = null;
let _saveTimer: ReturnType<typeof setTimeout> | null = null;
let _onSave: DatabaseConfig["onSave"] | undefined;
let _saveDebounceMs = 1000;

/**
 * Generate a v4-style UUID string.
 */
export function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Initialize the database. Call once at app startup.
 *
 * @returns The sql.js Database instance.
 */
export async function initDatabase(config: DatabaseConfig = {}): Promise<SqlJsDatabase> {
  if (_db) return _db;

  // Fetch WASM binary explicitly — more reliable than locateFile across
  // desktop, Android Tauri, and browser environments.
  const wasmUrl = new URL("/sql-wasm.wasm", window.location.href).href;
  const wasmResponse = await fetch(wasmUrl);
  if (!wasmResponse.ok) {
    throw new Error(`Failed to fetch sql-wasm.wasm: ${wasmResponse.status} ${wasmResponse.statusText} from ${wasmUrl}`);
  }
  const wasmBinary = await wasmResponse.arrayBuffer();

  const SQL = await initSqlJs({ wasmBinary });

  let db: SqlJsDatabase;
  if (config.existingData) {
    db = new SQL.Database(new Uint8Array(config.existingData));
  } else {
    db = new SQL.Database();
  }

  try {
    // Enable foreign keys (SQLite has them off by default)
    db.run("PRAGMA foreign_keys = ON;");

    // Create tables if they don't exist (idempotent)
    db.run(schemaSql);

    // Run migrations
    const versionResult = db.exec("PRAGMA user_version;");
    let currentVersion = 0;
    if (versionResult.length > 0 && versionResult[0].values.length > 0) {
      currentVersion = versionResult[0].values[0][0] as number;
    }

    if (currentVersion === 0) {
      // Initial schema setup
      db.run("PRAGMA user_version = 1;");
      currentVersion = 1;
    }

    // Future migrations can be added here
    // if (currentVersion < 2) {
    //   db.run("ALTER TABLE ...");
    //   db.run("PRAGMA user_version = 2;");
    //   currentVersion = 2;
    // }
  } catch (err) {
    // If schema setup fails, close the DB so the singleton guard
    // doesn't return a broken instance on the next call.
    db.close();
    throw err;
  }

  // Only assign to singleton AFTER everything succeeds
  _db = db;

  // Configure persistence
  _onSave = config.onSave;
  _saveDebounceMs = config.saveDebounceMs ?? 1000;

  return _db;
}

/**
 * Get the current database instance. Throws if not initialized.
 */
export function getDatabase(): SqlJsDatabase {
  if (!_db) {
    // Debug: capture call stack info
    const stack = new Error().stack || "no stack";
    throw new Error(`Database not initialized. Call initDatabase() first. Stack: ${stack}`);
  }
  return _db;
}

/**
 * Export the full database as a Uint8Array (for saving to disk).
 */
export function exportDatabase(): Uint8Array {
  return getDatabase().export();
}

/**
 * Execute a parameterized SQL statement using prepare/bind/step/free.
 *
 * sql.js's `Database.run(sql, params)` internally calls prepare→bind→step→free,
 * but using the explicit pattern gives us more control and clearer error messages.
 * Accepts positional arrays or named-param objects.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function runParams(sql: string, params: any[] | Record<string, any>): void {
  const db = getDatabase();
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params as BindParams);
    stmt.step();
  } finally {
    stmt.free();
  }
}

/**
 * Schedule a debounced save. Call after every mutation.
 */
export function scheduleSave(): void {
  if (!_onSave) return;
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(async () => {
    if (_onSave && _db) {
      const data = _db.export();
      await _onSave(data);
    }
  }, _saveDebounceMs);
}

/**
 * Force an immediate save (e.g., before app close).
 */
export async function forceSave(): Promise<void> {
  if (_saveTimer) clearTimeout(_saveTimer);
  if (_onSave && _db) {
    const data = _db.export();
    await _onSave(data);
  }
}

/**
 * Close the database and clean up.
 */
export function closeDatabase(): void {
  if (_saveTimer) clearTimeout(_saveTimer);
  if (_db) {
    _db.close();
    _db = null;
  }
}

/**
 * Reset the database singleton (for testing).
 */
export function resetDatabase(): void {
  closeDatabase();
  _onSave = undefined;
  _saveDebounceMs = 1000;
}
