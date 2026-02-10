# [ARCHIVED] Original Research Findings

> **⚠️ LEGACY ARTIFACT — DO NOT USE**  
> This document describes a "pivot to Streamlit" that **never happened**. The actual BareTrack implementation uses FastAPI + React from the start. Some WHY rationale (Park Model, crawl regression) remains valid and has been extracted to `docs/ARCHITECTURE.md`.  
> **Archived**: 2026-02-10  
> **For current architecture**, see root `README.md`.

---

# Research Findings & Project Context

## 1. Market Analysis & The "Barebow Gap"

### Existing Landscape
*   **Artemis Lite/Pro**: The gold standard for performance tracking, but highly complex and UI-heavy. Focuses on Olympic Recurve/Compound.
*   **MyTargets / Archery Success**: Good for scoring, but lack deep equipment analysis.
*   **Spreadsheets**: Most serious barebow archers still use Excel to track their crawl settings and tune data.

### The Identified Gap
Barebow archery relies on a unique "Triangle of Consistency":
1.  **Mechanical Execution** (Form)
2.  **Aiming Fidelity** (String Walking / Crawls)
3.  **Equipment Tuning** (Dynamic Spine Management)

Standard apps treat the sight setting as a single number. In Barebow, the "sight" is a complex relationship between:
*   **Crawl Height** (mm down the string)
*   **Face Size** (40cm vs 122cm)
*   **Distance** (18m vs 50m)
*   **Anchor Point**

**Finding:** A dedicated "Barebow App" must treat the **Crawl** as a first-class data citizen, not just a note field.

## 2. Technical Architecture Decisions

### The Pivot to Python
*   **Initial Attempt:** React/Node.js.
*   **Challenge:** High overhead for UI components and state management for complex mathematical models.
*   **Solution:** **Streamlit (Python)**.
*   **Reasoning:**
    *   **Rapid Prototyping:** UI is generated directly from the data script.
    *   **Native Math:** Direct access to `numpy` and `scipy` for regression models (crawls) and ballistics (Park Model).
    *   **Data Science Ready:** Easy integration with `pandas` and `plotly` for the analytics dashboard.

### Database Strategy
*   **Choice:** **SQLModel (SQLite)**.
*   **Reasoning:**
    *   Combines Pydantic validation with SQLAlchemy ORM.
    *   Single-file database (`baretrack.db`) makes the app portable and easy to back up.
    *   Strong typing ensures data integrity for critical physics calculations (e.g., preventing string inputs for draw weight).

## 3. Mathematical Models Implemented

### A. The James Park Model (Phase 2)
*   **Purpose:** To separate **Archer Skill** from **Equipment Efficiency**.
*   **Logic:**
    *   Uses two data points (Short Distance Score vs. Long Distance Score).
    *   Calculates a "Skill Level" based on the short distance (where drag is negligible).
    *   Predicts the long-distance score assuming zero drag.
    *   The difference between *Predicted* and *Actual* is the **Drag Loss**.
*   **Application:** Helps the user decide if they need to tune their arrows (reduce drag) or practice more (improve skill).

### B. Crawl Interpolation (Phase 3)
*   **Problem:** String walking crawls are not linear. The relationship between Distance and Crawl is a curve.
*   **Solution:** **Polynomial Regression (Degree 2)**.
*   **Implementation:**
    *   User inputs 3+ known marks (e.g., 10m, 30m, 50m).
    *   `numpy.polyfit` calculates the curve.
    *   The app generates a "Sight Tape" for every meter in between.

## 4. Key Data Points (The "Why")

| Variable | Why it matters for Barebow |
| :--- | :--- |
| **Draw Weight OTF** | "On The Fingers" weight is critical for dynamic spine. Marked limb weight is irrelevant. |
| **Negative Tiller** | String walkers often run negative tiller to compensate for the crawl. Standard apps often flag this as an error. |
| **Plunger Tension** | The primary micro-tuning tool. We track this to correlate group drift with tension changes. |
| **Visual Tab** | A unique visualization to help archers "see" their crawl on the actual tab face, reducing cognitive load during competition. |

## 5. Future Roadmap Recommendations

1.  **Computer Vision Scoring:** Use OpenCV to auto-score target faces from photos (Phase 6).
2.  **Weather Integration:** Correlate drag loss with wind speed/direction.
3.  **Export/Import:** Allow users to share "Setup Profiles" (e.g., "Indoor Setup" vs "Field Setup").
