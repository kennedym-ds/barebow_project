import streamlit as st
from sqlmodel import Session, select
from src.db import engine, create_db_and_tables
from src.models import BowSetup, ArrowSetup, Session as SessionModel, End, Shot
from src.scoring import create_target_face, get_ring_score
import plotly.graph_objects as go
from datetime import datetime
import math

# Initialize DB
create_db_and_tables()

st.set_page_config(page_title="Session Logger", page_icon="🎯", layout="wide")

st.title("🎯 Session Logger")

# --- Sidebar: Session Setup ---
with st.sidebar:
    st.header("Session Config")
    
    with Session(engine) as db:
        bows = db.exec(select(BowSetup)).all()
        arrows = db.exec(select(ArrowSetup)).all()
        
    bow_options = {b.name: b.id for b in bows}
    arrow_options = {f"{a.make} {a.model}": a.id for a in arrows}
    
    selected_bow_name = st.selectbox("Select Bow", options=list(bow_options.keys()))
    selected_arrow_name = st.selectbox("Select Arrow", options=list(arrow_options.keys()))
    
    round_type = st.selectbox("Round Type", ["WA 18m", "WA 25m", "Practice"])
    
    if round_type == "WA 18m":
        dist = 18
        face = 40
    elif round_type == "WA 25m":
        dist = 25
        face = 60
    else:
        dist = st.number_input("Distance (m)", value=18)
        face = st.selectbox("Face Size (cm)", [40, 60, 80, 122], index=0)

    if 'current_session_id' not in st.session_state:
        if st.button("Start New Session"):
            with Session(engine) as db:
                new_session = SessionModel(
                    bow_id=bow_options.get(selected_bow_name),
                    arrow_id=arrow_options.get(selected_arrow_name),
                    round_type=round_type,
                    target_face_size_cm=face,
                    distance_m=dist,
                    date=datetime.now()
                )
                db.add(new_session)
                db.commit()
                db.refresh(new_session)
                st.session_state.current_session_id = new_session.id
                st.session_state.current_end_number = 1
                st.session_state.shots_in_current_end = []
                st.rerun()

# --- Main Area: Scoring ---

if 'current_session_id' in st.session_state:
    session_id = st.session_state.current_session_id
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.subheader(f"End {st.session_state.get('current_end_number', 1)}")
        
        # Plotly Chart with Click Events
        fig = create_target_face(face)
        
        # Add existing shots for this end to the plot
        current_shots = st.session_state.get('shots_in_current_end', [])
        if current_shots:
            x_vals = [s['x'] for s in current_shots]
            y_vals = [s['y'] for s in current_shots]
            scores = [s['score'] for s in current_shots]
            
            fig.add_trace(go.Scatter(
                x=x_vals, y=y_vals,
                mode='markers+text',
                marker=dict(color='green', size=12, line=dict(color='white', width=1)),
                text=scores,
                textposition="top center",
                name="Shots"
            ))

        # Capture clicks
        # Streamlit's plotly_chart doesn't support click events natively to return coordinates easily 
        # without a callback or custom component in standard mode.
        # However, we can use `st.plotly_chart` with `on_select` in newer Streamlit versions, 
        # or use a workaround. 
        # For this MVP, we will use the standard `streamlit-plotly-events` pattern if available, 
        # or a simple coordinate input fallback if the library isn't installed.
        # Since I didn't install `streamlit-plotly-events`, I will use a clever workaround:
        # I will use `st.image` with `streamlit-drawable-canvas` if I had it, but I don't.
        # Wait, I added `plotly` but not `streamlit-plotly-events`.
        # Let's use a coordinate input simulator for now or just standard inputs for X/Y if click isn't easy.
        # ACTUALLY: Streamlit 1.35+ supports `st.plotly_chart(..., on_select="rerun")`.
        # Let's try to use the selection event.
        
        event = st.plotly_chart(fig, use_container_width=False, on_select="rerun", selection_mode="points")
        
        # Note: Plotly click events in Streamlit are tricky without the custom component.
        # Let's provide manual input as a fallback for reliability in this iteration.
        st.info("Clicking on the chart requires `streamlit-plotly-events`. For this MVP, please estimate coordinates or use the sliders below.")
        
        # Manual Input Fallback (Reliable)
        mx = st.slider("Horizontal (cm)", -face/2.0, face/2.0, 0.0, 0.1)
        my = st.slider("Vertical (cm)", -face/2.0, face/2.0, 0.0, 0.1)
        
        if st.button("Record Shot"):
            radius = math.sqrt(mx**2 + my**2)
            score = get_ring_score(radius, face)
            st.session_state.shots_in_current_end.append({
                'x': mx, 'y': my, 'score': score, 'is_x': False # Logic for X can be added
            })
            st.rerun()

    with col2:
        st.subheader("Current End")
        shots = st.session_state.get('shots_in_current_end', [])
        
        for i, s in enumerate(shots):
            st.write(f"Arrow {i+1}: **{s['score']}** ({s['x']}, {s['y']})")
            
        end_total = sum(s['score'] for s in shots)
        st.metric("End Total", end_total)
        
        if st.button("Save End & Next"):
            if not shots:
                st.error("No shots to save!")
            else:
                with Session(engine) as db:
                    # Create End
                    end = End(session_id=session_id, end_number=st.session_state.current_end_number)
                    db.add(end)
                    db.commit()
                    db.refresh(end)
                    
                    # Create Shots
                    for s in shots:
                        shot = Shot(
                            end_id=end.id,
                            score=s['score'],
                            x=s['x'],
                            y=s['y'],
                            is_x=s['is_x']
                        )
                        db.add(shot)
                    db.commit()
                
                # Reset for next end
                st.session_state.current_end_number += 1
                st.session_state.shots_in_current_end = []
                st.success("End Saved!")
                st.rerun()
                
        if st.button("Finish Session"):
            del st.session_state.current_session_id
            del st.session_state.current_end_number
            del st.session_state.shots_in_current_end
            st.success("Session Complete!")
            st.rerun()

else:
    st.info("👈 Start a session from the sidebar to begin scoring.")
