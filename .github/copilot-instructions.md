# BareTrack — Copilot Instructions

## Architecture

Monorepo with three layers. Domain logic lives in `src/` (pure Python), the REST API in `api/` (FastAPI), and the UI in `frontend/` (Vite + React + TypeScript). The API is a thin wrapper — routers import directly from `src/` and never duplicate domain logic.

```
src/          → Domain: models, physics, analysis, scoring, crawls (pure Python, no web deps)
api/          → FastAPI app: 49 endpoints across 9 routers, imports from src/
              → analytics/ is a sub-package with 4 modules (summary, precision, trends, goals)
              → analytics/__init__.py aggregates sub-routers into one router mounted in main.py
frontend/     → React SPA: TanStack Query hooks, Plotly.js charts, react-router-dom v7
desktop.py    → pywebview entry point (port 39871, BARETRACK_DATA_DIR env var)
```

## Environment & Commands

- **Python venv**: `.venv` at project root. Always activate before running Python commands.
- **Database**: SQLite file `baretrack.db` via SQLModel. Schema auto-created on startup via `lifespan` in `api/main.py`. Desktop mode uses `%LOCALAPPDATA%\BareTrack\` (set via `BARETRACK_DATA_DIR`).
- **API**: `uvicorn api.main:app --reload --reload-dir src --reload-dir api --port 8000` — Swagger at `/docs`
- **Frontend**: `cd frontend && npm run dev` — port 5173, proxies `/api` → `localhost:8000`
- **Tests**: `python -m pytest` — uses in-memory SQLite with `StaticPool` (no file I/O). 120 tests.
- **Build**: `cd frontend && npm run build` — output in `frontend/dist/`
- **Desktop**: `python desktop.py` — launches pywebview window on `127.0.0.1:39871`
- **VS Code tasks**: `Dev: Start All` starts both servers. `Run Tests` is the default test task.
- **Seed data**: `python seed_data.py` — creates 6 sample WA 18m sessions for development.

## Linting & Pre-commit

Ruff config lives in `pyproject.toml`: line-length 120, target py310, double quotes. Rule B008 is suppressed for `api/**/*.py` (FastAPI `Depends()` idiom).

Pre-commit hooks (`.pre-commit-config.yaml`): ruff lint+format, pytest, TypeScript type-check, ESLint. All run on commit — use `--no-verify` only when committing non-Python/non-TS files.

CI (`.github/workflows/ci.yml`): Python 3.11+3.12 matrix (ruff + pytest), Node 20 (tsc + eslint + build). Triggers on push/PR to `main`.

## Release Workflow (Windows)

1. Update `CHANGELOG.md` and optionally `README.md`.
2. Commit with conventional style: `fix: ship vX.Y.Z ...`
3. Create and push annotated tag (`vX.Y.Z`).
4. Create GitHub Release (via `gh release create`, MCP, or web UI) and attach `dist/BareTrackSetup.exe`.

If `gh` auth is unavailable, agents can extract a token via `git credential fill` for GitHub REST API calls. Never print tokens.

## Desktop Packaging (Windows)

Two-stage pipeline: PyInstaller builds the app, then Inno Setup wraps it in an installer.

- **Build app**: `.\scripts\build-desktop.ps1` — builds frontend with Vite, then runs PyInstaller via `baretrack.spec`. Output: `dist/BareTrack/BareTrack.exe`. Flags: `-SkipFrontend` (reuse existing `frontend/dist/`), `-Clean` (wipe `build/` and `dist/` first).
- **Build installer**: `.\scripts\build-installer.ps1` — calls `build-desktop.ps1` then compiles `installer/baretrack.iss` with Inno Setup 6 (`iscc.exe`). Output: `dist/BareTrackSetup.exe`. Flags: `-SkipApp` (reuse existing `dist/BareTrack/`), `-Clean`.
- **PyInstaller spec** (`baretrack.spec`): Entry point is `desktop.py`. Bundles `frontend/dist/`, `src/`, `api/` as data. Collects hidden imports for uvicorn/sqlmodel/pydantic/starlette/fastapi. Excludes unused renderers (PyQt, GTK, CEF, tkinter). Windowed mode (no console), uses `assets/baretrack.ico`.
- **Requires**: `.venv` with all deps, Node.js for frontend build, Inno Setup 6 on PATH or default install location.

## Data Model Conventions

All SQLModel tables use **string UUIDs** as primary keys (`Field(default_factory=lambda: str(uuid.uuid4()))`). Foreign keys are `Optional[str]`. Relationships use `Relationship()` with `cascade: "all, delete"` on parent→child (Session→End→Shot, ArrowSetup→ArrowShaft).

Key model file: `src/models.py` defines `BowSetup`, `ArrowSetup`, `ArrowShaft`, `TabSetup`, `Session`, `End`, `Shot`. Field names use archery-specific units (e.g., `total_arrow_weight_gr`, `brace_height_in`, `tiller_top_mm`). Keep these exact names — the frontend TypeScript interfaces in `frontend/src/types/models.ts` mirror them 1:1 in snake_case.

Round presets: `src/rounds.py` defines 21 `RoundPreset` entries. Keys **must** match `ROUND_DEFINITIONS` in `frontend/src/types/models.ts` exactly. Legacy aliases (e.g. `"WA 18m"` → same as `"WA 18m (Indoor)"`) exist for backward compatibility.

## API Router Pattern

Each router file in `api/routers/` follows this structure:
1. Define Pydantic `Create` / `Update` / response schemas at top of file (not in `src/models.py`). Analytics schemas are shared via `analytics/_schemas.py`.
2. Use `db: SQLModelSession = Depends(get_db)` from `api/deps.py`
3. All routes prefixed with `/api/{resource}` (mounted in `api/main.py`)
4. For relationships, define explicit Pydantic response schemas (see `ShotResponse`, `EndResponse`, `SessionDetailResponse` in `sessions.py`) — don't return raw SQLModel objects with nested relationships
5. Date parameters use `_parse_date()` helper (in `analytics/_shared.py`) to return HTTP 422 on invalid format
6. Input validation helpers (e.g., `_validate_crawl_lists()` in `crawls.py`) raise `HTTPException` — keep validation at the router level, not in `src/`
7. The `analytics/` sub-package aggregates 4 sub-routers in `__init__.py` and is mounted once in `main.py`

## Frontend Patterns

- **API hooks**: One file per resource in `frontend/src/api/` using TanStack Query. Pattern: `useResource()` for list, `useResource(id)` for detail, `useCreateResource()` / `useUpdateResource()` / `useDeleteResource()` for mutations. Mutations call `queryClient.invalidateQueries()` on success. **Include all filter params in query keys** (e.g. date range, equipment IDs) to prevent stale cache.
- **API client**: All fetches go through `apiFetch<T>()` in `frontend/src/api/client.ts` — generic typed wrapper, empty `BASE_URL` (Vite proxy handles routing). Throws `ApiError` on non-OK responses; returns `undefined` on 204.
- **Code-splitting**: Plotly-heavy pages use `React.lazy()` + `Suspense` in `App.tsx`. Plotly.js is isolated via `manualChunks` in `vite.config.ts`. New pages using Plotly must be lazy-imported.
- **Types**: TypeScript interfaces in `frontend/src/types/models.ts` must match Python model field names exactly (snake_case).
- **Pages**: Each page is a folder under `frontend/src/pages/` with `index.tsx` + `.css`. All pages must `export default`. Exception: `Home.tsx` lives directly in `pages/`.
- **Numeric inputs**: Use a `handleNumericChange()` guard (see `BowForm.tsx`, `ArrowForm.tsx`, `AnalysisLab/index.tsx`) to prevent `NaN` propagation from empty fields. Never pass raw `parseFloat(e.target.value)`.

## Testing

- Tests live in `tests/`. The `client` fixture in `conftest.py` creates a per-test in-memory SQLite engine with `StaticPool` and overrides FastAPI's `get_db` dependency.
- Test files: `test_api_*.py` for endpoint tests, `test_models.py` / `test_park_model.py` / `test_crawls.py` / `test_precision.py` / `test_physics.py` / `test_rounds.py` for domain logic.
- Always import all model classes in test files so SQLModel metadata registers tables (see `conftest.py` imports).
- When adding shot data in tests, include `arrow_number` fields if the endpoint sorts by arrow number.
- `test_precision.py` uses `unittest.TestCase`-style classes; all other test files use plain functions.

## Domain Context

This is a **barebow archery** analysis tool. Key domain concepts:
- **James Park Model** (`src/park_model.py`): Separates archer skill (sigma/angular deviation) from equipment drag loss by comparing scores at two distances. Guard: returns `(0.0, 0.0)` if distance ≤ 0.
- **VirtualCoach** (`src/analysis.py`): Orchestrates physics + Park Model to produce recommendations.
- **Crawl marks** (`src/crawls.py`): String-walking reference positions — polynomial regression predicts marks for untested distances. Requires ≥ 2 data points.
- **Scoring** (`src/scoring.py`): Ring score from (x,y) coordinates on WA or Flint target faces. Flint uses 5-zone scoring (max 5 per arrow), WA uses 10-zone.
- **GPP/FOC** (`src/physics.py`): Grains Per Pound and Front of Center — arrow efficiency metrics. GPP < 7 triggers safety warning.
- **Precision** (`src/precision.py`): DRMS, CEP50, R95, Rayleigh, sigma, EWMA control charts, dispersion ellipses, flier detection, hit probability. Uses `np.var(ddof=0)` not `np.std()**2`.
- **Round presets** (`src/rounds.py`): 21 standard rounds. `get_round_preset(name)` returns `Optional[RoundPreset]`.
