# 🏹 BareTrack: Intelligent Barebow Analysis

BareTrack is a specialized analysis tool for Barebow archers, designed to move beyond simple scorekeeping and provide deep insights into the relationship between **Skill**, **Equipment**, and **Physics**.

## 🚀 Key Features

*   **The "Virtual Coach"**: Uses the **James Park Model** to separate your skill (angular deviation) from equipment errors (drag/drift).
*   **Setup Efficiency Scoring**: Analyzes your GPP (Grains Per Pound) and FOC to tell you if your arrows are tuned correctly for your discipline (Indoor vs. Outdoor).
*   **Physics-Aware Profiling**: Tracks critical barebow variables like Tiller, Plunger Tension, and Crawl.

## 🛠️ Installation & Running

This project is built with **Python** and **Streamlit**.

1.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

2.  **Run the App**:
    ```bash
    streamlit run Home.py
    ```

## 🧪 Running Tests

We use `pytest` for TDD.

```bash
python -m pytest
```

## 📂 Project Structure

*   `src/models.py`: Pydantic data models for Bows and Arrows.
*   `src/park_model.py`: The mathematical engine for score prediction and sigma calculation.
*   `src/physics.py`: Logic for GPP, FOC, and Setup Scoring.
*   `src/analysis.py`: The "Virtual Coach" logic that synthesizes all data.
*   `pages/`: Streamlit UI pages.
