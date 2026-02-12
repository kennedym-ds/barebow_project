# BareTrack

Barebow archery analysis tool. Tracks sessions, analyzes precision, calculates crawl marks for string-walking.

New to BareTrack? See the [Getting Started](docs/getting-started.md) guide.  
For a full walkthrough of every feature, see the [User Guide](docs/user-guide.md).

## Download

**No coding required** — install BareTrack like any other Windows app:

1. Download **[BareTrackSetup.exe](https://github.com/kennedym-ds/barebow_project/releases/latest/download/BareTrackSetup.exe)**
2. Run the installer and follow the prompts
3. Launch BareTrack from the Start Menu or Desktop shortcut

**Requirements:** Windows 10 or later (64-bit). WebView2 runtime is required (pre-installed on Windows 10 1803+ and Windows 11).

Your data is stored locally in `%LOCALAPPDATA%\BareTrack\baretrack.db` — nothing is sent to the cloud.

> For developers who want to run from source, see [Getting Started](#getting-started) below.

## Key Features

*   **James Park Model Analysis**: Separates archer skill (angular deviation) from equipment drag loss using two-distance comparison.
*   **Setup Efficiency**: GPP (Grains Per Pound) and FOC calculations with safety checks.
*   **Equipment Tracking**: Bow/arrow/tab profiles with detailed specifications (tiller, plunger, brace height, etc.).
*   **Session Logger**: Click-on-target scoring with WA and Flint target faces.
*   **Crawl Manager**: Polynomial regression predicts crawl marks from known distances. Includes point-on distance calculation.
*   **Analytics**: CEP50, sigma tracking, arrow precision tiers, personal bests, bias analysis, within-end patterns.
*   **Per-Arrow Analysis**: Heatmaps with density overlays, centre-of-mass markers, precision grouping (Primary/Secondary/Reserve).

## Architecture

Monorepo with a **FastAPI** backend and **React + TypeScript** frontend:

```
barebow_project/
├── src/              # Python domain logic (models, physics, analysis)
├── api/              # FastAPI REST API (49 endpoints across 9 routers)
│   ├── main.py       # App entry point, CORS, router mounting
│   ├── deps.py       # Database session dependency
│   └── routers/      # Route modules (bows, arrows, tabs, sessions, etc.)
├── frontend/         # Vite + React + TypeScript SPA
│   └── src/
│       ├── api/      # TanStack Query hooks
│       ├── components/  # Shared UI (Layout, NavSidebar, TargetFace)
│       ├── pages/    # Route pages
│       ├── types/    # TypeScript interfaces
│       └── utils/    # Client-side scoring
├── tests/            # pytest suite (93 tests)
├── docs/             # User guide, getting started, developer notes
├── desktop.py        # pywebview entry point for desktop app
└── seed_data.py      # Generate sample sessions for testing
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+

### 1. Set Up Python Virtual Environment

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate
```

### 2. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 3. Start the API Server

```bash
uvicorn api.main:app --reload --port 8000
```

The API docs are available at [http://localhost:8000/docs](http://localhost:8000/docs).

### 4. Start the Frontend Dev Server

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The frontend proxies `/api` requests to the FastAPI backend.

### Production Build

```bash
cd frontend
npm run build
```

The output is in `frontend/dist/` — serve it with any static file server behind the API.

## Running Tests

```bash
python -m pytest
```

Tests use in-memory SQLite with `StaticPool` for isolation — no database file needed.

## Key Modules

| Module | Purpose |
|---|---|
| `src/models.py` | SQLModel tables (BowSetup, ArrowSetup, Session, End, Shot, etc.) |
| `src/park_model.py` | James Park Model — score prediction & sigma calculation |
| `src/physics.py` | GPP, FOC, and setup efficiency scoring |
| `src/analysis.py` | "Virtual Coach" — synthesises physics + statistics |
| `src/crawls.py` | Crawl mark regression & prediction |
| `src/scoring.py` | Ring score calculation for WA & Flint target faces |
| `api/` | 49 REST endpoints wrapping the domain logic |
| `frontend/` | React SPA with Plotly.js interactive charts |

## Recent Features

*   **21 Round Presets**: Portsmouth, Bray I/II, WA indoor/outdoor, Lancaster, National, IFAA Flint, and more.
*   **CSV Data Export**: Download full session histories with shot coordinates, scores, and equipment settings.
*   **Point-On Distance Calculator**: Find the zero-crawl distance using polynomial root-finding.
*   **Per-Arrow Heatmaps**: Individual arrow performance with alpha-blended shot clusters, centre-of-mass markers, and optional density heatmap overlay.
*   **Arrow Precision Tiers**: Automatic classification of arrows as Primary (best), Secondary (good), or Reserve (training) based on composite precision metrics.
*   **Session Notes & Replay**: Annotate shooting sessions and replay arrow-by-arrow progress.
*   **Dashboard Home**: Personal bests, recent performance, and equipment status.
*   **Score Goal Simulator**: Predict scores for untested distances using the James Park Model.
*   **Desktop App**: Standalone Windows application via pywebview + PyInstaller.

## Routes

| Route | Page | Purpose |
|-------|------|----------|
| `/` | Dashboard Home | Personal bests, recent sessions, equipment status |
| `/equipment` | Equipment Profile | Manage bows, arrows, tabs, and setups |
| `/analysis` | Analysis Lab | Park Model, score predictions, arrow performance |
| `/session` | Session Logger | Real-time scoring with click-on-target interface |
| `/history` | Session History | Session replay, notes, and CSV export |
| `/crawls` | Crawl Manager | Crawl mark prediction with sight tape, Point-On calculator |
| `/analytics` | Analytics Dashboard | CEP50, sigma tracking, arrow precision tiers, trends |
| `/tuning` | Tuning Wizard | Step-by-step barebow tuning guides |

## Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](docs/getting-started.md) | 5-minute setup and first session |
| [User Guide](docs/user-guide.md) | Full walkthrough of every feature |
| [FEATURES.md](FEATURES.md) | Complete feature checklist |
| [CHANGELOG.md](CHANGELOG.md) | Version history and release notes |
| [Frontend README](frontend/README.md) | Frontend dev setup and conventions |
