# BareTrack — Copilot Instructions

## Architecture

Monorepo with three layers. Domain logic lives in `src/` (pure Python), the REST API in `api/` (FastAPI), and the UI in `frontend/` (Vite + React + TypeScript). The API is a thin wrapper — routers import directly from `src/` and never duplicate domain logic.

```
src/          → Domain: models, physics, analysis, scoring, crawls (pure Python, no web deps)
api/          → FastAPI app: 34 endpoints, routers import from src/
frontend/     → React SPA: TanStack Query hooks, Plotly.js charts, react-router-dom
```

## Environment & Commands

- **Python venv**: `.venv` at project root. Always activate before running Python commands.
- **Database**: SQLite file `baretrack.db` via SQLModel. Schema auto-created on API startup.
- **API**: `uvicorn api.main:app --reload --port 8000` — Swagger at `/docs`
- **Frontend**: `cd frontend && npm run dev` — port 5173, proxies `/api` → `localhost:8000`
- **Tests**: `python -m pytest` — uses in-memory SQLite with `StaticPool` (no file I/O)
- **Build**: `cd frontend && npm run build` — output in `frontend/dist/`

## Data Model Conventions

All SQLModel tables use **string UUIDs** as primary keys (`Field(default_factory=lambda: str(uuid.uuid4()))`). Foreign keys are `Optional[str]`. Relationships use SQLModel's `Relationship()` with `cascade: "all, delete"` on parent→child (Session→End→Shot, ArrowSetup→ArrowShaft).

Key model: `src/models.py` defines `BowSetup`, `ArrowSetup`, `ArrowShaft`, `TabSetup`, `Session`, `End`, `Shot`. Field names use archery-specific units (e.g., `total_arrow_weight_gr`, `brace_height_in`, `tiller_top_mm`). Keep these exact names — the frontend TypeScript interfaces in `frontend/src/types/models.ts` mirror them 1:1.

## API Router Pattern

Each router file in `api/routers/` follows this structure:
1. Define Pydantic `Create` / `Update` / response schemas at top of file (not in models.py)
2. Use `db: SQLModelSession = Depends(get_db)` from `api/deps.py`
3. All routes prefixed with `/api/{resource}` (mounted in `api/main.py`)
4. For relationships, define explicit Pydantic response schemas (see `ShotResponse`, `EndResponse`, `SessionDetailResponse` in `sessions.py`) — don't return raw SQLModel objects with nested relationships.

## Frontend Patterns

- **API hooks**: One file per resource in `frontend/src/api/` using TanStack Query. Pattern: `useResource()` for list, `useResource(id)` for detail, `useCreateResource()` / `useUpdateResource()` / `useDeleteResource()` for mutations. Mutations call `queryClient.invalidateQueries()` on success.
- **API client**: All fetches go through `apiFetch<T>()` in `frontend/src/api/client.ts` — generic typed wrapper, no BASE_URL (Vite proxy handles routing).
- **Code-splitting**: Plotly-heavy pages use `React.lazy()` + `Suspense`. Plotly.js is isolated via `manualChunks` in `vite.config.ts`. New pages using Plotly must be lazy-imported in `App.tsx`.
- **Types**: TypeScript interfaces in `frontend/src/types/models.ts` must match Python model field names exactly (snake_case).
- **Pages**: Each page is a folder under `frontend/src/pages/` with `index.tsx` + `.css`. All pages must `export default`.

## Testing

- Tests live in `tests/`. The `client` fixture in `conftest.py` creates a per-test in-memory SQLite engine with `StaticPool` and overrides FastAPI's `get_db` dependency.
- Test files: `test_api_*.py` for endpoint tests, `test_models.py` / `test_park_model.py` / `test_crawls.py` for domain logic.
- Always import all model classes in test files so SQLModel metadata registers tables.

## Domain Context

This is a **barebow archery** analysis tool. Key domain concepts:
- **James Park Model** (`src/park_model.py`): Separates archer skill (sigma/angular deviation) from equipment drag loss by comparing scores at two distances.
- **VirtualCoach** (`src/analysis.py`): Orchestrates physics + Park Model to produce recommendations.
- **Crawl marks** (`src/crawls.py`): String-walking reference positions — polynomial regression predicts marks for untested distances.
- **Scoring** (`src/scoring.py`): Ring score from (x,y) coordinates on WA or Flint target faces.
- **GPP/FOC** (`src/physics.py`): Grains Per Pound and Front of Center — arrow efficiency metrics.


