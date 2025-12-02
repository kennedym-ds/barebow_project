import streamlit as st
from sqlmodel import Session, select, col
from src.db import engine
from src.models import Session as SessionModel, Shot, End
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import numpy as np

st.set_page_config(page_title="Analytics", page_icon="📈", layout="wide")

st.title("📈 Long-term Progression")

# --- Data Fetching ---
@st.cache_data(ttl=60)
def load_data():
    with Session(engine) as session:
        # Fetch all sessions with their ends and shots
        # Note: SQLModel relationships are lazy by default, but we can join or just iterate if dataset is small.
        # For analytics, fetching everything into a DataFrame is often easier.
        
        statement = select(SessionModel).order_by(SessionModel.date)
        results = session.exec(statement).all()
        
        data = []
        for s in results:
            total_score = 0
            shot_count = 0
            shots_x = []
            shots_y = []
            
            for end in s.ends:
                for shot in end.shots:
                    total_score += shot.score
                    shot_count += 1
                    shots_x.append(shot.x)
                    shots_y.append(shot.y)
            
            # Calculate Group Statistics
            if shot_count > 0:
                avg_score = total_score / shot_count
                
                # Calculate radial distance for each shot (assuming x, y are in cm)
                r_dists = [np.sqrt(x**2 + y**2) for x, y in zip(shots_x, shots_y)]
                mean_radius = np.mean(r_dists)
                
            else:
                avg_score = 0
                mean_radius = 0

            data.append({
                "Date": s.date,
                "Round": s.round_type,
                "Distance": s.distance_m,
                "Face": s.target_face_size_cm,
                "Total Score": total_score,
                "Average Score": avg_score,
                "Shot Count": shot_count,
                "Mean Radius (cm)": mean_radius,
                "Session ID": s.id
            })
            
        return pd.DataFrame(data)

df = load_data()

if df.empty:
    st.info("No session data found. Go to the 'Session Logger' to record some shooting!")
    st.stop()

# --- Sidebar Filters ---
st.sidebar.header("Filters")
round_types = st.sidebar.multiselect("Round Type", options=df["Round"].unique(), default=df["Round"].unique())
min_date = df["Date"].min().date()
max_date = df["Date"].max().date()
date_range = st.sidebar.date_input("Date Range", [min_date, max_date])

# Filter Data
if len(date_range) == 2:
    start_date, end_date = date_range
    mask = (df["Round"].isin(round_types)) & \
           (df["Date"].dt.date >= start_date) & \
           (df["Date"].dt.date <= end_date)
else:
    mask = (df["Round"].isin(round_types))

filtered_df = df[mask]

# --- Dashboard ---

col1, col2, col3 = st.columns(3)
col1.metric("Total Sessions", len(filtered_df))
col2.metric("Total Arrows", filtered_df["Shot Count"].sum())
if not filtered_df.empty:
    col3.metric("Avg Score (All)", f"{filtered_df['Average Score'].mean():.2f}")

tab1, tab2, tab3 = st.tabs(["🎯 Score History", "📏 Precision Analysis", "🔥 Heatmap"])

with tab1:
    st.subheader("Score Progression")
    if not filtered_df.empty:
        fig = px.line(filtered_df, x="Date", y="Average Score", color="Round", markers=True,
                      title="Average Arrow Score over Time")
        fig.update_layout(yaxis_range=[0, 10.5])
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.write("No data for selected filters.")

with tab2:
    st.subheader("Group Size (Mean Radius)")
    st.markdown("Tracks how tight your groups are (in cm). **Lower is better.**")
    if not filtered_df.empty:
        fig = px.line(filtered_df, x="Date", y="Mean Radius (cm)", color="Round", markers=True)
        fig.update_layout(yaxis_autorange="reversed") # Lower is better, so flip axis? Or just keep normal.
        # Usually graphs go up for good, but here down is good. Let's keep it normal but explain.
        st.plotly_chart(fig, use_container_width=True)

with tab3:
    st.subheader("Aggregate Heatmap")
    st.write("Visualizing all shots from the selected sessions.")
    
    # We need to fetch raw shots for the filtered sessions
    # This is a bit inefficient to do inside the render loop if data is huge, but fine for now.
    session_ids = filtered_df["Session ID"].tolist()
    
    with Session(engine) as session:
        # Fetch Shot and Face Size for normalization
        statement = select(Shot, SessionModel.target_face_size_cm)\
            .join(End).join(SessionModel)\
            .where(col(SessionModel.id).in_(session_ids))
            
        results = session.exec(statement).all()
        
        shot_data = []
        for shot, face_size in results:
            # Normalize to -1 to 1 range
            # x is in cm, face_size is in cm (diameter)
            radius_cm = face_size / 2.0
            if radius_cm > 0:
                shot_data.append({
                    "x": shot.x / radius_cm,
                    "y": shot.y / radius_cm
                })
        
        shots_df = pd.DataFrame(shot_data)
        
    if not shots_df.empty:
        # Create a target face background
        fig = go.Figure()
        
        # Draw Target Rings (Simplified)
        # Normalized coordinates -1 to 1
        # Rings at 1.0 (1/2), 0.8 (3/4), etc?
        # Standard target: 10 rings. 
        # Ring 10 diameter = 1/10 of total? No.
        # WA Target: 
        # 10 ring = 10% of diameter?
        # Actually, let's just use the heatmap for density.
        
        fig.add_trace(go.Histogram2dContour(
            x=shots_df["x"],
            y=shots_df["y"],
            colorscale="Hot",
            reversescale=True,
            xaxis="x",
            yaxis="y",
            ncontours=20
        ))
        
        fig.add_trace(go.Scatter(
            x=shots_df["x"],
            y=shots_df["y"],
            mode='markers',
            marker=dict(color='black', size=3, opacity=0.3)
        ))
        
        fig.update_layout(
            width=600, height=600,
            xaxis=dict(range=[-1.2, 1.2], showgrid=False),
            yaxis=dict(range=[-1.2, 1.2], showgrid=False, scaleanchor="x", scaleratio=1),
            shapes=[
                dict(type="circle", xref="x", yref="y", x0=-1, y0=-1, x1=1, y1=1, line_color="black"),
                dict(type="circle", xref="x", yref="y", x0=-0.2, y0=-0.2, x1=0.2, y1=0.2, line_color="gold"),
            ]
        )
        
        st.plotly_chart(fig)
    else:
        st.write("No shots found.")

