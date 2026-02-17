# BareTrack

Barebow archery analysis tool. Tracks sessions, analyzes precision, calculates crawl marks for string-walking. Runs on Windows desktop and Android.

New to BareTrack? See the [Getting Started](docs/getting-started.md) guide.
For a full walkthrough of every feature, see the [User Guide](docs/user-guide.md).

## Download

### Windows Desktop

1. Download the latest installer from **[Releases](https://github.com/kennedym-ds/barebow_project/releases/latest)**
2. Run the installer and follow the prompts
3. Launch BareTrack from the Start Menu

**Requirements:** Windows 10 or later (64-bit). WebView2 runtime is required (pre-installed on Windows 10 1803+ and all Windows 11).

### Android

1. Download the APK from **[Releases](https://github.com/kennedym-ds/barebow_project/releases/latest)**
2. Enable "Install from unknown sources" in Settings
3. Open the APK to install

**Requirements:** Android 7.0 (API 24) or later.

Your data is stored locally on-device — nothing is sent to the cloud.

## Key Features

* **James Park Model Analysis**: Separates archer skill (angular deviation) from equipment drag loss using two-distance comparison.
* **Setup Efficiency**: GPP (Grains Per Pound) and FOC calculations with safety checks.
* **Equipment Tracking**: Bow/arrow/tab profiles with detailed specifications (tiller, plunger, brace height, etc.).
* **Session Logger**: Click-on-target scoring with WA and Flint target faces.
* **Crawl Manager**: Polynomial regression predicts crawl marks from known distances. Includes point-on distance calculation.
* **Analytics**: CEP50, sigma tracking, arrow precision tiers, personal bests, bias analysis, within-end patterns.
* **Per-Arrow Analysis**: Heatmaps with density overlays, centre-of-mass markers, precision grouping (Primary/Secondary/Reserve).
* **Trajectory Prediction**: Bisection solver for optimal launch angle with wind drift analysis.
* **Shaft Analytics**: Automatic grading, group stats, outlier detection, set optimizer, and find-similar-arrows.

## Architecture

Self-contained **Tauri 2** app with an embedded SQLite database (sql.js WASM). No backend server required.

```text
barebow_project/
├── frontend/             # Vite + React + TypeScript SPA
│   ├── src/
│   │   ├── db/           # sql.js database layer (schema, repos, persistence)
│   │   ├── services/     # Business logic (name generation, analytics)
│   │   ├── domain/       # Pure TS domain logic (physics, scoring, crawls)
│   │   ├── api/          # TanStack Query hooks wrapping services
│   │   ├── components/   # Shared UI (Layout, NavSidebar, TargetFace)
│   │   ├── pages/        # Route pages
│   │   └── types/        # TypeScript interfaces
│   ├── src-tauri/        # Tauri 2 Rust shell + Android/desktop config
│   └── public/           # Static assets (sql-wasm.wasm)
├── scripts/              # Build scripts (desktop, Android)
├── docs/                 # User guide, getting started
└── assets/               # App icon
```

## Getting Started (Development)

### Prerequisites

* Node.js 18+
* Rust (for Tauri builds)
* Android SDK + NDK 27 + JDK 21 (for Android builds)

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Start Development Server

```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The app runs in browser mode with an in-memory database (no persistence).

### 3. Desktop Development (Tauri)

```bash
cd frontend
npx tauri dev
```

### 4. Build for Production

**Windows desktop:**
```bash
cd frontend
npx tauri build
```

**Android APK:**
```bash
cd frontend
npx tauri android build --debug --target aarch64
```

## Key Modules

| Module | Purpose |
| --- | --- |
| `frontend/src/db/schema.sql` | SQLite schema (bowsetup, arrowsetup, session, etc.) |
| `frontend/src/db/database.ts` | sql.js singleton, `runParams()`, UUID generation |
| `frontend/src/db/repos/` | CRUD repositories for each table |
| `frontend/src/services/` | Business logic wrapping repositories |
| `frontend/src/domain/physics.ts` | GPP, FOC, dynamic spine, natural frequency |
| `frontend/src/domain/scoring.ts` | Ring score calculation for WA & Flint faces |
| `frontend/src/domain/crawls.ts` | Crawl mark regression & prediction |
| `frontend/src/domain/analysis.ts` | Virtual Coach — physics + statistics synthesis |
| `frontend/src/domain/arrowAnalytics.ts` | Shaft grading, outlier detection, set optimizer |

## Routes

| Route | Page | Purpose |
| --- | --- | --- |
| `/` | Dashboard Home | Personal bests, recent sessions, equipment status |
| `/equipment` | Equipment Profile | Manage bows, arrows, tabs, and setups |
| `/analysis` | Analysis Lab | Park Model, score predictions, arrow performance |
| `/session` | Session Logger | Real-time scoring with click-on-target interface |
| `/history` | Session History | Session replay, notes, and CSV export |
| `/crawls` | Crawl Manager | Crawl mark prediction with sight tape, Point-On calculator |
| `/analytics` | Analytics Dashboard | CEP50, sigma tracking, arrow precision tiers, trends |
| `/tuning` | Tuning Wizard | Step-by-step barebow tuning guides |
| `/help` | Help | App guide, key concepts, and contact info |

## Documentation

| Document | Description |
| --- | --- |
| [Getting Started](docs/getting-started.md) | 5-minute setup and first session |
| [User Guide](docs/user-guide.md) | Full walkthrough of every feature |
| [FEATURES.md](FEATURES.md) | Complete feature checklist |
| [CHANGELOG.md](CHANGELOG.md) | Version history and release notes |
