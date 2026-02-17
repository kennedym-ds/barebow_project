/**
 * Legacy data migration — detects and imports existing BareTrack database
 * from the pywebview/PyInstaller installation.
 *
 * Legacy location: %LOCALAPPDATA%\BareTrack\baretrack.db
 * New location: Tauri AppData directory (managed by tauriPersistence.ts)
 */

import { exists, readFile, BaseDirectory } from "@tauri-apps/plugin-fs";
import { isDesktop } from "../utils/platform";

const LEGACY_DB_NAME = "baretrack.db";

/**
 * Check if a legacy database exists in the old pywebview location.
 * Returns the raw bytes if found, null otherwise.
 *
 * On Windows, the legacy path was %LOCALAPPDATA%\BareTrack\baretrack.db
 * which maps to Tauri's BaseDirectory.AppLocalData parent.
 */
export async function detectLegacyDatabase(): Promise<Uint8Array | null> {
  if (!isDesktop()) return null;

  try {
    // Tauri's AppLocalData maps to %LOCALAPPDATA%\{identifier}\
    // The old pywebview app used %LOCALAPPDATA%\BareTrack\
    // We check using the resolve + homeDir approach via the FS plugin

    // First check if we already migrated (migration marker)
    const markerExists = await exists("_migrated_from_legacy", {
      baseDir: BaseDirectory.AppData,
    });
    if (markerExists) return null; // Already migrated

    // Check legacy location — on Windows this would be:
    // %LOCALAPPDATA%\BareTrack\baretrack.db
    // We try reading from AppLocalData parent by constructing the path.
    // Since Tauri's AppLocalData is %LOCALAPPDATA%\com.baretrack.app\,
    // the legacy path is at a sibling: %LOCALAPPDATA%\BareTrack\baretrack.db
    // We need to use data-dir resolution for the legacy path.

    // Try reading from the legacy location relative to AppLocalData
    const legacyPath = `../BareTrack/${LEGACY_DB_NAME}`;
    const legacyExists = await exists(legacyPath, {
      baseDir: BaseDirectory.AppLocalData,
    });

    if (!legacyExists) return null;

    const data = await readFile(legacyPath, {
      baseDir: BaseDirectory.AppLocalData,
    });

    return data;
  } catch (e) {
    console.warn("Legacy database detection failed:", e);
    return null;
  }
}

/**
 * Mark migration as complete so we don't prompt again.
 */
export async function markMigrationComplete(): Promise<void> {
  try {
    const { writeFile } = await import("@tauri-apps/plugin-fs");
    const marker = new TextEncoder().encode(
      JSON.stringify({ migratedAt: new Date().toISOString(), from: "pywebview" })
    );
    await writeFile("_migrated_from_legacy", marker, {
      baseDir: BaseDirectory.AppData,
    });
  } catch (e) {
    console.warn("Failed to write migration marker:", e);
  }
}
