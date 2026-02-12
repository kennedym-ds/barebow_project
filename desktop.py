"""BareTrack Desktop — pywebview entry point.

Launches the FastAPI backend in a background thread and opens
a native Windows window pointing at the local server.

Usage (dev):   python desktop.py
Usage (built): dist/BareTrack/BareTrack.exe
"""

import os
import sys
import socket
import threading
import time

import uvicorn
import webview

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

def _is_frozen() -> bool:
    """True when running inside a PyInstaller bundle."""
    return getattr(sys, "frozen", False)


def _bundle_dir() -> str:
    """Root directory of the application bundle (or project root in dev)."""
    if _is_frozen():
        # PyInstaller sets _MEIPASS for --onedir bundles
        return sys._MEIPASS  # type: ignore[attr-defined]
    return os.path.dirname(os.path.abspath(__file__))


def _data_dir() -> str:
    """Writable directory for user data (database, uploads).

    Packaged mode → %LOCALAPPDATA%/BareTrack/
    Dev mode      → project root (current behaviour)
    """
    if _is_frozen():
        base = os.path.join(os.environ.get("LOCALAPPDATA", os.path.expanduser("~")), "BareTrack")
        os.makedirs(base, exist_ok=True)
        return base
    return os.path.dirname(os.path.abspath(__file__))


# Tell src/db.py where to put the database
os.environ["BARETRACK_DATA_DIR"] = _data_dir()

# ---------------------------------------------------------------------------
# FastAPI with static frontend
# ---------------------------------------------------------------------------

HOST = "127.0.0.1"
PORT = 39871


def _mount_frontend(app):
    """Mount the built React SPA on '/' so the API and UI share one origin."""
    from fastapi.staticfiles import StaticFiles

    frontend_dist = os.path.join(_bundle_dir(), "frontend", "dist")
    if os.path.isdir(frontend_dist):
        # Remove the "/" health-check route so StaticFiles can serve index.html
        app.routes[:] = [r for r in app.routes if not (hasattr(r, 'path') and r.path == '/')]
        # html=True enables SPA fallback (index.html for unknown routes)
        app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
    else:
        print(f"[desktop] WARNING: frontend/dist not found at {frontend_dist}")
        print("[desktop] Run 'cd frontend && npm run build' first.")


def _wait_for_server(host: str, port: int, timeout: float = 10.0) -> bool:
    """Block until the server accepts TCP connections."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with socket.create_connection((host, port), timeout=0.5):
                return True
        except OSError:
            time.sleep(0.1)
    return False


_server_error = None  # Shared between threads


def _start_server():
    """Run uvicorn in the current thread (called from a daemon thread)."""
    global _server_error
    try:
        from api.main import app  # import here so env vars are set first

        _mount_frontend(app)

        uvicorn.run(
            app,
            host=HOST,
            port=PORT,
            log_level="warning",
            # Disable signal handlers — pywebview owns the main thread
            # and will handle process shutdown.
        )
    except Exception as exc:
        import traceback
        _server_error = traceback.format_exc()
        print(f"[desktop] SERVER ERROR: {exc}")
        traceback.print_exc()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    # Check WebView2 availability on Windows
    if sys.platform == "win32":
        try:
            webview.util.check_webview2()  # type: ignore[attr-defined]
        except Exception:
            # Not fatal — pywebview may still work; just warn
            print("[desktop] WebView2 runtime not detected.")
            print("[desktop] Install from: https://developer.microsoft.com/en-us/microsoft-edge/webview2/")

    # Start FastAPI in a daemon thread
    server_thread = threading.Thread(target=_start_server, daemon=True)
    server_thread.start()

    if not _wait_for_server(HOST, PORT):
        # Give thread a moment to write its error
        time.sleep(1)
        if _server_error:
            print(f"[desktop] Server traceback:\n{_server_error}")
        else:
            print("[desktop] ERROR: Server failed to start within 10 seconds (no traceback captured).")
        sys.exit(1)

    url = f"http://{HOST}:{PORT}"
    print(f"[desktop] BareTrack running at {url}")

    # Create native window (blocks until window is closed)
    window = webview.create_window(
        title="BareTrack",
        url=url,
        width=1280,
        height=860,
        min_size=(900, 600),
    )
    webview.start()  # blocks here until user closes the window


if __name__ == "__main__":
    main()
