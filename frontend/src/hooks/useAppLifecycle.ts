/**
 * App lifecycle hook — saves database on pause/background and handles back nav.
 * Only active when running inside Tauri.
 */
import { useEffect } from "react";
import { isTauri } from "../utils/platform";
import { forceSave } from "../db/database";

/**
 * Registers lifecycle event listeners:
 * - `visibilitychange` → force-save when app goes to background
 * - `beforeunload` → force-save on close (desktop)
 * - `pagehide` → force-save (Android)
 */
export function useAppLifecycle(): void {
  useEffect(() => {
    if (!isTauri()) return;

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        // App went to background (Android) or was hidden (desktop minimize)
        void forceSave();
      }
    }

    function handleBeforeUnload() {
      // Desktop close or page navigation
      void forceSave();
    }

    function handlePageHide() {
      // Android back button / task switch
      void forceSave();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, []);
}
