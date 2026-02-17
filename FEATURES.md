# Features

Implemented features as of 2026-06-29 (v2.0.0).

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
- ✅ **Energy-Corrected Dynamic Spine**: Multiplicative model (Euler-Bernoulli beam theory + energy balance) replacing Stu Miller additive corrections
- ✅ **Arrow Natural Frequency**: Free-free beam vibration analysis from spine, shaft diameter, and total weight
- ✅ **Spine-Frequency Match**: Kooi-Bergman timing analysis — verifies ~1 oscillation during power stroke
- ✅ **Effective Draw Weight**: Brace height, draw length, and strand count corrections displayed in spine check

### Trajectory & Ballistics
- ✅ **Trajectory Prediction**: Bisection solver for optimal launch angle at any distance/elevation
- ✅ **Trajectory Visualization**: Interactive arc plot with max height, time of flight, impact velocity, impact angle
- ✅ **Drop Table**: Arrow drop at 10m, 20m, 30m, 40m, 50m, 60m, 70m
- ✅ **Wind Drift Analysis**: Crosswind deflection in cm and ring impact, with aim-off direction advice
- ✅ **Uphill/Downhill Shooting**: Target elevation angle as input for angled shots

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

### Shaft Analytics
- ✅ **Shaft Grading**: Automatic A/B/C/D grading based on weight tolerance and straightness
- ✅ **Group Statistics**: Mean, std, range, CV% for weight, spine, and straightness across shaft set
- ✅ **Outlier Detection**: Z-score-based identification of shafts outside the group norm
- ✅ **Set Optimizer**: Find optimal N-arrow subsets ranked by combined weight + spine + straightness consistency
- ✅ **Find Similar Arrows**: Locate closest-matching shafts to reference arrows by weighted Euclidean distance
- ✅ **Arrow Charts**: Weight distribution, spine distribution, weight-vs-spine scatter plots

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

- ✅ **TypeScript Strict Mode**: Zero linting errors, full type safety in frontend
- ✅ **ESLint Flat Config**: TypeScript and React rules for consistent code style
- ✅ **CI/CD Pipeline**: GitHub Actions for frontend lint/typecheck/build + Tauri desktop build on Windows

---

## Technical Features

### Platform (Tauri 2)
- ✅ **Windows Desktop**: Native window via Tauri 2 with NSIS installer
- ✅ **Android**: Native APK via Tauri 2 mobile target (Android 7.0+)
- ✅ **sql.js (WASM SQLite)**: Embedded database running entirely client-side
- ✅ **Tauri FS Persistence**: Database file saved/loaded via `@tauri-apps/plugin-fs` to AppData
- ✅ **Legacy Migration**: Automatic import of old pywebview database on first launch
- ✅ **`runParams()` Pattern**: Explicit prepare/bind/step/free for sql.js — required for Android WebView WASM compatibility
- ✅ **String UUID Primary Keys**: Cascading deletes on parent-child relationships
- ✅ **Android Safe Area**: Status bar and navigation bar padding via CSS env() variables

### Frontend (React + TypeScript + Vite)
- ✅ **TanStack Query**: Optimistic updates, automatic cache invalidation, retry logic
- ✅ **Service Layer**: Business logic in services wrapping sql.js repositories (no HTTP)
- ✅ **Code Splitting**: Plotly.js lazy-loaded to reduce initial bundle size
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
- ❌ **Weather Logging**: No conditions tracking (wind, temperature, light)
- ❌ **Social Features**: No club integration, coach-student sharing, or leaderboards
- ❌ **Camera Auto-Scoring**: No computer vision for automatic target face scoring
- ❌ **Smartwatch Support**: No companion app for Apple Watch / Wear OS
- ❌ **Data Sync**: No cloud backup or cross-device sync
- ❌ **iOS Support**: Tauri 2 supports iOS but not yet configured

See `artifacts/research/barebow-archer-needs.md` for prioritized roadmap.

---

**Last Updated**: 2026-06-29
**Platform**: Windows Desktop + Android (Tauri 2)
