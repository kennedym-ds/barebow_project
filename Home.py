import streamlit as st
from src.db import create_db_and_tables

# Initialize DB on app start
create_db_and_tables()

st.set_page_config(
    page_title="BareTrack",
    page_icon="🏹",
    layout="wide"
)

st.title("🏹 BareTrack: Intelligent Barebow Analysis")

st.markdown("""
### Welcome to the Future of Barebow
BareTrack is designed to move beyond simple scoring. We track the **physics** of your shot.

#### Key Features
*   **Equipment Profiling:** Track Tiller, Plunger Tension, and Dynamic Spine.
*   **Setup Scoring:** Get a "Stability Score" for your gear before you shoot.
*   **Crawl Manager:** Visualize your string walking crawls.
*   **Deep Analysis:** Correlate your tune to your group sizes.

👈 **Select a module from the sidebar to get started.**
""")

st.info("Status: Phase 1 (Data Models) Implemented. Ready for Equipment Entry.")
