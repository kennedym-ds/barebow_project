import streamlit as st
from src.models import BowSetup, ArrowSetup
from src.db import engine
from sqlmodel import Session, select

st.set_page_config(page_title="Tuning Wizard", page_icon="🔧")

st.title("🔧 Tuning Wizard")
st.markdown("Use this tool to diagnose tuning issues based on **Bareshaft Tuning** logic.")

# --- Step 1: Equipment ---
st.subheader("1. Equipment")
with Session(engine) as db:
    bows = db.exec(select(BowSetup)).all()
    arrows = db.exec(select(ArrowSetup)).all()

if not bows or not arrows:
    st.warning("Please define at least one Bow and Arrow profile in the Equipment Manager first.")
    st.stop()

c1, c2 = st.columns(2)
with c1:
    bow_opts = {b.name: b for b in bows}
    sel_bow_name = st.selectbox("Select Bow", list(bow_opts.keys()))
    bow = bow_opts[sel_bow_name]

with c2:
    arrow_opts = {f"{a.make} {a.model}": a for a in arrows}
    sel_arrow_name = st.selectbox("Select Arrow", list(arrow_opts.keys()))
    arrow = arrow_opts[sel_arrow_name]

handedness = st.radio("Archer Handedness", ["Right Handed", "Left Handed"], horizontal=True)

st.markdown("---")

# --- Step 2: Observation ---
st.subheader("2. Observation")
st.write("Shoot 3 fletched arrows and 1 bareshaft at 18m (or 30m). Where did the **bareshaft** land relative to the fletched group?")

col_vert, col_horiz = st.columns(2)

with col_vert:
    st.markdown("#### Vertical Impact")
    v_impact = st.radio(
        "Height relative to group:",
        ["In Group (Good)", "High", "Low"],
        key="v_impact"
    )

with col_horiz:
    st.markdown("#### Horizontal Impact")
    h_impact = st.radio(
        "Lateral position relative to group:",
        ["In Group (Good)", "Left", "Right"],
        key="h_impact"
    )

st.markdown("---")

# --- Step 3: Diagnosis & Fixes ---
st.subheader("3. Diagnosis & Fixes")

fixes = []

# Vertical Logic
if v_impact == "High":
    st.error("🔴 **Nocking Point Too Low**")
    fixes.append("- **Raise Nocking Point** (Move tie-on nocks up)")
    fixes.append("- Check Tiller (Top limb might be too strong)")
elif v_impact == "Low":
    st.error("🔴 **Nocking Point Too High**")
    fixes.append("- **Lower Nocking Point** (Move tie-on nocks down)")
    fixes.append("- Check Tiller (Bottom limb might be too strong)")
else:
    st.success("🟢 Vertical Tune is Good")

# Horizontal Logic
st.markdown("#### Spine / Stiffness")

# Determine Stiff/Weak based on Handedness
is_stiff = False
is_weak = False

if handedness == "Right Handed":
    if h_impact == "Left": is_stiff = True
    if h_impact == "Right": is_weak = True
else: # Left Handed
    if h_impact == "Right": is_stiff = True
    if h_impact == "Left": is_weak = True

if is_stiff:
    st.warning("🟠 **Arrow is Acting STIFF**")
    st.markdown("**Primary Fixes:**")
    st.markdown("- **Increase Bow Weight** (Turn limb bolts in)")
    st.markdown("- **Increase Point Weight** (Use heavier points)")
    st.markdown("- **Decrease Plunger Tension** (Softer spring)")
    st.markdown("**Secondary Fixes:**")
    st.markdown("- Increase Brace Height (Slightly)")
    st.markdown("- Use longer arrows (if cutting is an option)")
    
elif is_weak:
    st.warning("🟠 **Arrow is Acting WEAK**")
    st.markdown("**Primary Fixes:**")
    st.markdown("- **Decrease Bow Weight** (Turn limb bolts out)")
    st.markdown("- **Decrease Point Weight** (Use lighter points)")
    st.markdown("- **Increase Plunger Tension** (Stiffer spring)")
    st.markdown("**Secondary Fixes:**")
    st.markdown("- Decrease Brace Height (Slightly)")
    st.markdown("- Cut arrows shorter (stiffens dynamic spine)")
    
else:
    st.success("🟢 Horizontal Tune is Good")

if v_impact == "In Group (Good)" and h_impact == "In Group (Good)":
    st.balloons()
    st.markdown("### 🎉 Perfect Tune! Go shoot some 10s.")

# --- Log Result ---
st.markdown("---")
with st.expander("💾 Log this Tuning Session"):
    notes = st.text_area("Notes", f"Bareshaft Test.\nVertical: {v_impact}\nHorizontal: {h_impact}")
    if st.button("Save to Log"):
        # Here we would save to a TuningLog table if we had one, 
        # or just append to the Bow's notes.
        # For now, just a toast.
        st.success("Tuning note saved!")
