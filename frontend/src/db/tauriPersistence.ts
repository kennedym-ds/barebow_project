/**
 * Tauri FS persistence — reads/writes baretrack.db to the app data directory.
 */
import { exists, mkdir, readFile, writeFile, BaseDirectory } from "@tauri-apps/plugin-fs";

const DB_FILENAME = "baretrack.db";

/** Read existing database from app data dir if it exists. */
export async function loadDatabaseFile(): Promise<Uint8Array | null> {
  try {
    // Ensure app data directory exists
    const dirExists = await exists("", { baseDir: BaseDirectory.AppData });
    if (!dirExists) {
      await mkdir("", { baseDir: BaseDirectory.AppData, recursive: true });
    }

    const fileExists = await exists(DB_FILENAME, { baseDir: BaseDirectory.AppData });
    if (!fileExists) return null;

    return await readFile(DB_FILENAME, { baseDir: BaseDirectory.AppData });
  } catch (e) {
    console.error("Failed to load database file:", e);
    return null;
  }
}

/** Save database bytes to app data dir. */
export async function saveDatabaseFile(data: Uint8Array): Promise<void> {
  try {
    const dirExists = await exists("", { baseDir: BaseDirectory.AppData });
    if (!dirExists) {
      await mkdir("", { baseDir: BaseDirectory.AppData, recursive: true });
    }
    await writeFile(DB_FILENAME, data, { baseDir: BaseDirectory.AppData });
  } catch (e) {
    console.error("Failed to save database file:", e);
  }
}
