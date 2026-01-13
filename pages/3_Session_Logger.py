import streamlit as st
from sqlmodel import Session, select
from src.db import engine, create_db_and_tables
from src.models import BowSetup, ArrowSetup, Session as SessionModel, End, Shot
from src.scoring import create_target_face, get_ring_score, get_flint_score
import plotly.graph_objects as go
from datetime import datetime
import math
import pandas as pd

# Try importing streamlit-plotly-events
try:
    from streamlit_plotly_events import plotly_events
    HAS_PLOTLY_EVENTS = True
except ImportError:
    HAS_PLOTLY_EVENTS = False

# Initialize DB
create_db_and_tables()

# --- Round Definitions ---
ROUND_DEFINITIONS = {
    "WA 18m (Indoor)": {"dist": 18, "face": 40, "arrows_end": 3, "total": 60, "type": "WA", "x_11": False},
    "WA 25m (Indoor)": {"dist": 25, "face": 60, "arrows_end": 3, "total": 60, "type": "WA", "x_11": False},
    "WA 50m (Barebow)": {"dist": 50, "face": 122, "arrows_end": 6, "total": 72, "type": "WA", "x_11": False},
    "WA 70m (Recurve)": {"dist": 70, "face": 122, "arrows_end": 6, "total": 72, "type": "WA", "x_11": False},
    "IFAA Flint (Indoor)": {"dist": 20, "face": 35, "arrows_end": 4, "total": 56, "type": "Flint", "x_11": False},
    "Lancaster Quali": {"dist": 18, "face": 40, "arrows_end": 3, "total": 60, "type": "WA", "x_11": True},
    "Custom": {"dist": 18, "face": 40, "arrows_end": 3, "total": 30, "type": "WA", "x_11": False}
}

st.set_page_config(page_title="Session Logger", page_icon="🎯", layout="wide")

st.title("🎯 Pro Session Logger")

# --- Sidebar: Session Config ---
with st.sidebar:
    st.header("Session Settings")
    
    with Session(engine) as db:
        bows = db.exec(select(BowSetup)).all()
        arrows = db.exec(select(ArrowSetup)).all()
        
    bow_options = {b.name: b.id for b in bows}
    arrow_options = {f"{a.make} {a.model}": a for a in arrows}
    
    # Session Controls
    if 'current_session_id' in st.session_state:
        st.success("Session Active")
        if st.button("End Session", type="primary"):
            del st.session_state.current_session_id
            if 'current_end_number' in st.session_state: del st.session_state.current_end_number
            if 'shots_in_current_end' in st.session_state: del st.session_state.shots_in_current_end
            st.rerun()
    else:
        st.info("New Session Setup")
        selected_bow_name = st.selectbox("Select Bow", options=list(bow_options.keys()))
        selected_arrow_name = st.selectbox("Select Arrow", options=list(arrow_options.keys()))
        selected_arrow = arrow_options[selected_arrow_name] if arrow_options else None
        
        round_name = st.selectbox("Round Type", list(ROUND_DEFINITIONS.keys()))
        round_config = ROUND_DEFINITIONS[round_name]
        
        if round_name == "Custom":
            dist = st.number_input("Distance (m)", value=18)
            face = st.selectbox("Face Size (cm)", [40, 60, 80, 122], index=0)
            arrows_per_end = st.number_input("Arrows per End", min_value=1, value=3)
            total_arrows = st.number_input("Total Arrows", min_value=1, value=30, step=3)
            x_is_11_default = False
            round_type_val = "WA"
        else:
            dist = round_config["dist"]
            face = round_config["face"]
            arrows_per_end = round_config["arrows_end"]
            total_arrows = round_config["total"]
            x_is_11_default = round_config["x_11"]
            round_type_val = round_config["type"]
            
        x_is_11_setting = st.checkbox("Score X as 11?", value=x_is_11_default)
        
        if st.button("Start Logging"):
            with Session(engine) as db:
                new_session = SessionModel(
                    bow_id=bow_options[selected_bow_name] if bow_options else None,
                    arrow_id=selected_arrow.id if selected_arrow else None,
                    round_type=round_type_val if round_name == "Custom" else round_name,
                    target_face_size_cm=face,
                    distance_m=dist,
                    date=datetime.now()
                )
                db.add(new_session)
                db.commit()
                db.refresh(new_session)
                
                st.session_state.current_session_id = new_session.id
                st.session_state.current_round_type = round_type_val
                st.session_state.x_is_11 = x_is_11_setting
                st.session_state.current_end_number = 1
                st.session_state.shots_in_current_end = []
                st.session_state.session_arrow_count = selected_arrow.arrow_count if selected_arrow else 12
                st.session_state.arrows_per_end = arrows_per_end
                st.session_state.total_arrows = total_arrows
                st.session_state.selected_arrow_for_shot = 1 # Start with Arrow 1
                st.rerun()

# --- Main Logger Interface ---
if 'current_session_id' in st.session_state:
    session_id = st.session_state.current_session_id
    
    # Retrieve Session Context
    with Session(engine) as db:
        sess = db.get(SessionModel, session_id)
        if not sess:
            st.error("Session not found!")
            st.stop()
        face_size = sess.target_face_size_cm
        face_type = "WA" # Default
    
# --- Main Logger Interface ---
if 'current_session_id' in st.session_state:
    session_id = st.session_state.current_session_id
    
    # Retrieve Session Context
    with Session(engine) as db:
        sess = db.get(SessionModel, session_id)
        if not sess:
            st.error("Session not found!")
            st.stop()
        face_size = sess.target_face_size_cm
        face_type = "WA" # Default logic assumes WA for now unless Flint overridden
        
        # Load ALL previous shots for analytics
        # We need eager loading to get shots for every end
        from sqlalchemy.orm import selectinload
        session_data = db.exec(
            select(SessionModel)
            .where(SessionModel.id == session_id)
            .options(selectinload(SessionModel.ends).selectinload(End.shots))
        ).one()
        
        previous_ends = session_data.ends
    
    # Current State
    end_num = st.session_state.get('current_end_number', 1)
    shots_current_end = st.session_state.get('shots_in_current_end', [])
    active_arrow = st.session_state.get('selected_arrow_for_shot', 1)
    arrows_per_end = st.session_state.get('arrows_per_end', 3)
    total_arrows_in_quiver = st.session_state.get('session_arrow_count', 12)
    is_complete = st.session_state.get('session_complete', False)

    if is_complete:
        st.canvas = st.empty() # Hacky clear? No, just render different UI
        
        st.markdown("## 🏆 Session Complete!")
        
        # Calculate final stats
        final_score = 0
        final_shots = 0
        
        # Iterate previous ends (which now includes the last one we just saved)
        # Note: previous_ends variable is loaded at top of script, so after rerun it should include the last saved end
        
        for e in previous_ends:
            for s in e.shots:
                final_score += s.score
                final_shots += 1
        
        avg = final_score / final_shots if final_shots else 0
        
        c1, c2, c3 = st.columns(3)
        c1.metric("Total Score", final_score)
        c2.metric("Total Arrows", final_shots)
        c3.metric("Average Arrow", f"{avg:.2f}")
        
        st.success(f"You have completed your {st.session_state.get('current_round_type', 'Custom')} round!")
        
        if st.button("Return to Home"):
            del st.session_state.current_session_id
            del st.session_state.session_complete
            st.rerun()
            
        st.stop() # Stop rendering the logger UI
    
    # --- Layout ---
    # Top: Target & Quiver
    col_target, col_controls = st.columns([1.5, 1])
    
    with col_target:
        st.subheader(f"Target Face (End {end_num})")
        
        # View Toggle
        view_mode = st.radio("View Mode", ["Current End", "Session Cumulative"], horizontal=True, label_visibility="collapsed")
        
        # 1. Create Base Plot
        fig = create_target_face(face_size, face_type)
        
        # Collect Data for Plotting
        plot_shots = []
        median_center = None
        
        if view_mode == "Session Cumulative":
            # Add previous shots
            all_x = []
            all_y = []
            
            for end in previous_ends:
                for s in end.shots:
                    plot_shots.append({
                        'x': s.x, 'y': s.y, 'score': s.score, 'num': s.arrow_number, 'color': 'rgba(255, 255, 255, 0.8)' # High visibility white/grey for previous
                    })
                    all_x.append(s.x)
                    all_y.append(s.y)
            
            # Add current (active) shots
            for s in shots_current_end:
                 plot_shots.append({
                    'x': s['x'], 'y': s['y'], 'score': s['score'], 'num': s['arrow_number'], 'color': '#00FF00' # Bright Neon Green
                })
                 all_x.append(s['x'])
                 all_y.append(s['y'])
                 
            # Calculate Median Center
            if all_x:
                import numpy as np
                median_x = np.median(all_x)
                median_y = np.median(all_y)
                median_center = (median_x, median_y)
                
        else:
            # Current End Only
            for s in shots_current_end:
                plot_shots.append({
                    'x': s['x'], 'y': s['y'], 'score': s['score'], 'num': s['arrow_number'], 'color': '#00FF00'
                })

        # 2. Add Traces
        if plot_shots:
            x_vals = [s['x'] for s in plot_shots]
            y_vals = [s['y'] for s in plot_shots]
            texts = [str(s['num']) for s in plot_shots]
            colors = [s['color'] for s in plot_shots]
            
            fig.add_trace(go.Scatter(
                x=x_vals, y=y_vals,
                mode='markers+text',
                marker=dict(color=colors, size=18, line=dict(color='black', width=1)),
                text=texts,
                textfont=dict(color='black', size=11, weight='bold'),
                textposition="middle center",
                name="Shots",
                hoverinfo='text',
                hovertext=[f"Arrow #{s['num']}: {s['score']}" for s in plot_shots]
            ))
            
        # 3. Median Center Marker
        if median_center:
            fig.add_trace(go.Scatter(
                x=[median_center[0]], y=[median_center[1]],
                mode='markers',
                marker=dict(symbol='cross', color='red', size=25, line=dict(width=3, color='black')),
                name="Group Center (Median)",
                hoverinfo='name'
            ))

        # 4. INTERACTIVE PLOT
        if HAS_PLOTLY_EVENTS:
            # Key logic: Needs to update when shots change to reset click state!
            # We use a version counter to force reset even if shot count/arrow doesn't change
            plot_version = st.session_state.get('plot_version', 0)
            click_key = f"plot_{view_mode}_{end_num}_{len(shots_current_end)}_{active_arrow}_{plot_version}"
            
            # Match Scoring.py size (600)
            click_data = plotly_events(fig, click_event=True, hover_event=False, key=click_key, override_height=600, override_width=600)
            
            if click_data:
                mx, my = click_data[0]['x'], click_data[0]['y']
                
                # Scoring
                radius = math.sqrt(mx**2 + my**2)
                x_is_11 = st.session_state.get('x_is_11', False)
                score = get_ring_score(radius, face_size, x_is_11=x_is_11)
                
                # Update Shot
                st.session_state.shots_in_current_end = [s for s in st.session_state.shots_in_current_end if s.get('arrow_number') != active_arrow]
                st.session_state.shots_in_current_end.append({
                    'x': mx, 'y': my, 'score': score, 'is_x': False, 'arrow_number': active_arrow
                })
                
                # Auto-Advance Logic
                shot_nums = {s['arrow_number'] for s in st.session_state.shots_in_current_end}
                next_arrow = active_arrow
                
                found = False
                for i in range(1, arrows_per_end + 1):
                    if i not in shot_nums and i > active_arrow:
                        next_arrow = i
                        found = True
                        break
                if not found:
                    for i in range(1, arrows_per_end + 1):
                         if i not in shot_nums:
                            next_arrow = i
                            found = True
                            break
                
                st.session_state.selected_arrow_for_shot = next_arrow
                st.session_state.plot_version = plot_version + 1 # Force key change
                st.rerun()
        else:
             st.error("Plotly Events not supported.")

    with col_controls:
        # --- THE QUIVER (Full Set) ---
        st.subheader("The Quiver")
        st.markdown(f"**active: arrow #{active_arrow}**")
        
        # Display ALL arrows in quiver (e.g. 12)
        # Use dynamic columns
        q_cols = st.columns(4) # 4 columns
        
        for i in range(1, total_arrows_in_quiver + 1):
            col_idx = (i - 1) % 4
            
            # Status Check
            # 1. Is it shot in THIS end?
            current_shot = next((s for s in shots_current_end if s.get('arrow_number') == i), None)
            
            # 2. Is it selected?
            is_selected = (i == active_arrow)
            
            btn_label = f"#{i}"
            if current_shot:
                btn_label += f"\n[{current_shot['score']}]"
                
            # Style
            if is_selected:
                b_type = "primary"
            elif current_shot:
                b_type = "secondary" # Or maybe we can't color it differently easily
            else:
                b_type = "secondary"
                
            if q_cols[col_idx].button(btn_label, key=f"q_{i}", type=b_type, use_container_width=True):
                st.session_state.selected_arrow_for_shot = i
                st.rerun()

        st.divider()
        
        # End Summary
        current_end_score = sum(s['score'] for s in shots_current_end)
        current_arrows_count = len(shots_current_end)
        
        st.metric("Current End", f"{current_end_score}")
        
        if st.button("💾 Save End", type="primary", use_container_width=True, disabled=(current_arrows_count == 0)):
             with Session(engine) as db:
                end = End(session_id=session_id, end_number=end_num)
                db.add(end)
                db.commit()
                db.refresh(end)
                
                for s in shots_current_end:
                    shot = Shot(
                        end_id=end.id, score=s['score'], x=s['x'], y=s['y'], is_x=s['is_x'], arrow_number=s.get('arrow_number')
                    )
                    db.add(shot)
                db.commit()
            
             # Check for Session Completion
             # We need to know total shots stored in DB + current shots
             # Actually, we can just use the total arrow count we track in stats
             
             # Calculate total shots AFTER saving this end
             # Re-querying is safest
             with Session(engine) as db:
                 current_sess = db.get(SessionModel, session_id)
                 # eager load to count
                 # But we just added an end, so lets count ends/shots
                 # Or just track it in session state if we trust it?
                 # Let's count properly via DB for robustness
                 # We need to refresh the session_data query at the top of the loop actually
                 pass 

             # Simpler approach: current 'total_shots_count' (from stats section calculation) + len(shots_current_end) == total_arrows?
             # But 'total_shots_count' is calculated further down. Let's move that calculation UP or re-do it.
             
             # Let's use st.session_state.total_arrows
             max_arrows = st.session_state.get('total_arrows', 60)
             
             # Count existing shots
             existing_shots_count = sum(len(e.shots) for e in previous_ends)
             total_now = existing_shots_count + len(shots_current_end)
             
             if total_now >= max_arrows:
                 st.session_state.session_complete = True
                 st.session_state.current_end_number += 1 # Technically we finished this end
                 st.session_state.shots_in_current_end = []
                 st.rerun()
             else:
                 st.session_state.current_end_number += 1
                 st.session_state.shots_in_current_end = []
                 st.session_state.selected_arrow_for_shot = 1
                 st.rerun()

    # --- Live Analytics Table ---
    st.markdown("---")
    st.subheader("📊 Session Statistics")
    
    # Compile Data
    stats_data = []
    running_total = 0
    total_shots_count = 0
    
    # Process previous ends
    sorted_ends = sorted(previous_ends, key=lambda e: e.end_number)
    for e in sorted_ends:
        e_score = sum(s.score for s in e.shots)
        e_shots = len(e.shots)
        running_total += e_score
        total_shots_count += e_shots
        avg = running_total / total_shots_count if total_shots_count else 0
        
        stats_data.append({
            "End": str(e.end_number),
            "Score": e_score,
            "Arrows": e_shots,
            "Running Total": running_total,
            "Running Avg": f"{avg:.2f}"
        })
        
    # Append Current End (Live)
    if shots_current_end:
        c_score = sum(s['score'] for s in shots_current_end)
        c_shots = len(shots_current_end)
        live_total = running_total + c_score
        live_count = total_shots_count + c_shots
        live_avg = live_total / live_count if live_count else 0
        
        stats_data.append({
            "End": f"{end_num} (Current)",
            "Score": c_score,
            "Arrows": c_shots,
            "Running Total": live_total,
            "Running Avg": f"{live_avg:.2f}"
        })
        
    if stats_data:
        st.dataframe(pd.DataFrame(stats_data), use_container_width=True)
    else:
        st.info("No ends recorded yet.")

else:
    st.info("👈 Configure and Start a Session from the Sidebar.")
