# Changelog

All notable changes to BareTrack are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Under Development
- Multi-distance session support (field archery)
- Computer vision auto-scoring
- PWA/offline capability
- Weather conditions logging

---

## [2026-02-10] — Arrow Analytics Updates

### Added
- **Per-Arrow Heatmaps**: Shot markers now render at alpha 0.2 with centre-of-mass × markers per arrow
- **Density Heatmap Toggle**: Optional histogram2dcontour visualization per arrow in Analysis Lab (density overlays)
- **Point-On Distance Calculator**: Polynomial root-finding for zero-crawl distance, displayed in Crawl Manager
- **CSV Export**: Client-side CSV download from History page with full shot data (Date, Round, End, Arrow, Score, X, Y, Is_X)
- **Round Presets Expansion**: Extended from 7 to 17 standard rounds:
  - Portsmouth (18m/60cm)
  - Bray I (18m/40cm/30 arrows)
  - Bray II (25m/60cm/30 arrows)
  - WA 30m (80cm/36 arrows)
  - WA 40m (80cm/36 arrows)
  - WA 60m (122cm/36 arrows)
  - Half WA 50m
  - National Barebow (50m/48 arrows)
  - Short National (40m/48 arrows)
  - Practice (30 arrows)

### Technical
- Added `markerOpacity`, `centroids`, and `extraTraces` props to TargetFace component
- Extended CrawlCalculateResponse with `point_on_distance` field
- Added `find_point_on_distance()` function to src/crawls.py using numpy polynomial roots
- Test suite: 93 tests passing

---

## [2026-02-09] — Arrow Precision Grouping

### Added
- **Arrow Precision Tiers**: Composite precision scoring (60% avg_radius + 40% std_score) ranks arrows into Primary/Secondary/Reserve tiers
- **Competition Set Callout**: Displays recommended set of arrows for highest precision
- **Tier Cards**: Visual grouping with aggregate stats per tier (green/yellow/red styling)
- **Per-Arrow Performance Table**: Sortable by precision rank with tier badges
- **ArrowTier Model**: Backend aggregate stats (avg_score, avg_radius, avg_precision_score per tier)

### Changed
- Arrow Performance endpoint now returns `tiers`, `primary_set`, and `group_size` fields
- Individual arrows include `precision_score`, `precision_rank`, and `tier` assignment

---

## [2026-02-08] — Six-Feature Batch Release

### Added
1. **Dashboard Home Page**: Summary stats, recent sessions grid, personal bests, quick actions
2. **Session Notes**: Free-text notes field on session creation and detail view
3. **Print Crawl Card**: Printable crawl chart with tab marks and distance lookup table
4. **Session Replay**: End-by-end animation of shots appearing on target face in History page
5. **Score Goal Simulator**: Reverse Park Model calculation — input target score, get required sigma/skill level
6. **Arrow Performance Tracker**: Per-arrow shot heatmap on target face with arrow selector checkboxes, single-arrow focus stats, and sortable performance table

### Fixed
- Sigma conversion bug: Removed double normalization in score-goal and arrow-performance endpoints (shots already in cm)
- Arrow color stability: Colors now keyed by original array index to prevent color changes when toggling arrows
- Unicode diamond rendering: Diamond markers now display correctly cross-platform

---

## [2026-01-18] — Session Logger Enhancements

### Added
- **Full Quiver Arrow Selection**: Select which quiver arrows to log (numbered 1-12+)
- **Arrows-Per-End Selector**: Dynamic dropdown (3, 5, 6, or 10 arrows per end)
- **Hover Preview**: Arrow circle + predicted score badge on target face before clicking
- **Arrow Diameter Scoring**: Shaft outer diameter (mm) now affects line-break score calculations

### Fixed
- **Target Click Detection**: Switched from invisible heatmap to CSS overlay for 100% reliable click interception
- **Save End Crash**: Fixed "list index out of range" error when arrow_numbers list is shorter than shots
- **Uvicorn File Watching**: Added `--reload-dir src --reload-dir api` to prevent `.venv` thrashing

---

## [2026-01-12] — Analysis Lab & Equipment

### Added
- **Analysis Lab**: Dual-mode analysis page with:
  - **Single-Distance Tab**: Advanced precision metrics (CEP50, sigma X/Y, H/V ratio, MPI), bias analysis, trends over time, within-end analysis, hit probability
  - **Cross-Distance Tab**: James Park Model analysis — separates skill (angular deviation) from equipment drag loss by comparing two distances
- **Equipment Selector**: Bow/Arrow dropdown filters for all analytics
- **Virtual Coach Integration**: Physics-based recommendations combining Park Model + setup efficiency + precision metrics

---

## [2025-12-20] — Core Platform & Analytics Foundation

### Added
- **API Backend**: 49 REST endpoints across 9 routers
  - Bows (5 endpoints): CRUD operations
  - Arrows (7 endpoints): CRUD + shaft data CSV upload
  - Tabs (8 endpoints): CRUD + image upload/download
  - Sessions (5 endpoints): CRUD + add end
  - Rounds (2 endpoints): Round preset library
  - Crawls (2 endpoints): Calculate regression, predict crawl
  - Analysis (4 endpoints): Virtual Coach, predict score, setup efficiency, safety check
  - Scoring (1 endpoint): Ring score calculation
  - Analytics (15 endpoints): Summary, shots, personal bests, Park Model, score context, bias, precision, trends, within-end, hit-probability, equipment comparison, dashboard, score-goal, arrow-performance
- **Domain Logic**:
  - James Park Model (`src/park_model.py`): Separates skill from drag loss via two-distance analysis
  - Physics calculations (`src/physics.py`): GPP, FOC, safety analysis
  - Crawl regression (`src/crawls.py`): Polynomial degree-2 fitting, predict crawl for any distance
  - Scoring utilities (`src/scoring.py`): WA and Flint target face ring scoring
- **React Frontend**:
  - Equipment Profile page (bows, arrows, tabs with forms + shaft data uploader)
  - Session Logger (interactive click-on-target scoring, real-time stats, quiver panel)
  - History page (session list, detail view with heatmap and scorecard table)
  - Crawl Manager (tab image overlay with calibrated mark lines, polynomial chart, print card)
  - Analytics Dashboard (trends, bias, precision over time)
  - Tuning Wizard (step-by-step barebow tuning guides — in progress)
- **Data Model**: SQLModel with SQLite
  - BowSetup, ArrowSetup (with ArrowShaft child), TabSetup
  - Session → End → Shot relationship tree
  - String UUIDs as primary keys, cascading deletes
- **Testing**: pytest suite with 93 tests, in-memory SQLite with StaticPool

### Technical Decisions
- Monorepo structure: domain logic in `src/`, API in `api/`, frontend in `frontend/`
- FastAPI + SQLModel for strong typing and Pydantic validation
- TanStack Query for data fetching with optimistic updates and cache invalidation
- Plotly.js for interactive charts (lazy-loaded via React.lazy)
- Vite dev server with `/api` → `localhost:8000` proxy

---

## Release Philosophy

BareTrack follows continuous delivery. Features are shipped as soon as they're tested and documented. Major feature batches are tagged here for visibility.

---

## Versioning

Currently pre-1.0. Versions will follow [Semantic Versioning](https://semver.org/) once stable.

---

[Unreleased]: https://github.com/kennedym-ds/barebow_project/compare/main...HEAD
[2026-02-10]: https://github.com/kennedym-ds/barebow_project/compare/v2026-02-09...v2026-02-10
[2026-02-09]: https://github.com/kennedym-ds/barebow_project/compare/v2026-02-08...v2026-02-09
[2026-02-08]: https://github.com/kennedym-ds/barebow_project/compare/v2026-01-18...v2026-02-08
[2026-01-18]: https://github.com/kennedym-ds/barebow_project/compare/v2026-01-12...v2026-01-18
[2026-01-12]: https://github.com/kennedym-ds/barebow_project/compare/v2025-12-20...v2026-01-12
[2025-12-20]: https://github.com/kennedym-ds/barebow_project/releases/tag/v2025-12-20
