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

## [2026-02-13] — v1.0.2 Polish & Architecture Release

### Added
- **Error Boundary**: React error boundary with retry/home buttons prevents white-screen crashes
- **Toast Notifications**: Context-based toast system (success/error/warning/info) for user feedback
- **Dark Mode**: Full dark theme via CSS custom properties with Light/Dark/System toggle in sidebar
- **Help Page**: In-app guide with page descriptions, key concepts (Park Model, Crawl Marks, GPP/FOC), and contact info
- **Sidebar Tooltips**: Hover tooltips on all navigation items explaining each page's purpose
- **CI/CD Pipeline**: GitHub Actions workflow for Python 3.11/3.12 + frontend build/lint/type-check
- **ESLint Config**: Flat config for TypeScript and React with recommended rules
- **Pyproject.toml**: Ruff lint/format config + pytest settings

### Changed
- **Analytics Router Split**: Monolithic `analytics.py` (1,747 lines) refactored into `analytics/` package with 4 sub-modules (summary, precision, trends, goals) and shared schemas
- **Responsive Sidebar**: Hamburger menu for mobile viewports with overlay navigation
- **Accessibility Pass**: All 9 page CSS files updated from hardcoded hex to CSS variables for theme support
- **Pinned Dependencies**: `requirements.txt` updated with compatible version ranges for all 14 packages
- **API Structured Logging**: Request timing middleware, global exception handler, startup/shutdown lifecycle logs
- **Favicon & Meta**: Custom SVG favicon (target + arrow), meta description, theme-color

### Tests
- **27 New Router Tests**: Coverage for arrows (7), tabs (6), scoring (4), analysis (5), crawls (5) endpoints
- **120 Total Tests**: All passing (93 original + 27 new)

---

## [2026-02-13] — v1.0.1 Stability & UX Release

### Fixed
- **History Page White Screen**: Added defensive handling for missing/partial shot arrays and lazy-loaded target rendering to prevent runtime crashes when opening History.
- **Within-End Analytics Ordering**: Uses persisted shot sequence to ensure first/last arrow metrics are deterministic and match shooting order.
- **Session Save Robustness**: Added payload validation and deterministic shot sequencing when saving ends.
- **Score Goal Null Handling**: Prevented `None` comparison edge case in analytics score-goal recommendations.
- **Tab Upload Reliability**: Added chunked writes and upload size safeguards to reduce memory spikes and return clean `413` errors for oversized files.

### Changed
- **Frontend Cache Consistency**: End-save mutations now invalidate both session detail and list queries to prevent stale UI state.
- **Numeric Input Guards**: Analysis and equipment forms now guard empty numeric fields to prevent `NaN` propagation.
- **TypeScript Strictness Cleanup**: Resolved strict build blockers across analytics, crawl manager, tuning wizard, and equipment forms.

### Build
- Desktop packaging pipeline validated on Windows.
- Fresh installer produced: `dist/BareTrackSetup.exe`.

---

## [2026-02-11] — Deep Review & Robustness Fixes

### Fixed
- **Flint Scoring**: Corrected max score (560 → 280) and scoring formula (`*10` → `*5`) in round presets
- **Round Preset Alignment**: Expanded backend from 6 to 21 presets, matching all frontend round definitions with legacy aliases for backward compatibility
- **Zero-Division Guards**: Added protection in Park Model (`known_distance_m <= 0`) and scoring (`ring_width <= 0`)
- **Date Parsing**: All 22 date parameters in analytics now return HTTP 422 on invalid format instead of crashing with 500
- **Crawl Validation**: Both `/calculate` and `/predict` endpoints now reject inputs with fewer than 2 points or mismatched list lengths
- **Tab Upload Security**: File extension validation — only `.jpg`, `.jpeg`, `.png`, `.webp` accepted
- **NaN Form Inputs**: Bow and arrow equipment forms guard against `NaN` propagation from empty numeric fields
- **Flint Target Detection**: History page now derives `faceType` from `round_type` instead of hardcoding `"WA"`
- **CSV Sort Stability**: Arrow number sort handles `null` values with fallback to `Infinity`
- **Heatmap Flier Detection**: Fixed O(n²) performance by precomputing mean distance outside reduce loop
- **Equipment Comparison Cache**: Added missing `fromDate`/`toDate` to query key, preventing stale data
- **Crawl Debounce**: Added 400ms debounce to crawl calculation mutation to prevent rapid-fire recomputation

### Changed
- **Bulk Delete Performance**: Arrow shaft deletion uses single SQL `DELETE WHERE` instead of loop
- **Precision Calculation**: `np.std()**2` replaced with `np.var()` — cleaner and avoids rounding artifacts
- **Analytics Shot Ordering**: Bias and within-end queries now sort by `(arrow_number, id)` for deterministic results

### Docs
- Added [Getting Started](docs/getting-started.md) guide
- Added [User Guide](docs/user-guide.md)
- Updated README with documentation links table
- Updated FEATURES.md round count (17 → 21)
- Cleaned repo: removed stale `build/`, `dist/`, `__pycache__/` directories
- Added `build/`, `dist/`, `uploads/` to `.gitignore`

### Technical
- Test suite: 93 tests passing
- 4 tests updated to match corrected round preset count and Flint scoring

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
[2026-02-13 v1.0.2]: https://github.com/kennedym-ds/barebow_project/compare/v1.0.1...v1.0.2
[2026-02-13]: https://github.com/kennedym-ds/barebow_project/compare/v2026-02-11...v1.0.1
[2026-02-11]: https://github.com/kennedym-ds/barebow_project/compare/v2026-02-10...v2026-02-11
[2026-02-10]: https://github.com/kennedym-ds/barebow_project/compare/v2026-02-09...v2026-02-10
[2026-02-09]: https://github.com/kennedym-ds/barebow_project/compare/v2026-02-08...v2026-02-09
[2026-02-08]: https://github.com/kennedym-ds/barebow_project/compare/v2026-01-18...v2026-02-08
[2026-01-18]: https://github.com/kennedym-ds/barebow_project/compare/v2026-01-12...v2026-01-18
[2026-01-12]: https://github.com/kennedym-ds/barebow_project/compare/v2025-12-20...v2026-01-12
[2025-12-20]: https://github.com/kennedym-ds/barebow_project/releases/tag/v2025-12-20
