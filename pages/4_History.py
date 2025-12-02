import streamlit as st
from sqlmodel import Session, select
from src.db import engine
from src.models import Session as SessionModel, End, Shot, BowSetup, ArrowSetup
import pandas as pd

st.set_page_config(page_title="History", page_icon="📜")

st.title("📜 Session History")

def delete_session(session_id):
    with Session(engine) as db:
        session = db.get(SessionModel, session_id)
        if session:
            db.delete(session)
            db.commit()
            st.success("Session deleted.")

with Session(engine) as db:
    sessions = db.exec(select(SessionModel).order_by(SessionModel.date.desc())).all()
    
    if not sessions:
        st.info("No sessions recorded yet.")
    else:
        for s in sessions:
            with st.expander(f"{s.date.strftime('%Y-%m-%d %H:%M')} - {s.round_type} ({len(s.ends)} ends)"):
                col1, col2, col3 = st.columns(3)
                
                # Calculate Total Score
                total_score = 0
                total_arrows = 0
                for end in s.ends:
                    for shot in end.shots:
                        total_score += shot.score
                        total_arrows += 1
                
                avg_arrow = total_score / total_arrows if total_arrows > 0 else 0
                
                with col1:
                    st.metric("Total Score", total_score)
                    st.metric("Avg Arrow", f"{avg_arrow:.2f}")
                
                with col2:
                    st.write(f"**Distance:** {s.distance_m}m")
                    st.write(f"**Face:** {s.target_face_size_cm}cm")
                    if s.bow: st.write(f"**Bow:** {s.bow.name}")
                    if s.arrow: st.write(f"**Arrow:** {s.arrow.make} {s.arrow.model}")
                
                with col3:
                    if st.button("Delete Session", key=f"del_{s.id}"):
                        delete_session(s.id)
                        st.rerun()
