import streamlit as st
from sqlmodel import Session, select, func
from src.db import engine
from src.models import Session as SessionModel, End, Shot, BowSetup, ArrowSetup
import pandas as pd
import plotly.graph_objects as go
import math

st.set_page_config(page_title="History", page_icon="📜", layout="wide")

st.title("📜 Session History")

def get_sessions():
    with Session(engine) as db:
        # Fetch sessions ordered by date
        statement = select(SessionModel).order_by(SessionModel.date.desc())
        results = db.exec(statement).all()
        
        data = []
        for s in results:
            total_score = 0
            total_arrows = 0
            
            for end in s.ends:
                total_score += sum(shot.score for shot in end.shots)
                total_arrows += len(end.shots)
            
            bow_name = s.bow.name if s.bow else "Unknown"
            arrow_name = s.arrow.model if s.arrow else "Unknown"
            
            data.append({
                "ID": s.id,
                "Date": s.date.strftime("%Y-%m-%d %H:%M"),
                "Round": f"{s.round_type} ({s.distance_m}m)",
                "Score": total_score,
                "Arrows": total_arrows,
                "Bow": bow_name,
                "Arrows Used": arrow_name,
                "Notes": s.notes
            })
            
    return pd.DataFrame(data)

def delete_session(session_id):
    with Session(engine) as db:
        session = db.get(SessionModel, session_id)
        if session:
            db.delete(session)
            db.commit()
            return True
    return False

# --- Main UI ---

df_sessions = get_sessions()

if df_sessions.empty:
    st.info("No sessions recorded yet. Go to the **Session Logger** to start shooting!")
else:
    # --- Session Selector ---
    col_sel, col_del = st.columns([3, 1])
    
    with col_sel:
        # Create a dictionary for the selectbox options
        session_options = df_sessions.set_index("ID").to_dict(orient="index")
        
        def format_func(option_id):
            row = session_options[option_id]
            return f"{row['Date']} | {row['Round']} | Score: {row['Score']}"

        selected_session_id = st.selectbox(
            "Select a Session to View Details", 
            options=df_sessions["ID"].tolist(),
            format_func=format_func
        )
        
    with col_del:
        st.write("") # Spacer
        st.write("") # Spacer
        if st.button("🗑️ Delete Selected Session", type="primary"):
            if delete_session(selected_session_id):
                st.success("Session deleted!")
                st.rerun()

    # --- Detail View ---
    if selected_session_id:
        st.markdown("---")
        
        with Session(engine) as db:
            session = db.get(SessionModel, selected_session_id)
            
            if session:
                # Top Stats Row
                all_shots = []
                for end in session.ends:
                    all_shots.extend(end.shots)
                
                total_score = sum(s.score for s in all_shots) if all_shots else 0
                avg_score = total_score / len(all_shots) if all_shots else 0
                
                c1, c2, c3, c4 = st.columns(4)
                c1.metric("Total Score", total_score)
                c2.metric("Average Arrow", f"{avg_score:.2f}")
                c3.metric("Total Arrows", len(all_shots))
                c4.metric("Ends", len(session.ends))
                
                # Main Content Split
                col_left, col_right = st.columns([1, 1])
                
                with col_left:
                    st.subheader("🎯 Heatmap")
                    if all_shots:
                        face_size = session.target_face_size_cm
                        
                        fig = go.Figure()
                        
                        # Draw Target Face (Simplified)
                        # Outer Ring (1)
                        fig.add_shape(type="circle",
                            x0=-face_size/2, y0=-face_size/2, x1=face_size/2, y1=face_size/2,
                            line_color="black", fillcolor="white", layer="below"
                        )
                        # Center (Gold - 9/10)
                        gold_r = (face_size/2) * 0.2
                        fig.add_shape(type="circle",
                            x0=-gold_r, y0=-gold_r, x1=gold_r, y1=gold_r,
                            line_color="gold", fillcolor="gold", layer="below"
                        )
                        # Red (7/8)
                        red_r = (face_size/2) * 0.4
                        fig.add_shape(type="circle",
                            x0=-red_r, y0=-red_r, x1=red_r, y1=red_r,
                            line_color="red", fillcolor="rgba(0,0,0,0)", layer="below"
                        )
                        
                        # Plot Shots
                        x_vals = [s.x for s in all_shots]
                        y_vals = [s.y for s in all_shots]
                        scores = [s.score for s in all_shots]
                        
                        # Color map
                        colors_map = {10: '#FFFF00', 9: '#FFFF00', 8: '#FF0000', 7: '#FF0000', 6: '#0000FF', 5: '#0000FF', 4: '#000000', 3: '#000000', 2: '#FFFFFF', 1: '#FFFFFF', 0: '#808080'}
                        marker_colors = [colors_map.get(s, 'grey') for s in scores]
                        marker_lines = ['black' if s in [9, 10, 2, 1] else 'white' for s in scores]
                        
                        fig.add_trace(go.Scatter(
                            x=x_vals, y=y_vals,
                            mode='markers',
                            marker=dict(size=12, color=marker_colors, line=dict(width=1, color=marker_lines)),
                            text=[f"Score: {s}" for s in scores],
                            hoverinfo='text'
                        ))
                        
                        limit = face_size / 2 * 1.1
                        fig.update_layout(
                            width=450, height=450,
                            xaxis=dict(range=[-limit, limit], showgrid=False, zeroline=False, visible=False),
                            yaxis=dict(range=[-limit, limit], showgrid=False, zeroline=False, visible=False, scaleanchor="x", scaleratio=1),
                            margin=dict(l=0, r=0, t=0, b=0),
                            paper_bgcolor="rgba(0,0,0,0)",
                            plot_bgcolor="rgba(0,0,0,0)"
                        )
                        st.plotly_chart(fig, use_container_width=True)
                    else:
                        st.info("No shots to plot.")

                with col_right:
                    st.subheader("📝 Scorecard")
                    
                    # Metadata
                    st.write(f"**Date:** {session.date.strftime('%Y-%m-%d %H:%M')}")
                    st.write(f"**Round:** {session.round_type}")
                    st.write(f"**Equipment:** {session.bow.name if session.bow else 'Unknown Bow'} / {session.arrow.model if session.arrow else 'Unknown Arrow'}")
                    if session.notes:
                        st.info(f"**Notes:** {session.notes}")
                    
                    # Table
                    scorecard_data = []
                    running_total = 0
                    sorted_ends = sorted(session.ends, key=lambda e: e.end_number)
                    
                    for end in sorted_ends:
                        end_score = sum(s.score for s in end.shots)
                        running_total += end_score
                        # Format shots
                        shots_desc = ", ".join([str(s.score) for s in sorted(end.shots, key=lambda x: x.score, reverse=True)])
                        
                        scorecard_data.append({
                            "End": end.end_number,
                            "Arrows": shots_desc,
                            "End Score": end_score,
                            "Total": running_total
                        })
                    
                    st.dataframe(
                        pd.DataFrame(scorecard_data).set_index("End"), 
                        use_container_width=True
                    )
                        delete_session(s.id)
                        st.rerun()
