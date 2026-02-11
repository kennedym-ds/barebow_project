# BareTrack User Guide

A complete walkthrough of every feature in BareTrack — the barebow archery analysis tool.

## Table of Contents

- [Overview](#overview)
- [Dashboard](#dashboard)
- [Equipment Profile](#equipment-profile)
  - [Bows](#bows)
  - [Arrows](#arrows)
  - [Tabs](#tabs)
- [Session Logger](#session-logger)
  - [Round Presets](#round-presets)
  - [Scoring on the Target Face](#scoring-on-the-target-face)
  - [Quiver and Arrow Selection](#quiver-and-arrow-selection)
- [Session History](#session-history)
  - [Scorecard and Heatmap](#scorecard-and-heatmap)
  - [Session Replay](#session-replay)
  - [CSV Export](#csv-export)
- [Analytics Dashboard](#analytics-dashboard)
  - [Score Progression](#score-progression)
  - [Sigma Progression](#sigma-progression)
  - [Precision Metrics](#precision-metrics)
  - [Personal Bests](#personal-bests)
  - [Bias Analysis](#bias-analysis)
  - [Within-End Analysis](#within-end-analysis)
  - [Hit Probability](#hit-probability)
  - [Equipment Comparison](#equipment-comparison)
  - [Trends](#trends)
- [Analysis Lab](#analysis-lab)
  - [Single-Distance Analysis](#single-distance-analysis)
  - [Cross-Distance (Park Model)](#cross-distance-park-model)
  - [Score Goal Simulator](#score-goal-simulator)
  - [Per-Arrow Performance](#per-arrow-performance)
  - [Arrow Precision Tiers](#arrow-precision-tiers)
- [Crawl Manager](#crawl-manager)
  - [Entering Crawl Marks](#entering-crawl-marks)
  - [Predicting Marks](#predicting-marks)
  - [Point-On Distance](#point-on-distance)
  - [Tab Image Overlay](#tab-image-overlay)
  - [Print Crawl Card](#print-crawl-card)
- [Tuning Wizard](#tuning-wizard)
- [Desktop App](#desktop-app)
- [Tips and Workflows](#tips-and-workflows)

---

## Overview

BareTrack is built for barebow archers who want to track their shooting, analyze precision, and manage crawl marks. It runs as a local web app — your data stays on your machine in an SQLite database file (`baretrack.db`).

The app has 8 pages, accessible from the sidebar:

| Page | What It Does |
|------|-------------|
| **Dashboard** | Summary stats, recent sessions, personal bests |
| **Equipment** | Manage bow, arrow, and tab profiles |
| **Analysis Lab** | Park Model, arrow performance, score predictions |
| **Session Logger** | Score a round by clicking on a target face |
| **History** | Review past sessions, replay, export |
| **Crawl Manager** | String-walking crawl marks and predictions |
| **Analytics** | Charts and trends across all sessions |
| **Tuning** | Step-by-step barebow tuning guides |

---

## Dashboard

The home page shows a summary of your shooting:

- **Total Sessions** and **Total Arrows** shot
- **Best Score** overall
- **Current Average Arrow Score**
- **Recent Sessions** — your last 6 sessions with scores and round types
- **Personal Bests** — top 3 scores by round type
- **Quick Actions** — direct links to Session Logger, Equipment, Analysis Lab, and Crawl Manager

The dashboard updates automatically as you log sessions.

---

## Equipment Profile

Manage your bow, arrow, and tab setups. The equipment you create here is linked to sessions and used for filtering analytics.

### Bows

Click **Add Bow** to create a profile. Available fields:

| Field | Description |
|-------|-------------|
| Name | Required. e.g. "Gillo GQ 25" + ILF limbs" |
| Riser | Riser model name |
| Limbs | Limb model and weight |
| Draw Weight (lbs) | At your draw length — used for GPP calculation |
| ATA Length (in) | Axle-to-axle length |
| Brace Height (in) | String-to-grip distance |
| Tiller Top/Bottom (mm) | Tiller measurements |
| Nocking Point | Position description |
| Plunger | Plunger model and setting |
| String | String material, strand count, etc. |

All fields except Name are optional. Fill in what you know — the more data you enter, the more useful the physics calculations become (GPP, setup efficiency).

### Arrows

Click **Add Arrow** to create a profile. Key fields:

| Field | Description |
|-------|-------------|
| Make / Model | e.g. "Easton X7 2014" |
| Spine | Spine rating (e.g. 820, 1000) |
| Length (in) | Cut length |
| Total Weight (gr) | Total arrow weight in grains |
| Point Weight (gr) | Point/insert weight in grains |
| Fletching | Vane/feather description |

When you enter total arrow weight and have a bow with draw weight set, BareTrack automatically calculates:

- **GPP** (Grains Per Pound) — arrow weight divided by bow draw weight. Below 7 GPP triggers a safety warning.
- **FOC** (Front of Center) — balance point as a percentage of arrow length from the midpoint.

#### Shaft Data Upload

If you have individual shaft spine measurements (e.g. from a spine tester), click **Upload Shaft Data** to import a CSV file. The CSV should have columns for each shaft's spine reading. This data is used in the per-arrow analytics.

### Tabs

Click **Add Tab** to create a tab profile:

| Field | Description |
|-------|-------------|
| Name | Required |
| Thickness (mm) | Tab leather/face thickness |
| Material | e.g. "Cordovan" |
| Marks | Comma-separated crawl mark positions |

You can upload a photo of your tab for the crawl mark overlay feature (see [Crawl Manager](#crawl-manager)).

---

## Session Logger

Score a round by clicking on an interactive target face.

### Round Presets

Select a round from the dropdown to auto-fill settings. BareTrack includes 21 presets:

**Indoor:**
- WA 18m (Indoor) — 40 cm face, 3 arrows/end, 60 arrows
- WA 25m (Indoor) — 60 cm face, 3 arrows/end, 60 arrows
- Portsmouth — 18m, 60 cm face, 3 arrows/end, 60 arrows
- Bray I — 18m, 40 cm face, 3 arrows/end, 30 arrows
- Bray II — 25m, 60 cm face, 3 arrows/end, 30 arrows
- Lancaster Quali — 18m, 40 cm face, 3 arrows/end, 60 arrows (X = 11)
- IFAA Flint (Indoor) — 20m, 35 cm face, 4 arrows/end, 56 arrows

**Outdoor:**
- WA 30m — 80 cm face, 6 arrows/end, 36 arrows
- WA 40m — 80 cm face, 6 arrows/end, 36 arrows
- WA 50m (Barebow) — 122 cm face, 6 arrows/end, 72 arrows
- WA 60m — 122 cm face, 6 arrows/end, 36 arrows
- WA 70m (Recurve) — 122 cm face, 6 arrows/end, 72 arrows
- Half WA 50m — 122 cm face, 6 arrows/end, 36 arrows

**National / Practice:**
- National (Barebow) — 50m, 122 cm face, 6 arrows/end, 48 arrows
- Short National — 40m, 122 cm face, 6 arrows/end, 48 arrows
- Practice (30 arrows) — 18m, 40 cm face, 3 arrows/end, 30 arrows
- Custom — set your own distance, face size, and arrow count

Select **Custom** to manually configure any combination.

### Scoring on the Target Face

1. Click where the arrow landed on the target face. A hover preview shows the arrow diameter circle and predicted score before you click.
2. The score is calculated from the click coordinates using WA or Flint ring geometry.
3. A running total updates in real time — score, average arrow, ends completed.
4. After placing all arrows for the end, click **Save End**.
5. When all ends are complete, click **Finish Session**.

### Quiver and Arrow Selection

Use the quiver panel to select which numbered arrow (1–12+) you're logging for each shot. This enables per-arrow analytics later — you can track which individual arrows perform best.

Set **Arrows Per End** to 3, 5, 6, or 10 from the dropdown.

### Session Notes

Add free-text notes to any session — record conditions (wind, light), form observations, mental state, or anything useful for later review.

---

## Session History

View all past sessions sorted by date.

### Scorecard and Heatmap

Click a session to see its detail view:

- **Scorecard** — End-by-end score table with totals and running score
- **Heatmap** — All shots plotted on the target face, color-coded by end or arrow number
- **Metadata** — Date, round type, distance, equipment used, notes

### Session Replay

Click **Replay** to watch the session end-by-end. Shots appear on the target in the order they were logged.

### CSV Export

Click **Export CSV** to download the full shot data. The CSV includes:

| Column | Description |
|--------|-------------|
| Date | Session date |
| Round | Round type name |
| End | End number |
| Arrow | Arrow number in quiver |
| Score | Ring score |
| X | Horizontal coordinate (cm from centre) |
| Y | Vertical coordinate (cm from centre) |
| Is_X | Whether the shot scored an inner X |

---

## Analytics Dashboard

The Analytics page shows charts and metrics across all your sessions. Use the date range filters and equipment selector to narrow the data.

### Score Progression

Line chart of total session scores over time. Shows improvement trends.

### Sigma Progression

Tracks radial standard deviation (sigma, in cm) over time. Sigma is a distance-independent measure of your precision — lower is better. This is the single most useful metric for tracking skill improvement.

### Precision Metrics

- **CEP50** — Circular Error Probable at 50th percentile. The radius of a circle containing half your shots.
- **Sigma X / Sigma Y** — Horizontal vs vertical precision breakdown.
- **H/V Ratio** — The ratio of horizontal to vertical dispersion. Values far from 1.0 indicate a directional bias in your grouping.

### Personal Bests

Top scores by round type with date achieved.

### Bias Analysis

Shows your Mean Point of Impact (MPI) — the average offset of your shots from the centre:

- **Horizontal bias** — left/right tendency
- **Vertical bias** — high/low tendency
- **Overall MPI distance** — how far off-centre your group average is

Use this to adjust your sight (crawl marks) or form.

### Within-End Analysis

Examines patterns across arrow positions within each end:

- **First-arrow effect** — Do your first arrows tend to score differently?
- **Fatigue patterns** — Does accuracy drop toward the end of each end?
- **Shot position trends** — Average score by arrow position (1st, 2nd, 3rd, etc.)

### Hit Probability

Given your current precision (sigma), estimates the probability of hitting each ring (10, 9, 8, ..., miss) on the specified target face. Useful for setting realistic score expectations.

### Equipment Comparison

Statistically compares performance between two bow/arrow setups using:

- **Welch's t-test** — Tests whether the difference is statistically significant
- **Cohen's d** — Measures the practical size of the difference

Filter by date range to compare equipment during specific periods.

### Trends

LOESS-smoothed trend lines for:

- Score trend
- Sigma trend
- Arrow count per session
- Session frequency

---

## Analysis Lab

The Analysis Lab has two tabs: **Single Distance** and **Cross Distance**, plus tools for score predictions and per-arrow analytics.

### Single-Distance Analysis

Detailed precision analysis for sessions at one distance. Includes:

- Advanced precision metrics (CEP50, sigma X/Y, H/V ratio, MPI)
- Bias analysis chart
- Trend charts over time
- Within-end shot patterns
- Hit probability distribution

### Cross-Distance (Park Model)

The **James Park Model** separates two components of your shooting:

1. **Angular deviation (sigma_theta)** — your aiming precision, independent of distance
2. **Drag loss** — how much your equipment's arrow trajectory drops compared to a theoretical flat-shooting setup

To use it, you need sessions at two different distances with the same equipment. The model compares the scores to isolate skill from equipment performance.

This is the core barebow-specific analysis that BareTrack provides — most scoring apps can't distinguish between "I aimed badly" and "my arrows don't fly flat enough."

### Score Goal Simulator

Reverse Park Model calculation:

1. Enter a target score (e.g. 250/300 on a WA 18m round)
2. BareTrack calculates the sigma (precision) you need to achieve that score
3. Compare against your current sigma to see how much improvement is needed

### Per-Arrow Performance

When you log shots with arrow numbers, this section shows:

- **Performance table** — Total shots, avg score, std dev, avg radius, X count, 10 count, miss count per arrow
- **Heatmap** — Shot coordinates overlaid on the target face, color-coded by arrow number
- **Centre of mass** — × markers showing each arrow's average impact point
- **Density overlay** — Optional histogram contour for arrows with 3+ shots

### Arrow Precision Tiers

BareTrack automatically ranks your arrows by a composite precision score:

**Composite Score** = 60% avg_radius + 40% std_score (normalized)

Arrows are classified into tiers:

| Tier | Color | Description |
|------|-------|-------------|
| **Primary** | Green | Your best arrows — use for competition |
| **Secondary** | Yellow | Good arrows — suitable as backup |
| **Reserve** | Red | Practice arrows only |

The **Competition Set Callout** shows the recommended set of arrows with the best combined precision.

---

## Crawl Manager

For barebow archers who use string-walking, the Crawl Manager predicts crawl mark positions for any distance.

### Entering Crawl Marks

Enter at least 3 known crawl marks — pairs of distance (metres) and crawl position (mm from nocking point, or your preferred unit). More data points give a better curve fit.

### Predicting Marks

BareTrack fits a degree-2 polynomial to your known marks and predicts the crawl for any distance between 5–60 m. The prediction chart shows:

- Your known marks as data points
- The fitted polynomial curve
- Predicted crawl values at any queried distance
- A lookup table with 1 m granularity

### Point-On Distance

The polynomial root-finding calculates the distance where crawl = 0 — the distance at which you aim directly at the target without any string-walk offset. Displayed automatically when your crawl data spans the zero crossing.

### Tab Image Overlay

1. Upload a photo of your shooting tab.
2. Set scale calibration (pixels per mm).
3. BareTrack overlays your known crawl marks and predicted positions as horizontal lines on the tab image.

This gives a visual reference for where marks should be placed.

### Print Crawl Card

Generate a printable crawl reference card with:

- Distance-to-crawl lookup table
- Tab mark positions
- Your polynomial curve coefficients

Print it and take it to the range.

---

## Tuning Wizard

Step-by-step guides for barebow tuning procedures. Covers common tuning workflows for setting up a barebow rig. This section is still being expanded.

---

## Desktop App

BareTrack can run as a standalone Windows desktop application using pywebview.

### Running in Dev Mode

```bash
python desktop.py
```

This launches the FastAPI backend in a background thread and opens a native Windows window.

### Building a Standalone Executable

```bash
# Build frontend first
cd frontend && npm run build && cd ..

# Package with PyInstaller
powershell -ExecutionPolicy Bypass -File scripts/build-desktop.ps1
```

The executable is output to `dist/BareTrack/BareTrack.exe`. It bundles the API server, frontend assets, and Python runtime — no installation required on the target machine.

User data (database, uploads) is stored in `%LOCALAPPDATA%/BareTrack/` when running the packaged app.

---

## Tips and Workflows

### Building a Useful Dataset

- Log at least **5–10 sessions** before relying on analytics trends. More data = more reliable patterns.
- Use the same equipment setup across sessions to get meaningful comparisons.
- Always assign **arrow numbers** if you want per-arrow analytics.
- Add **session notes** about conditions — they help explain outlier sessions later.

### Improving Your Score

1. Check **sigma progression** in Analytics — it's the most honest measure of precision improvement.
2. Use **bias analysis** to identify consistent aiming errors (e.g. always shooting left-low).
3. Review **within-end patterns** — if your first arrow is consistently worse, it might indicate a warm-up issue.
4. Use the **score goal simulator** to set realistic targets based on your current precision.

### Comparing Equipment

1. Shoot multiple sessions with setup A, then switch to setup B and shoot the same round.
2. Go to Analytics → **Equipment Comparison** and select the two setups.
3. Check the p-value and Cohen's d to see if the difference is real or just noise.

### String-Walking Workflow

1. Find crawl marks at 3+ known distances (e.g. 10m, 18m, 30m) by trial and error on the range.
2. Enter them in **Crawl Manager**.
3. Use the predictions for distances you haven't tested.
4. Print a crawl card and take it to competitions.
5. After each competition, verify and update marks if needed.

### Exporting Data

- **CSV Export**: Download full shot data from any session in History. Works for offline analysis in spreadsheets or external tools.
- **Database**: The raw data lives in `baretrack.db` (SQLite). You can query it directly with any SQLite tool if you want custom analysis.

---

## Glossary

| Term | Definition |
|------|-----------|
| **CEP50** | Circular Error Probable — radius of a circle containing 50% of shots |
| **Crawl** | The distance you walk your fingers down the string for string-walking at a given distance |
| **FOC** | Front of Center — how far forward of the midpoint an arrow balances, as a percentage |
| **GPP** | Grains Per Pound — arrow weight (grains) divided by bow draw weight (lbs) |
| **MPI** | Mean Point of Impact — the average landing point of your shots relative to centre |
| **Point-on** | The distance at which crawl = 0, so you aim directly at the target |
| **Sigma** | Radial standard deviation of shot positions — lower = tighter grouping |
| **String-walking** | Barebow aiming technique where you move your tab fingers along the string to change elevation |

---

*Last updated: 2026-02-11*
