# Research: Desktop Packaging with pywebview + PyInstaller

**Date**: 2026-02-10T00:00:00Z  
**Researcher**: researcher-agent  
**Confidence**: High  
**Tools Used**: fetch_webpage, github_repo (r0x0r/pywebview), read_file

## Summary

Packaging BareTrack as a Windows desktop app is feasible with moderate complexity. The recommended architecture runs FastAPI/uvicorn in a daemon thread, mounts the React build via `StaticFiles`, and points pywebview at `http://localhost:{port}`. PyInstaller bundles everything as a one-directory distribution. The SQLite database should live in `%LOCALAPPDATA%\BareTrack\` in packaged mode.

## Sources

| Source | URL | Accessed | Relevance | Method |
|--------|-----|----------|-----------|--------|
| pywebview Guide - Usage | https://pywebview.flowrl.com/guide/usage.html | 2026-02-10 | High | fetch |
| pywebview Guide - Architecture | https://pywebview.flowrl.com/guide/architecture.html | 2026-02-10 | High | fetch |
| pywebview Guide - Freezing | https://pywebview.flowrl.com/guide/freezing.html | 2026-02-10 | High | fetch |
| pywebview Guide - Web Engine | https://pywebview.flowrl.com/guide/web_engine.html | 2026-02-10 | High | fetch |
| pywebview Guide - Security | https://pywebview.flowrl.com/guide/security.html | 2026-02-10 | Medium | fetch |
| pywebview Flask example | https://github.com/r0x0r/pywebview/tree/main/examples/flask_app | 2026-02-10 | High | github_repo |
| pywebview source: `__init__.py`, `http.py`, `util.py` | https://github.com/r0x0r/pywebview | 2026-02-10 | High | github_repo |
| PyInstaller Spec Files | https://pyinstaller.org/en/stable/spec-files.html | 2026-02-10 | High | fetch |
| PyInstaller Runtime Info | https://pyinstaller.org/en/stable/runtime-information.html | 2026-02-10 | High | fetch |
| BareTrack `api/main.py` | Local workspace | 2026-02-10 | High | read_file |
| BareTrack `src/db.py` | Local workspace | 2026-02-10 | High | read_file |
| BareTrack `vite.config.ts` | Local workspace | 2026-02-10 | High | read_file |

---

## Key Findings

### 1. Threading Model: FastAPI in Background Thread, pywebview on Main Thread

**pywebview requires the main thread** for its GUI loop (`webview.start()` is blocking). All backend logic must run in a separate thread. This is well-documented and non-negotiable — Cocoa (macOS) enforces it, and Windows WinForms follows the same pattern.

**FastAPI/uvicorn runs fine in a daemon thread.** Unlike Flask (WSGI), FastAPI is ASGI, but we don't need pywebview's built-in Bottle server at all. Instead:

1. Start uvicorn programmatically in a daemon thread on a fixed port (e.g., 39871)
2. Wait for the server to become ready (poll with socket connect or use uvicorn's `startup` event)
3. Create a pywebview window pointing at `http://localhost:{port}`
4. Call `webview.start()` on the main thread

This is architecturally similar to the pywebview Flask example pattern but avoids WSGI/ASGI compatibility issues entirely.

> **Why not pass the FastAPI app directly to `webview.create_window()`?**  
> pywebview's `create_window(url=app)` parameter accepts WSGI/ASGI apps and runs them through its internal Bottle-based server. However, this server is minimal (bottle.py), doesn't support ASGI natively, and may not handle all FastAPI features correctly (middleware, lifespan events, WebSockets). Running uvicorn directly is safer and preserves BareTrack's existing architecture with zero changes to the API layer.

**Recommended entry point pattern (`desktop.py`):**

```python
"""BareTrack Desktop — pywebview entry point."""
import os
import sys
import socket
import threading
import time

import webview
import uvicorn


def get_resource_path(relative_path: str) -> str:
    """Get path to resource, works for dev and for PyInstaller."""
    if getattr(sys, 'frozen', False):
        # Running as PyInstaller bundle
        base_path = sys._MEIPASS
    else:
        base_path = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_path, relative_path)


def get_data_dir() -> str:
    """Get the user data directory for database storage."""
    if getattr(sys, 'frozen', False):
        # Packaged mode: use %LOCALAPPDATA%\BareTrack
        base = os.environ.get('LOCALAPPDATA', os.path.expanduser('~'))
        data_dir = os.path.join(base, 'BareTrack')
    else:
        # Dev mode: project root
        data_dir = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(data_dir, exist_ok=True)
    return data_dir


def wait_for_server(host: str, port: int, timeout: float = 10.0) -> bool:
    """Block until the server is accepting connections."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            with socket.create_connection((host, port), timeout=1):
                return True
        except OSError:
            time.sleep(0.1)
    return False


def start_server(port: int):
    """Run uvicorn in the current thread (called from daemon thread)."""
    # Set DB path before importing the app
    os.environ['BARETRACK_DB_DIR'] = get_data_dir()

    # Mount static files for the React frontend
    from api.main import app
    from fastapi.staticfiles import StaticFiles

    frontend_dir = get_resource_path(os.path.join('frontend', 'dist'))
    if os.path.isdir(frontend_dir):
        app.mount('/', StaticFiles(directory=frontend_dir, html=True), name='frontend')

    uvicorn.run(app, host='127.0.0.1', port=port, log_level='warning')


def main():
    port = 39871  # Fixed port for desktop mode

    # Start FastAPI server in daemon thread
    server_thread = threading.Thread(target=start_server, args=(port,), daemon=True)
    server_thread.start()

    # Wait for server to be ready
    if not wait_for_server('127.0.0.1', port):
        print('ERROR: Server failed to start', file=sys.stderr)
        sys.exit(1)

    # Create pywebview window
    window = webview.create_window(
        'BareTrack',
        url=f'http://127.0.0.1:{port}',
        width=1280,
        height=860,
        min_size=(1024, 700),
    )
    webview.start(debug=not getattr(sys, 'frozen', False))


if __name__ == '__main__':
    main()
```

### 2. Serving the React Frontend

**Recommendation: Mount via FastAPI `StaticFiles` — not pywebview's built-in server.**

Reasons:
- The React app uses `fetch('/api/...')` for all API calls (via `apiFetch` in `client.ts`). If served from the same origin as the FastAPI server, no CORS or proxy configuration is needed.
- In dev mode, Vite's proxy handles `/api` → `localhost:8000`. In desktop mode, both front and backend are at `http://127.0.0.1:{port}`, so the same relative URLs work seamlessly.
- FastAPI's `StaticFiles(html=True)` handles SPA routing — it serves `index.html` for any path that doesn't match a static file, which is required for `react-router-dom`.

**Important ordering**: Mount `StaticFiles` as a catch-all **after** all API routers are registered, so `/api/*` routes take priority.

**Vite build consideration**: The current `vite.config.ts` outputs to `frontend/dist/` (Vite default). pywebview's freezing docs warn that `dist/` conflicts with PyInstaller's output directory (also `dist/`). This is not an issue here because PyInstaller's `dist/` is at the project root while Vite's is at `frontend/dist/`.

### 3. Database Path in Packaged vs Dev Mode

**Current state** (`src/db.py`):
```python
sqlite_file_name = "baretrack.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"
```

This creates `baretrack.db` in the current working directory. In a PyInstaller bundle, the CWD is unpredictable. In a one-file build, data written to `sys._MEIPASS` is lost on exit.

**Recommended approach**: Use an environment variable `BARETRACK_DB_DIR` set by `desktop.py`:

```python
# src/db.py — modified
import os
from sqlmodel import SQLModel, create_engine, Session
from src.models import BowSetup, ArrowSetup, Session as SessionModel, End, Shot, ArrowShaft

def _get_db_url() -> str:
    db_dir = os.environ.get('BARETRACK_DB_DIR', '')
    if db_dir:
        db_path = os.path.join(db_dir, 'baretrack.db')
    else:
        db_path = 'baretrack.db'  # dev default: project root CWD
    return f'sqlite:///{db_path}'

sqlite_url = _get_db_url()
engine = create_engine(sqlite_url)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
```

In packaged mode, `desktop.py` sets `BARETRACK_DB_DIR = %LOCALAPPDATA%\BareTrack\` **before** importing the app. In dev mode, the env var is unset, so it falls back to `baretrack.db` in CWD — no change from current behavior.

### 4. PyInstaller Configuration

**Recommendation: One-directory (`--onedir`) distribution, not one-file.**

| Factor | One-file (`--onefile`) | One-directory (`--onedir`) |
|--------|----------------------|--------------------------|
| Startup time | Slow (extracts to temp dir every launch) | Fast (files already on disk) |
| SQLite DB | Cannot live inside bundle — needs external path anyway | Straightforward |
| Frontend assets | Extracted every launch (~5-10MB) | Already on disk |
| Update size | Full exe (~100MB+) for any change | Can replace individual files |
| Practical for users | Single file looks cleaner | Wrap with installer (Inno Setup) |

**Spec file outline (`baretrack.spec`):**

```python
# baretrack.spec
import os

block_cipher = None

a = Analysis(
    ['desktop.py'],
    pathex=[],
    binaries=[],
    datas=[
        # React frontend build output
        ('frontend/dist', 'frontend/dist'),
        # Any other data files (e.g., round definitions)
    ],
    hiddenimports=[
        # FastAPI / Pydantic / SQLModel may need these
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'uvicorn.lifespan.off',
        # multipart for file uploads
        'multipart',
        # SQLModel / SQLAlchemy
        'sqlalchemy.dialects.sqlite',
        # API routers (dynamic imports)
        'api.routers.bows',
        'api.routers.arrows',
        'api.routers.tabs',
        'api.routers.sessions',
        'api.routers.scoring',
        'api.routers.analysis',
        'api.routers.crawls',
        'api.routers.analytics',
        'api.routers.rounds',
        # Domain modules
        'src.models',
        'src.db',
        'src.physics',
        'src.scoring',
        'src.park_model',
        'src.analysis',
        'src.crawls',
        'src.precision',
        'src.rounds',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # Exclude unused pywebview renderers
        'PyQt5', 'PyQt6', 'PySide2', 'PySide6',
        'gtk', 'gi',
        'cefpython3',
        # Exclude test dependencies
        'pytest', 'httpx',
    ],
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='BareTrack',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,  # No console window (windowed mode)
    icon='assets/baretrack.ico',  # Add an icon file
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='BareTrack',
)
```

**Key PyInstaller notes:**
- `console=False` — hides the terminal window; pywebview's `http.py` already handles `sys.stdout`/`sys.stderr` being `None` in windowed mode on Windows.
- The `excludes` list prevents PyInstaller from bundling PyQt/GTK/CEF — pywebview defaults to `edgechromium` on Windows, so these are dead weight.
- `hiddenimports` for uvicorn's submodules is essential — uvicorn uses lazy imports that PyInstaller can't trace.

### 5. Windows-Specific: WebView2 / Edge Runtime

**pywebview on Windows uses EdgeChromium (WebView2) by default**, falling back to MSHTML (IE11) if unavailable.

| Windows Version | WebView2 Status |
|----------------|----------------|
| Windows 11 | Pre-installed |
| Windows 10 (21H1+) | Pre-installed |
| Windows 10 (older) | May need manual install |
| Windows 7/8 | Not supported by WebView2 |

**Mitigations:**
1. **Bootstrap installer**: Use Inno Setup or similar to check for WebView2 and install the [Evergreen Bootstrapper](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) if missing. Microsoft provides a redistributable (~1.8MB bootstrapper).
2. **Runtime detection**: pywebview silently falls back to MSHTML if Edge isn't available. MSHTML is IE11-based and won't render modern React/CSS well. It's better to fail fast with a clear error than to render poorly.
3. **Recommendation**: Add a pre-flight check in `desktop.py`:

```python
import sys
import ctypes

def check_webview2_available() -> bool:
    """Check if WebView2 runtime is installed on Windows."""
    if sys.platform != 'win32':
        return True
    try:
        from webview.platforms.winforms import _is_chromium
        return _is_chromium()
    except Exception:
        # Fallback: check registry
        import winreg
        try:
            key = winreg.OpenKey(
                winreg.HKEY_LOCAL_MACHINE,
                r'SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'
            )
            winreg.CloseKey(key)
            return True
        except FileNotFoundError:
            return False
```

### 6. Static File Mounting Order

The FastAPI app currently registers routers at `/api/*`. The static mount must come **last** (as a catch-all at `/`) so that API routes take priority:

```python
# In desktop.py's start_server(), AFTER importing the app:
app.mount('/', StaticFiles(directory=frontend_dir, html=True), name='frontend')
```

FastAPI evaluates routes in registration order. Since `include_router()` calls happen in `api/main.py` (at import time), and `app.mount('/')` happens after in `desktop.py`, the API routes will be checked first.

### 7. Port Collision Handling

Using a fixed port (e.g., 39871) is simplest but could collide if the user runs multiple instances. Options:

- **Option A (Simple)**: Fixed high port, fail with message if occupied. Good enough for a single-user desktop app.
- **Option B (Robust)**: Find a free port dynamically, pass it to pywebview. Slightly more complex but avoids collisions:

```python
def find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]
```

### 8. Graceful Shutdown

When the user closes the pywebview window, the process should exit cleanly:

- `webview.start()` returns when all windows are closed.
- The uvicorn server thread is a **daemon thread**, so it dies automatically when the main thread exits.
- SQLite connections are not left dangling because SQLModel's `Session` context manager closes them.
- No special shutdown logic needed beyond what Python already provides.

---

## Recommended Architecture Summary

```
┌──────────────────────────────────────────────┐
│  desktop.py  (main thread)                    │
│                                               │
│  1. Set BARETRACK_DB_DIR env var              │
│  2. Start uvicorn in daemon thread ──────┐   │
│  3. Wait for server ready                │   │
│  4. webview.create_window(localhost:port) │   │
│  5. webview.start()  ← blocks            │   │
│                                          │   │
│  ┌─────────────────────────────────────┐ │   │
│  │ pywebview window (EdgeChromium)     │ │   │
│  │  ┌──────────────────────────────┐  │ │   │
│  │  │  React SPA (from /dist)      │  │ │   │
│  │  │  fetch('/api/...') ──────────│──│─│──┐ │
│  │  └──────────────────────────────┘  │ │  │ │
│  └─────────────────────────────────────┘ │  │ │
│                                          ▼  │ │
│  ┌──────────────────────────────────────────┐│
│  │ daemon thread: uvicorn                   ││
│  │  ┌────────────────────────────────────┐  ││
│  │  │ FastAPI app                        │◄─┘│
│  │  │  /api/* → routers (unchanged)      │   │
│  │  │  /*     → StaticFiles(dist/, html) │   │
│  │  │  DB: %LOCALAPPDATA%\BareTrack\     │   │
│  │  └────────────────────────────────────┘   │
│  └──────────────────────────────────────────┘│
└──────────────────────────────────────────────┘
```

## Files to Create / Modify

| File | Action | Complexity | Notes |
|------|--------|-----------|-------|
| `desktop.py` | **Create** | Medium | Entry point: uvicorn thread + pywebview main loop |
| `src/db.py` | **Modify** | Low | Read `BARETRACK_DB_DIR` env var for DB path |
| `baretrack.spec` | **Create** | Medium | PyInstaller spec with datas, hiddenimports, excludes |
| `requirements.txt` | **Modify** | Trivial | Add `pywebview`, `pyinstaller` |
| `scripts/build-desktop.ps1` | **Create** | Low | Build script: `npm run build` → `pyinstaller baretrack.spec` |
| `api/main.py` | **No change** | — | Static mount happens in `desktop.py`, not here |
| `frontend/src/api/client.ts` | **No change** | — | Already uses relative URLs (`/api/...`) |
| `vite.config.ts` | **No change** | — | Proxy only used in dev mode |

**Total: 3 new files, 2 small modifications.** Estimated effort: ~4-6 hours including testing.

## Contradictions / Gaps

1. **pywebview docs say `url` accepts "WSGI server object"** but the source code's `is_app()` function checks for both WSGI and ASGI. However, the internal server is Bottle-based (WSGI), so passing FastAPI directly would go through a WSGI-to-ASGI adapter (if one exists in pywebview) — this is undertested territory. **Recommendation: avoid passing FastAPI directly; use the uvicorn thread approach instead.**

2. **pywebview's freezing docs warn about Vite's `dist/` conflicting with PyInstaller's `dist/`**. In BareTrack's case this is a non-issue because Vite outputs to `frontend/dist/` and PyInstaller to project-root `dist/`. But keep this in mind if output directories are reconfigured.

3. **No guidance found** on pywebview + PyInstaller + `console=False` + uvicorn logging interactions. uvicorn writes to stdout/stderr which will be `None` in windowed mode. pywebview's own `http.py` handles this for Bottle, but uvicorn may need `log_level='warning'` or explicit log configuration to avoid crashes.

## Known Issues and Mitigations

| Issue | Mitigation |
|-------|-----------|
| WebView2 not installed on older Windows 10 | Pre-flight check + download prompt; bundle Evergreen Bootstrapper with installer |
| `sys.stdout` / `sys.stderr` is `None` in windowed mode | Set `log_level='warning'` on uvicorn; redirect logging to file |
| PyInstaller misses uvicorn submodules | Explicit `hiddenimports` in spec file |
| Port collision on multiple instances | Use `find_free_port()` or fixed port with clear error message |
| First-run DB creation in AppData | `create_db_and_tables()` in FastAPI lifespan handles this automatically |
| Large bundle size (~80-120MB) from numpy/scipy/pandas | Accept or strip unused modules via `excludes`; UPX compression helps marginally |
| PyInstaller antivirus false positives | Sign the exe with a code signing certificate; use `--onedir` (less suspicious to AV than `--onefile`) |

## Recommendations

1. **Start with `--onedir`** distribution wrapped in an Inno Setup installer. This gives fast startup, clean install/uninstall, and WebView2 bootstrapper integration.
2. **Do not attempt `--onefile`** unless there's a strong requirement — it adds startup latency, temp directory complexity, and AV false positive risk.
3. **Keep `desktop.py` completely separate** from the existing `api/main.py` — the desktop entry point is an orchestrator, not a replacement. The dev workflow (`uvicorn api.main:app --reload` + `npm run dev`) remains unchanged.
4. **Test the WebView2 rendering** early — React + Plotly.js in WebView2 should be fine (it's Chromium), but verify Plotly chart sizing and interactions in the native window.
5. **Consider adding `--debug` flag** to `desktop.py` that enables pywebview's DevTools (`webview.start(debug=True)`) for troubleshooting in packaged mode.

## Open Questions

- [ ] Does the app need auto-update capability? (Would require a different packaging approach, e.g., electron-updater equivalent)
- [ ] Should the database be portable (travel with the exe) or always in AppData?
- [ ] Is macOS/Linux packaging in scope, or Windows-only?
- [ ] Does the app need a system tray icon for minimize-to-tray behavior?
- [ ] Should `seed_data.py` run automatically on first launch if the DB is empty?
