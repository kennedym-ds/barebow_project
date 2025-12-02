import streamlit as st
from src.models import BowSetup, ArrowSetup
from src.analysis import VirtualCoach
import uuid

st.set_page_config(page_title="Analysis Lab", page_icon="🧪")

st.title("🧪 Analysis Lab: The Virtual Coach")

st.markdown("""
This module uses the **James Park Model** to separate your **Skill** from your **Equipment**.
Enter your scores from two distances to see if your gear is holding you back.
""")

# --- Mock Data / State Management ---
# In a real app, we'd load this from a database or session state
if 'bow' not in st.session_state:
    # Create a default mock setup for demo purposes
    st.session_state.bow = BowSetup(
        id="demo", name="Demo Bow",
        riser_make="Gillo", riser_model="G1", riser_length_in=25,
        limbs_make="Uukha", limbs_model="Sx50", limbs_length="Long", limbs_marked_poundage=36,
        draw_weight_otf=38.0, brace_height_in=8.75,
        tiller_top_mm=185, tiller_bottom_mm=185, tiller_type="neutral",
        plunger_spring_tension=5, plunger_center_shot_mm=0,
        nocking_point_height_mm=12
    )
if 'arrow' not in st.session_state:
    st.session_state.arrow = ArrowSetup(
        id="demo", make="Easton", model="X23", spine=400, length_in=30,
        point_weight_gr=150, total_arrow_weight_gr=450, shaft_diameter_mm=9.3,
        fletching_type="Feathers", nock_type="Beiter"
    )

# --- UI ---

col1, col2 = st.columns(2)

with col1:
    st.subheader("1. Baseline Skill (Short Distance)")
    short_dist = st.number_input("Distance (m)", value=18.0, key="sd")
    short_face = st.selectbox("Target Face (cm)", [40, 60, 80, 122], index=0, key="sf")
    short_score = st.number_input("Average Arrow Score (0-10)", value=9.2, step=0.1, help="e.g. 276/300 = 9.2", key="ss")

with col2:
    st.subheader("2. Performance (Long Distance)")
    long_dist = st.number_input("Distance (m)", value=50.0, key="ld")
    long_face = st.selectbox("Target Face (cm)", [40, 60, 80, 122], index=3, key="lf")
    long_score = st.number_input("Average Arrow Score (0-10)", value=7.5, step=0.1, key="ls")

if st.button("Run Analysis"):
    coach = VirtualCoach(st.session_state.bow, st.session_state.arrow)
    
    results = coach.analyze_session_performance(
        short_score, short_dist, short_face,
        long_score, long_dist, long_face
    )
    
    st.divider()
    
    # Display Results
    r_col1, r_col2 = st.columns(2)
    
    with r_col1:
        st.subheader("📊 Drag Loss Analysis")
        metrics = results['performance_metrics']
        
        st.metric("Predicted Score", metrics['predicted_score'])
        st.metric("Actual Score", metrics['actual_score'], delta=f"{metrics['points_lost']:.2f} pts", delta_color="inverse")
        
        if metrics['percent_loss'] > 5:
            st.warning(f"You are losing {metrics['percent_loss']}% of your score to aerodynamics/tuning.")
        else:
            st.success("Your equipment is performing efficiently!")
            
    with r_col2:
        st.subheader("🛠️ Setup Efficiency")
        setup = results['setup_score']
        st.metric("Setup Score", f"{setup['score']}/100")
        st.write(f"**GPP:** {setup['gpp']}")
        
        for fb in setup['feedback']:
            st.info(fb)
            
    st.subheader("💡 Coach Recommendations")
    if results['coach_recommendations']:
        for rec in results['coach_recommendations']:
            st.write(f"- {rec}")
    else:
        st.write("No critical equipment changes recommended. Focus on form!")
