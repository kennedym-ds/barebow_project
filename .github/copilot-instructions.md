# BareTrack — Copilot Instructions

## Architecture

Monorepo with three layers. Domain logic lives in `src/` (pure Python), the REST API in `api/` (FastAPI), and the UI in `frontend/` (Vite + React + TypeScript). The API is a thin wrapper — routers import directly from `src/` and never duplicate domain logic.

```
src/          → Domain: models, physics, analysis, scoring, crawls (pure Python, no web deps)
api/          → FastAPI app: 49 endpoints across 9 routers, imports from src/
frontend/     → React SPA: TanStack Query hooks, Plotly.js charts, react-router-dom v7
desktop.py    → pywebview entry point for standalone Windows app
```

## Environment & Commands

- **Python venv**: `.venv` at project root. Always activate before running Python commands.
- **Database**: SQLite file `baretrack.db` via SQLModel. Schema auto-created on API startup via `lifespan` handler in `api/main.py`.
- **API**: `uvicorn api.main:app --reload --reload-dir src --reload-dir api --port 8000` — Swagger at `/docs`
- **Frontend**: `cd frontend && npm run dev` — port 5173, proxies `/api` → `localhost:8000`
- **Tests**: `python -m pytest` — uses in-memory SQLite with `StaticPool` (no file I/O). 93 tests.
- **Build**: `cd frontend && npm run build` — output in `frontend/dist/`
- **Desktop**: `python desktop.py` — launches pywebview window with embedded API server
- **VS Code tasks**: `Dev: Start All` starts both servers. `Run Tests` is the default test task.
- **Seed data**: `python seed_data.py` — creates 6 sample WA 18m sessions for development.

## Release & Publish Workflow (Windows)

Use this checklist for versioned desktop releases (example: `v1.0.1`).

### Prerequisites

- Commit and push all code/doc changes to `main`.
- Build artifacts are present (installer expected at `dist/BareTrackSetup.exe`).
- GitHub auth is available via one of:
	- GitHub CLI (`gh`) authenticated, or
	- MCP/VS Code GitHub integration authenticated with repo write permissions.

### Standard Release Steps

1. Verify branch is clean and current (`main`).
2. Update `CHANGELOG.md` with release notes.
3. Add/update a short release note in `README.md` when user-visible behavior changed.
4. Commit with conventional style (example: `fix: ship v1.0.1 stability and release notes`).
5. Create and push annotated tag (`vX.Y.Z`).
6. Create GitHub Release from the tag and attach `dist/BareTrackSetup.exe`.

### Important Clarification

- `git` alone can push commits/tags, but **cannot** create GitHub Release objects or upload release assets.
- Release asset upload requires GitHub API/UI/CLI (or MCP integration that supports release APIs).

### Agent Fallback: Non-Interactive Release Publish

If `gh` auth is unavailable but Git push/pull works, agents may use the Git credential helper token with GitHub REST APIs:

1. Refresh terminal PATH from Machine/User so `gh` (if installed) is discoverable.
2. Read GitHub token via credential helper (`git credential fill` for `host=github.com`).
3. Create or fetch release by tag via REST API (`/repos/{owner}/{repo}/releases` or `/releases/tags/{tag}`).
4. Upload installer with uploads endpoint:
	- `https://uploads.github.com/repos/{owner}/{repo}/releases/{id}/assets?name=BareTrackSetup.exe`
5. Verify release URL and asset count before completion.

Security notes:
- Never print token values in logs/output.
- Do not persist extracted tokens to files.
- Prefer existing GitHub auth (MCP/CLI/UI) when available.

### VS Code / Plugin Path

Yes — VS Code plugins can be used for this workflow:

- Use built-in Source Control for commit/push/tag tasks.
- Use GitHub integration (or MCP-backed GitHub tools) to create the Release and upload installer asset.
- Use GitHub Actions extension to monitor workflow runs if the repo has release workflows.

If release creation fails in-agent due to missing auth/tooling, fall back to GitHub web UI:

1. Open repo → **Releases** → **Draft a new release**
2. Select existing tag (e.g., `v1.0.1`)
3. Paste release notes from `CHANGELOG.md`
4. Upload `dist/BareTrackSetup.exe`
5. Publish release

## Data Model Conventions

All SQLModel tables use **string UUIDs** as primary keys (`Field(default_factory=lambda: str(uuid.uuid4()))`). Foreign keys are `Optional[str]`. Relationships use SQLModel's `Relationship()` with `cascade: "all, delete"` on parent→child (Session→End→Shot, ArrowSetup→ArrowShaft).

Key model file: `src/models.py` defines `BowSetup`, `ArrowSetup`, `ArrowShaft`, `TabSetup`, `Session`, `End`, `Shot`. Field names use archery-specific units (e.g., `total_arrow_weight_gr`, `brace_height_in`, `tiller_top_mm`). Keep these exact names — the frontend TypeScript interfaces in `frontend/src/types/models.ts` mirror them 1:1 in snake_case.

Round presets: `src/rounds.py` defines 21 `RoundPreset` entries. Keys **must** match `ROUND_DEFINITIONS` in `frontend/src/types/models.ts` exactly. Legacy aliases (e.g. `"WA 18m"` → same as `"WA 18m (Indoor)"`) exist for backward compatibility.

## API Router Pattern

Each router file in `api/routers/` follows this structure:
1. Define Pydantic `Create` / `Update` / response schemas at top of file (not in `src/models.py`)
2. Use `db: SQLModelSession = Depends(get_db)` from `api/deps.py`
3. All routes prefixed with `/api/{resource}` (mounted in `api/main.py`)
4. For relationships, define explicit Pydantic response schemas (see `ShotResponse`, `EndResponse`, `SessionDetailResponse` in `sessions.py`) — don't return raw SQLModel objects with nested relationships
5. Date parameters use `_parse_date()` helper (in `analytics.py`) to return HTTP 422 on invalid format
6. Input validation helpers (e.g., `_validate_crawl_lists()` in `crawls.py`) raise `HTTPException` — keep validation at the router level, not in `src/`

## Frontend Patterns

- **API hooks**: One file per resource in `frontend/src/api/` using TanStack Query. Pattern: `useResource()` for list, `useResource(id)` for detail, `useCreateResource()` / `useUpdateResource()` / `useDeleteResource()` for mutations. Mutations call `queryClient.invalidateQueries()` on success. **Include all filter params in query keys** (e.g. date range, equipment IDs) to prevent stale cache.
- **API client**: All fetches go through `apiFetch<T>()` in `frontend/src/api/client.ts` — generic typed wrapper, empty `BASE_URL` (Vite proxy handles routing).
- **Code-splitting**: Plotly-heavy pages use `React.lazy()` + `Suspense` in `App.tsx`. Plotly.js is isolated via `manualChunks` in `vite.config.ts`. New pages using Plotly must be lazy-imported.
- **Types**: TypeScript interfaces in `frontend/src/types/models.ts` must match Python model field names exactly (snake_case).
- **Pages**: Each page is a folder under `frontend/src/pages/` with `index.tsx` + `.css`. All pages must `export default`.
- **Numeric inputs**: Use a `handleNumericChange()` guard (see `BowForm.tsx`, `ArrowForm.tsx`) to prevent `NaN` propagation from empty fields. Never pass raw `parseFloat(e.target.value)`.

## Testing

- Tests live in `tests/`. The `client` fixture in `conftest.py` creates a per-test in-memory SQLite engine with `StaticPool` and overrides FastAPI's `get_db` dependency.
- Test files: `test_api_*.py` for endpoint tests, `test_models.py` / `test_park_model.py` / `test_crawls.py` / `test_precision.py` for domain logic.
- Always import all model classes in test files so SQLModel metadata registers tables.
- When adding shot data in tests, include `arrow_number` fields if the endpoint sorts by arrow number.

## Domain Context

This is a **barebow archery** analysis tool. Key domain concepts:
- **James Park Model** (`src/park_model.py`): Separates archer skill (sigma/angular deviation) from equipment drag loss by comparing scores at two distances. Guard: returns `(0.0, 0.0)` if distance ≤ 0.
- **VirtualCoach** (`src/analysis.py`): Orchestrates physics + Park Model to produce recommendations.
- **Crawl marks** (`src/crawls.py`): String-walking reference positions — polynomial regression predicts marks for untested distances. Requires ≥ 2 data points.
- **Scoring** (`src/scoring.py`): Ring score from (x,y) coordinates on WA or Flint target faces. Flint uses 5-zone scoring (max 5 per arrow), WA uses 10-zone.
- **GPP/FOC** (`src/physics.py`): Grains Per Pound and Front of Center — arrow efficiency metrics. GPP < 7 triggers safety warning.
- **Precision** (`src/precision.py`): DRMS, CEP50, Rayleigh, sigma calculations. Uses `np.var(ddof=0)` not `np.std()**2`.
- **Round presets** (`src/rounds.py`): 21 standard rounds. `get_round_preset(name)` returns `Optional[RoundPreset]`.
