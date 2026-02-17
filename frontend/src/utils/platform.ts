/**
 * Platform detection utilities for Tauri / browser dual-mode support.
 */

/**
 * Returns true when running inside a Tauri WebView (desktop or mobile).
 * Falls back to false when served from a regular browser (e.g., Vite dev server).
 *
 * Tauri 2 injects `__TAURI_INTERNALS__` (not the Tauri 1 `__TAURI__`).
 */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Returns true on Android (Tauri mobile).
 */
export function isAndroid(): boolean {
  return isTauri() && /android/i.test(navigator.userAgent);
}

/**
 * Returns true on desktop (Tauri, but not Android/iOS).
 */
export function isDesktop(): boolean {
  return isTauri() && !isAndroid();
}
