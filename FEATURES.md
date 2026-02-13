# Features

Implemented features as of 2026-02-13 (v1.0.2).

---

## Core Workflow

### Equipment Management
- ✅ **Bow Profiles**: Track riser, limbs, draw weight, ATA length, brace height, tiller (top/bottom), nocking point, plunger settings, string specs
- ✅ **Arrow Profiles**: Make, model, spine, length, total weight, point weight, GPP/FOC auto-calculation, fletching config
- ✅ **Shaft Data CSV Upload**: Bulk import individual arrow shaft spine measurements
- ✅ **Tab Profiles**: Thickness, material, marks (comma-separated), image upload with calibration overlay
- ✅ **Equipment Selector**: Filter analytics by bow/arrow combination

### Session Logging
- ✅ **Interactive Target Face**: Click-on-target scoring with WA and Flint target faces
- ✅ **Hover Preview**: Arrow diameter circle + predicted score before clicking
- ✅ **Quiver Panel**: Select which arrows (1-12+) to log by number
- ✅ **Arrows-Per-End Selector**: 3, 5, 6, or 10 arrows per end
- ✅ **Real-Time Stats**: Running score, avg arrow, total score, ends completed
- ✅ **Round Presets**: 21 standard rounds (Portsmouth, Bray I/II, WA 18m/25m/30m/40m/50m/60m/70m, Lancaster, National, IFAA Flint, etc.) with auto-populated settings
- ✅ **Session Notes**: Free-text field for conditions, form observations, mental state

### Session History & Analysis
- ✅ **Session List**: Sortable/filterable list with score, date, round type
- ✅ **Detail View**: Full scorecard table, target heatmap, metadata
- ✅ **Session Replay**: End-by-end animation showing shot accumulation over time
- ✅ **CSV Export**: Download full shot data (Date, Round, End, Arrow, Score, X, Y, Is_X)
- ✅ **Delete Session**: With confirmation dialog

---

## Analytics & Visualization

### Basic Analytics
- ✅ **Score Progression**: Total session scores over time
- ✅ **Sigma Progression**: Radial standard deviation (cm) over time — skill metric independent of distance/face
- ✅ **CEP50**: Circular Error Probable at 50th percentile — median group radius
- ✅ **Personal Bests**: By round type with date achieved
- ✅ **Training Volume**: Total arrows shot per week/month
- ✅ **Score % of Maximum**: Percentage of perfect score for each session

### Advanced Analytics
- ✅ **Bias Analysis**: Mean Point of Impact (MPI) offset from center with horizontal/vertical decomposition
- ✅ **Precision Metrics**: Horizontal/Vertical ratio, sigma X vs sigma Y, group shape
- ✅ **Within-End Analysis**: First arrow effect, fatigue patterns, shot position trends
- ✅ **Hit Probability**: Estimated probability of hitting each ring (10, 9, 8, ..., M) based on current precision
- ✅ **Equipment Comparison**: Statistical comparison (Welch's t-test + Cohen's d) between bow/arrow setups
- ✅ **Trends Dashboard**: Score trend, sigma trend, arrow count, session frequency — all with LOESS smoothing

### Barebow-Specific Physics
- ✅ **James Park Model**: Separates archer skill (angular deviation) from equipment drag loss by comparing scores at two distances
- ✅ **Virtual Coach**: Synthesizes Park Model + setup efficiency + precision metrics into actionable recommendations
- ✅ **GPP/FOC Calculation**: Grains Per Pound and Front of Center — arrow efficiency metrics with safety warnings
- ✅ **Setup Efficiency Scoring**: Rates arrow build appropriateness for indoor vs outdoor shooting
- ✅ **Safety Check**: Warns if GPP < 7 (unsafe for bow) or other dangerous configurations

---

## Barebow String-Walking Tools

### Crawl Mark Management
- ✅ **Polynomial Regression**: Degree-2 curve fitting from 3+ known marks
- ✅ **Crawl Prediction**: Calculate crawl for any distance between 5m-60m
- ✅ **Lookup Chart**: Distance-to-crawl table with 1m granularity
- ✅ **Tab Image Overlay**: Upload photo of shooting tab, calibrate scale, view marks and predicted crawls as overlay lines
- ✅ **Print Crawl Card**: Printable reference chart with tab marks and distance lookup
- ✅ **Point-On Distance**: Polynomial root-finding calculates the distance where crawl = 0 (aim directly at target)

---

## Arrow Performance & Precision

### Per-Arrow Tracking
- ✅ **Arrow Performance Table**: Total shots, avg score, std dev, avg radius, X count, 10 count, miss count per arrow
- ✅ **Per-Arrow Heatmap**: Shot coordinates overlaid on target face, color-coded by arrow number
- ✅ **Arrow Selector**: Checkboxes to show/hide specific arrows on heatmap
- ✅ **Single-Arrow Focus**: When one arrow selected, display focused stats (avg score, total shots, avg radius, X's)
- ✅ **Alpha Shot Markers**: Shot dots rendered at 20% opacity to fade into background
- ✅ **Centre-of-Mass Markers**: × symbols show centroid per arrow in arrow's color
- ✅ **Density Heatmap Toggle**: Optional histogram2dcontour overlays per arrow (requires ≥3 shots)

### Precision Grouping
- ✅ **Composite Precision Score**: 60% avg_radius + 40% std_score normalized metric
- ✅ **Precision Ranking**: Arrows ranked 1-N by composite score
- ✅ **Tier Assignment**: Primary (top N for competition), Secondary (backup), Reserve (practice only)
- ✅ **Tier Cards**: Visual grouping with aggregate stats (avg score, avg radius, precision) per tier
- ✅ **Competition Set Callout**: Displays recommended arrow set with best combined precision
- ✅ **Tier Badges**: Color-coded badges (green/yellow/red) in sortable table

---

## Simulation & Goal Setting

### Score Prediction
- ✅ **Predict Score**: Given skill level (sigma) + distance + face size, calculate expected score
- ✅ **Score Goal Simulator**: Reverse Park Model — input target score, get required sigma/skill to achieve it
- ✅ **Hit Probability by Ring**: Monte Carlo simulation of score distribution based on fitted bivariate normal

---

## Dashboard & Navigation

### Home Dashboard
- ✅ **Summary Stats**: Total sessions, total arrows, best score, current avg arrow score
- ✅ **Recent Sessions**: Grid of last 6 sessions with scores, dates, round types
- ✅ **Personal Bests**: Top 3 scores by round type
- ✅ **Quick Actions**: Direct links to Session Logger, Equipment Profile, Analysis Lab, Crawl Manager

### Navigation
- ✅ **Sidebar Navigation**: Persistent nav with icons + labels, responsive hamburger menu for mobile
- ✅ **Sidebar Tooltips**: Hover tooltips on each nav item explaining the page's purpose
- ✅ **9 Routes**: Home, Equipment, Analysis Lab, Session Logger, History, Crawl Manager, Analytics, Tuning, Help

---

## UX & Theming

- ✅ **Dark Mode**: Full dark theme via CSS custom properties with Light/Dark/System toggle in sidebar
- ✅ **Error Boundary**: React error boundary with retry/home buttons prevents white-screen crashes
- ✅ **Toast Notifications**: Context-based toast system (success/error/warning/info) for user feedback
- ✅ **Help Page**: In-app guide with page descriptions, key archery concepts (Park Model, Crawl Marks, GPP/FOC), and contact info
- ✅ **Responsive Layout**: Hamburger menu and overlay sidebar for mobile/tablet viewports
- ✅ **Custom Favicon**: SVG target + arrow favicon with meta description and theme-color

---

## Testing & Quality

- ✅ **120 Tests**: pytest suite covering models, API endpoints (bows, arrows, tabs, sessions, scoring, analysis, crawls, analytics), Park Model, physics, crawls, precision metrics
- ✅ **In-Memory Testing**: StaticPool SQLite for isolated, fast tests
- ✅ **TypeScript Strict Mode**: Zero linting errors, full type safety in frontend
- ✅ **ESLint Flat Config**: TypeScript and React rules for consistent code style
- ✅ **Pydantic Validation**: Strong typing on all API request/response models

---

## Technical Features

### Backend (FastAPI + SQLModel)
- ✅ **49 REST Endpoints**: 9 router modules (analytics split into 4 sub-modules)
- ✅ **SQLite Database**: Single-file database (`baretrack.db`) with automatic schema creation
- ✅ **Structured Logging**: Request timing middleware, global exception handler, startup/shutdown lifecycle logs
- ✅ **CORS Configuration**: Secure cross-origin requests from frontend
- ✅ **String UUID Primary Keys**: Cascading deletes on parent-child relationships
- ✅ **Hot Reload**: `--reload-dir src --reload-dir api` watches only relevant directories
- ✅ **CI/CD Pipeline**: GitHub Actions for Python 3.11/3.12 matrix + frontend build/lint/type-check

### Frontend (React + TypeScript + Vite)
- ✅ **TanStack Query**: Optimistic updates, automatic cache invalidation, retry logic
- ✅ **Code Splitting**: Plotly.js lazy-loaded to reduce initial bundle size
- ✅ **Vite Proxy**: `/api` requests proxied to backend on port 8000
- ✅ **React Router v7**: Client-side routing with 9 pages
- ✅ **Plotly.js**: Interactive charts (scatter plots, line charts, heatmaps, confidence ellipses)
- ✅ **Dark Mode Toggle**: Light/Dark/System theme with localStorage persistence
- ✅ **Error Boundary & Toasts**: Graceful error recovery and contextual notifications

---

## Documentation

- ✅ **Root README**: Architecture overview, getting started, key modules
- ✅ **Frontend README**: Tech stack, routes, API integration patterns
- ✅ **CHANGELOG**: Full feature timeline with dates
- ✅ **Copilot Instructions**: Comprehensive developer guidance for architecture, conventions, patterns
- ✅ **Research Artifacts**: Competitive landscape, barebow archer needs, advanced analytics proposals (clearly marked as research, not implementation)
- ✅ **Getting Started Guide**: 5-minute setup walkthrough
- ✅ **User Guide**: Full feature walkthrough with glossary

---

## Known Limitations

- ❌ **Multi-Distance Sessions**: Field archery rounds with variable distances per target not yet supported
- ❌ **Mobile/Offline**: Web SPA requires running backend; no PWA or offline capability yet
- ❌ **Weather Logging**: No conditions tracking (wind, temperature, light)
- ❌ **Social Features**: No club integration, coach-student sharing, or leaderboards
- ❌ **Camera Auto-Scoring**: No computer vision for automatic target face scoring
- ❌ **Smartwatch Support**: No companion app for Apple Watch / Wear OS
- ❌ **Data Sync**: No cloud backup or cross-device sync

See `artifacts/research/barebow-archer-needs.md` for prioritized roadmap.

---

**Last Updated**: 2026-02-13  
**Test Coverage**: 120 tests passing
