/**
 * Tab service — mirrors api/routers/tabs.py.
 * CRUD with name auto-generation. Image handling deferred to Tauri FS plugin.
 */

import type { TabSetup, TabSetupCreate, TabSetupUpdate } from "../types/models";
import { tabRepo } from "../db";
import { isTauri } from "../utils/platform";

function generateTabName(data: { make?: string; model?: string }): string {
  const parts = [data.make, data.model].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Unnamed Tab";
}

export const tabService = {
  list(): TabSetup[] {
    return tabRepo.list();
  },

  getById(id: string): TabSetup | null {
    return tabRepo.getById(id);
  },

  create(data: TabSetupCreate): TabSetup {
    const name = generateTabName(data);
    return tabRepo.create({ ...data, name });
  },

  update(id: string, data: TabSetupUpdate): TabSetup | null {
    const nameFields = ["make", "model"] as const;
    const hasNameChange = nameFields.some((f) => data[f] !== undefined);

    if (hasNameChange) {
      const existing = tabRepo.getById(id);
      if (!existing) return null;
      const merged = {
        make: data.make ?? existing.make,
        model: data.model ?? existing.model,
      };
      return tabRepo.update(id, { ...data, name: generateTabName(merged) });
    }

    return tabRepo.update(id, data);
  },

  delete(id: string): boolean {
    // TODO: In Tauri, also delete tab image file via FS plugin
    return tabRepo.delete(id);
  },

  async uploadImage(tabId: string, file: File): Promise<string> {
    if (!isTauri()) {
      throw new Error("Image upload requires Tauri runtime");
    }

    const { exists, mkdir, writeFile, BaseDirectory } = await import("@tauri-apps/plugin-fs");

    // Create tab-images directory if needed
    const imgDir = "tab-images";
    const dirExists = await exists(imgDir, { baseDir: BaseDirectory.AppData });
    if (!dirExists) {
      await mkdir(imgDir, { baseDir: BaseDirectory.AppData, recursive: true });
    }

    // Save binary to disk
    const buffer = await file.arrayBuffer();
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${tabId}.${ext}`;
    const filepath = `${imgDir}/${filename}`;

    await writeFile(filepath, new Uint8Array(buffer), { baseDir: BaseDirectory.AppData });

    // Update the tab record with the image path
    tabRepo.update(tabId, { tab_image_path: filepath } as unknown as TabSetupUpdate);

    return filepath;
  },

  getImageUrl(tabId: string): string | null {
    // For Tauri, image loading should use loadImageBlob for binary-safe access.
    const tab = tabRepo.getById(tabId);
    if (!tab || !tab.tab_image_path) return null;
    return tab.tab_image_path;
  },

  async loadImageBlob(tabId: string): Promise<Blob | null> {
    if (!isTauri()) return null;

    const tab = tabRepo.getById(tabId);
    if (!tab || !tab.tab_image_path) return null;

    try {
      const { readFile, BaseDirectory } = await import("@tauri-apps/plugin-fs");
      const data = await readFile(tab.tab_image_path, { baseDir: BaseDirectory.AppData });
      return new Blob([data]);
    } catch {
      return null;
    }
  },

  async deleteImage(tabId: string): Promise<void> {
    if (!isTauri()) return;

    const tab = tabRepo.getById(tabId);
    if (!tab || !tab.tab_image_path) return;

    try {
      const { remove, BaseDirectory } = await import("@tauri-apps/plugin-fs");
      await remove(tab.tab_image_path, { baseDir: BaseDirectory.AppData });
      tabRepo.update(tabId, { tab_image_path: null } as unknown as TabSetupUpdate);
    } catch (e) {
      console.error("Failed to delete tab image:", e);
    }
  },
};
