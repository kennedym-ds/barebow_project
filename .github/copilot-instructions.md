# BareTrack — Copilot Instructions

## Architecture

Self-contained Tauri 2 app. All logic lives in the frontend — no backend server. The app runs natively on Windows (desktop) and Android (mobile) from a single codebase.

```
frontend/             → Vite + React + TypeScript SPA
  src/
    db/               → sql.js (WASM SQLite) database layer
      database.ts     → Singleton init, runParams(), save/load, UUID generation
      schema.sql      → DDL for all tables (mirrors old src/models.py)
      repos/          → CRUD repositories (bowRepo, arrowRepo, tabRepo, sessionRepo)
      tauriPersistence.ts → Read/write DB file via Tauri FS plugin
      legacyMigration.ts  → Detect & import old pywebview database
    services/         → Service layer (business logic, name generation, analytics)
    domain/           → Pure TS domain logic (physics, scoring, crawls, analysis)
    api/              → TanStack Query hooks wrapping services (not HTTP)
    pages/            → Route pages (one folder each, index.tsx + .css)
    components/       → Shared UI (Layout, NavSidebar, TargetFace, etc.)
    types/            → TypeScript interfaces (models.ts mirrors schema.sql)
    utils/            → Platform detection, helpers
  src-tauri/          → Tauri 2 Rust shell (config, capabilities, plugins)
  public/sql-wasm.wasm → sql.js WASM binary
```

## Environment & Commands

- **Database**: sql.js (WASM SQLite) in-browser. On Tauri, persisted via `@tauri-apps/plugin-fs` to AppData. Browser dev mode uses in-memory DB (no persistence).
- **Frontend dev**: `cd frontend && npm run dev` — port 5173
- **Desktop dev**: `cd frontend && npx tauri dev` — launches native window
- **Android build**: `cd frontend && npx tauri android build --debug --target aarch64` — requires Android SDK, NDK 27, JDK 21
- **Desktop build**: `cd frontend && npx tauri build` — produces Windows installer via NSIS
- **Build scripts**: `.\scripts\build-tauri-desktop.ps1`, `.\scripts\build-tauri-android.ps1`
- **CI**: `.github/workflows/ci.yml` — frontend lint/typecheck/build + Tauri desktop build on Windows

## Key Constraints

- **No `db.run(sql, params)` with parameters** — Android WebView's WASM runtime silently drops params passed to sql.js `Database.run()`. Always use `runParams()` from `database.ts` which uses explicit `prepare()` → `stmt.bind()` → `stmt.step()` → `stmt.free()`.
- **Tauri 2 detection**: Use `'__TAURI_INTERNALS__' in window` (NOT `__TAURI__` from Tauri 1). The `waitForTauri()` helper in `main.tsx` polls for up to 3 seconds on Android where injection is async.
- **Platform detection**: `isTauri()`, `isAndroid()`, `isDesktop()` in `utils/platform.ts`.

## Data Model Conventions

All tables use **string UUIDs** as primary keys. Schema is defined in `frontend/src/db/schema.sql`. TypeScript interfaces in `frontend/src/types/models.ts` mirror table columns 1:1 in snake_case.

Key tables: `bowsetup`, `arrowsetup`, `arrowshaft`, `tabsetup`, `session`, `end`, `shot`.

Field names use archery-specific units (e.g., `total_arrow_weight_gr`, `brace_height_in`, `tiller_top_mm`). Keep these exact names.

Round presets: `ROUND_DEFINITIONS` in `frontend/src/types/models.ts` defines 21 standard rounds.

## Frontend Patterns

- **Service layer**: One file per resource in `frontend/src/services/`. Services call repos from `frontend/src/db/repos/`. Business logic (name generation, analytics computations) lives here.
- **API hooks**: One file per resource in `frontend/src/api/` using TanStack Query. Hooks call services, not repos directly. Mutations use `Promise.resolve(service.method())` and invalidate query keys on success.
- **Code-splitting**: Plotly-heavy pages use `React.lazy()` + `Suspense` in `App.tsx`. Plotly.js is isolated via `manualChunks` in `vite.config.ts`.
- **Pages**: Each page is a folder under `frontend/src/pages/` with `index.tsx` + `.css`. All pages must `export default`.
- **Numeric inputs**: Use `handleNumericChange()` guard to prevent `NaN` propagation from empty fields.
- **Mobile**: `styles/mobile.css` handles responsive layout. `useMobileLayout()` hook detects mobile. Android safe area handled in `main.tsx`.

## Domain Context

This is a **barebow archery** analysis tool. Key domain concepts:
- **James Park Model**: Separates archer skill (sigma) from equipment drag loss using two-distance comparison.
- **Crawl marks**: String-walking reference positions — polynomial regression predicts marks for untested distances.
- **Scoring**: Ring score from (x,y) coordinates on WA or Flint target faces.
- **GPP/FOC**: Grains Per Pound and Front of Center — arrow efficiency metrics.
- **Precision**: CEP50, R95, sigma, EWMA control charts, flier detection.
- **Trajectory**: Bisection solver for optimal launch angle, wind drift analysis.
- **Arrow analytics**: Shaft grading, group stats, outlier detection, set optimizer.
