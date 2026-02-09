# 🏹 BareTrack: Intelligent Barebow Analysis

BareTrack is a specialized analysis tool for Barebow archers, designed to move beyond simple scorekeeping and provide deep insights into the relationship between **Skill**, **Equipment**, and **Physics**.

## 🚀 Key Features

*   **The "Virtual Coach"**: Uses the **James Park Model** to separate your skill (angular deviation) from equipment errors (drag/drift).
*   **Setup Efficiency Scoring**: Analyzes your GPP (Grains Per Pound) and FOC to tell you if your arrows are tuned correctly for your discipline (Indoor vs. Outdoor).
*   **Physics-Aware Profiling**: Tracks critical barebow variables like Tiller, Plunger Tension, and Crawl.
*   **Interactive Session Logger**: Click-on-target scoring with real-time statistics.
*   **Crawl Manager**: Regression-based crawl mark prediction with visual charts.
*   **Analytics Dashboard**: CEP50, sigma tracking, and personal bests over time.
*   **Tuning Wizard**: Step-by-step barebow tuning guides.

## 🏗️ Architecture

Monorepo with a **FastAPI** backend and **React + TypeScript** frontend:

```
barebow_project/
├── src/              # Python domain logic (models, physics, analysis)
├── api/              # FastAPI REST API (34 endpoints)
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
├── tests/            # pytest suite (models, API endpoints)
└── tests/            # pytest suite (models, API endpoints)
```

## 🛠️ Getting Started

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

## 🧪 Running Tests

```bash
python -m pytest
```

Tests use in-memory SQLite with `StaticPool` for isolation — no database file needed.

## 📂 Key Modules

| Module | Purpose |
|---|---|
| `src/models.py` | SQLModel tables (BowSetup, ArrowSetup, Session, End, Shot, etc.) |
| `src/park_model.py` | James Park Model — score prediction & sigma calculation |
| `src/physics.py` | GPP, FOC, and setup efficiency scoring |
| `src/analysis.py` | "Virtual Coach" — synthesises physics + statistics |
| `src/crawls.py` | Crawl mark regression & prediction |
| `src/scoring.py` | Ring score calculation for WA & Flint target faces |
| `api/` | 34 REST endpoints wrapping the domain logic |
| `frontend/` | React SPA with Plotly.js interactive charts |


