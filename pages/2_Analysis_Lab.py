import streamlit as st
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from src.db import engine
from src.models import BowSetup, ArrowSetup, Session as SessionModel, End
from src.analysis import VirtualCoach

st.set_page_config(page_title="Virtual Coach Analysis", page_icon="🧪", layout="wide")

st.title("🧪 Virtual Coach Analysis")
st.markdown("""
This module uses the **James Park Model** to separate your **Skill** from your **Equipment** errors.
By comparing your performance at two different distances, we can calculate how much score you are losing to drag, drift, and tuning issues.
""")

# --- Helper Functions ---
def get_session_summary(session: SessionModel):
    """Returns a string summary and the calculated average score."""
    if not session.ends:
        return f"{session.date.strftime('%Y-%m-%d')} - {session.round_type} (No Shots)", 0.0
    
    total_score = sum(s.score for end in session.ends for s in end.shots)
    total_shots = sum(len(end.shots) for end in session.ends)
    avg = total_score / total_shots if total_shots > 0 else 0
    
    return f"{session.date.strftime('%Y-%m-%d')} - {session.round_type} ({session.distance_m}m): {avg:.2f} avg", avg

# --- Data Loading ---
with Session(engine) as db:
    bows = db.exec(select(BowSetup)).all()
    arrows = db.exec(select(ArrowSetup)).all()

# --- UI Layout ---
st.sidebar.header("Analysis Settings")
mode = st.sidebar.radio("Input Mode", ["Select from Database", "Manual Entry"])

# Equipment Selection (Required for both modes to check physics)
st.subheader("1. Equipment Profile")
col_eq1, col_eq2 = st.columns(2)

with col_eq1:
    bow_map = {b.name: b for b in bows}
    selected_bow_name = st.selectbox("Select Bow", options=list(bow_map.keys()) if bow_map else [])
    selected_bow = bow_map.get(selected_bow_name)

with col_eq2:
    arrow_map = {f"{a.make} {a.model} ({a.spine})": a for a in arrows}
    selected_arrow_name = st.selectbox("Select Arrow", options=list(arrow_map.keys()) if arrow_map else [])
    selected_arrow = arrow_map.get(selected_arrow_name)

if not selected_bow or not selected_arrow:
    st.warning("Please create Bow and Arrow profiles in the 'Equipment Profile' page first.")
    st.stop()

# --- Inputs based on Mode ---
st.subheader("2. Performance Data")

if mode == "Select from Database":
    # Efficiently fetch only relevant sessions from DB
    with Session(engine) as db:
        query = select(SessionModel).order_by(SessionModel.date.desc())

        # Apply filters in SQL
        if selected_bow:
            query = query.where((SessionModel.bow_id == selected_bow.id) | (SessionModel.bow_id == None))

        if selected_arrow:
            query = query.where((SessionModel.arrow_id == selected_arrow.id) | (SessionModel.arrow_id == None))

        # Eager load relationships
        query = query.options(selectinload(SessionModel.ends).selectinload(End.shots))

        filtered_sessions = db.exec(query).all()
    
    if not filtered_sessions:
        st.info("No recorded sessions match this equipment profile. Switching to Manual Entry might be needed.")
        
    s_map = {get_session_summary(s)[0]: s for s in filtered_sessions}
    
    col_s1, col_s2 = st.columns(2)
    
    with col_s1:
        st.markdown("**Short Distance (Baseline)**")
        # Default to a session with dist <= 30
        short_opts = [k for k, s in s_map.items() if s.distance_m <= 30]
        sel_short = st.selectbox("Select Short Session", options=short_opts)
        
        if sel_short:
            short_session = s_map[sel_short]
            _, short_avg = get_session_summary(short_session)
            st.metric("Short Average", f"{short_avg:.2f}")
            actual_short_dist = short_session.distance_m
            actual_short_face = short_session.target_face_size_cm
            actual_short_score = short_avg
        else:
            actual_short_score = None

    with col_s2:
        st.markdown("**Long Distance (Target)**")
        # Default to a session with dist > 30
        long_opts = [k for k, s in s_map.items() if s.distance_m > 30]
        sel_long = st.selectbox("Select Long Session", options=long_opts)
        
        if sel_long:
            long_session = s_map[sel_long]
            _, long_avg = get_session_summary(long_session)
            st.metric("Long Average", f"{long_avg:.2f}")
            actual_long_dist = long_session.distance_m
            actual_long_face = long_session.target_face_size_cm
            actual_long_score = long_avg
        else:
            actual_long_score = None

else:
    # Manual Mode
    col_m1, col_m2 = st.columns(2)
    
    with col_m1:
        st.markdown("**Short Distance (Baseline)**")
        actual_short_dist = st.number_input("Distance (m)", value=18.0)
        actual_short_face = st.selectbox("Target Face (cm)", [40, 60, 80, 122], index=0)
        actual_short_score = st.number_input("Average Score (0-10)", value=9.0, step=0.1)
        
    with col_m2:
        st.markdown("**Long Distance (Target)**")
        actual_long_dist = st.number_input("Distance (m)", value=50.0)
        actual_long_face = st.selectbox("Target Face (cm)", [40, 60, 80, 122], index=3, key="man_lf")
        actual_long_score = st.number_input("Average Score (0-10)", value=7.5, step=0.1)

# --- Analysis Execution ---
st.divider()

if st.button("Analyze Performance", type="primary"):
    if not actual_short_score or not actual_long_score:
        st.error("Please ensure both Short and Long distance data is available.")
    else:
        # Instantiate Virtual Coach
        coach = VirtualCoach(selected_bow, selected_arrow)
        
        results = coach.analyze_session_performance(
            short_score=actual_short_score,
            short_dist=actual_short_dist,
            short_face=actual_short_face,
            long_score=actual_long_score,
            long_dist=actual_long_dist,
            long_face=actual_long_face
        )
        
        # --- Visualization ---
        
        # 1. Physics & Safety
        st.subheader("1. Equipment Health Check")
        
        safety = results['safety']
        setup = results['setup_score']
        
        c1, c2 = st.columns([1, 2])
        
        with c1:
            # Gauge for Efficiency
            st.metric("Setup Efficiency", f"{setup['score']}/100", 
                      delta="Optimal" if setup['score'] > 80 else "Review Needed",
                      delta_color="normal" if setup['score'] > 80 else "inverse")
            st.write(f"**GPP (Grains/Pound):** {setup['gpp']}")
            
        with c2:
            if safety:
                for w in safety:
                    st.error(f"🛑 {w}")
            else:
                st.success("✅ Equipment adheres to safety standards.")
                
            if setup['feedback']:
                for f in setup['feedback']:
                    st.info(f"ℹ️ {f}")
            else:
                st.write("No setup tuning issues detected.")

        # 2. Performance Analysis
        st.subheader("2. Skill vs. Drag Analysis")
        
        metrics = results['performance_metrics']
        
        m1, m2, m3 = st.columns(3)
        m1.metric("Predicted Long Dist Score", metrics['predicted_score'])
        m2.metric("Actual Long Dist Score", metrics['actual_score'])
        m3.metric("Loss Due to Drag/Tuning", f"{metrics['points_lost']} pts",
                  delta=f"-{metrics['percent_loss']}%", delta_color="inverse")
        
        # 3. Recommendations
        st.subheader("3. Coach's Verdict")
        
        recs = results['coach_recommendations']
        
        if recs:
            for r in recs:
                st.warning(f"👉 {r}")
        else:
            if metrics['percent_loss'] < 5.0:
                st.success("🎉 Comprehensive Analysis Pass! Your group expansion is consistent with your skill level. Keep training!")
            else:
                st.info("Performance is decent, but slight improvements in tuning or form at distance could help.")
