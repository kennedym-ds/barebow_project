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
        statement = select(SessionModel).order_by(SessionModel.date)
        results = session.exec(statement).all()
        
        session_data = []
        all_shots_data = []
        
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
                    
                    # Collect individual shot data for deep analysis
                    all_shots_data.append({
                        "Session Date": s.date,
                        "Round": s.round_type,
                        "End #": end.end_number,
                        "Arrow #": f"#{shot.arrow_number}" if shot.arrow_number else "Unknown",
                        "Score": shot.score,
                        "x": shot.x,
                        "y": shot.y,
                        "Face Size": s.target_face_size_cm
                    })
            
            # Calculate Group Statistics
            if shot_count > 1:
                avg_score = total_score / shot_count
                r_dists = [np.sqrt(x**2 + y**2) for x, y in zip(shots_x, shots_y)]
                mean_radius = np.mean(r_dists)
                
                # Dispersion Metrics
                sigma_x = np.std(shots_x)
                sigma_y = np.std(shots_y)
                cep_50 = np.percentile(r_dists, 50)
                
            else:
                avg_score = 0 if shot_count == 0 else total_score
                mean_radius = 0
                sigma_x = 0
                sigma_y = 0
                cep_50 = 0
                
            session_data.append({
                "Date": s.date,
                "Round": s.round_type,
                "Distance": s.distance_m,
                "Face": s.target_face_size_cm,
                "Total Score": total_score,
                "Average Score": avg_score,
                "Shot Count": shot_count,
                "Mean Radius (cm)": mean_radius,
                "Sigma X (cm)": sigma_x,
                "Sigma Y (cm)": sigma_y,
                "CEP 50 (cm)": cep_50,
                "Session ID": s.id
            })
            
        return pd.DataFrame(session_data), pd.DataFrame(all_shots_data)

df_sessions, df_shots = load_data()

if df_sessions.empty:
    st.info("No session data found. Go to the 'Session Logger' to record some shooting!")
    st.stop()

# --- Sidebar Filters ---
st.sidebar.header("Filters")
round_types = st.sidebar.multiselect("Round Type", options=df_sessions["Round"].unique(), default=df_sessions["Round"].unique())
min_date = df_sessions["Date"].min().date()
max_date = df_sessions["Date"].max().date()
date_range = st.sidebar.date_input("Date Range", [min_date, max_date])

# Filter Data
if len(date_range) == 2:
    start_date, end_date = date_range
    mask = (df_sessions["Round"].isin(round_types)) & \
           (df_sessions["Date"].dt.date >= start_date) & \
           (df_sessions["Date"].dt.date <= end_date)
    
    # Filter shots as well
    if not df_shots.empty:
        mask_shots = (df_shots["Round"].isin(round_types)) & \
                     (df_shots["Session Date"].dt.date >= start_date) & \
                     (df_shots["Session Date"].dt.date <= end_date)
        filtered_shots = df_shots[mask_shots]
    else:
        filtered_shots = pd.DataFrame()
else:
    mask = (df_sessions["Round"].isin(round_types))
    filtered_shots = df_shots[df_shots["Round"].isin(round_types)] if not df_shots.empty else pd.DataFrame()

filtered_df = df_sessions[mask]

# --- Dashboard ---

# Top Level Stats
col1, col2, col3, col4 = st.columns(4)
col1.metric("Total Sessions", len(filtered_df))
col2.metric("Total Arrows", filtered_df["Shot Count"].sum())
if not filtered_df.empty:
    col3.metric("Avg Score", f"{filtered_df['Average Score'].mean():.2f}")
    # Best Score (PB)
    best_session = filtered_df.loc[filtered_df['Total Score'].idxmax()]
    col4.metric("Best Round", f"{best_session['Total Score']} ({best_session['Round']})")

tab1, tab2, tab3, tab4 = st.tabs(["🏆 Performance", "📊 Volume & Trends", "🏹 Arrow Analysis", "🔥 Heatmap"])

with tab1:
    st.subheader("Personal Bests")
    # Group by Round Type and find max score
    if not filtered_df.empty:
        pb_df = filtered_df.loc[filtered_df.groupby("Round")["Total Score"].idxmax()]
        pb_display = pb_df[["Round", "Total Score", "Date", "Average Score"]].sort_values("Total Score", ascending=False)
        st.dataframe(pb_display, use_container_width=True, hide_index=True)
    
    st.subheader("Score Progression")
    if not filtered_df.empty:
        # Add rolling average
        filtered_df = filtered_df.sort_values("Date")
        filtered_df["Rolling Avg"] = filtered_df["Average Score"].rolling(window=3, min_periods=1).mean()
        
        fig = px.line(filtered_df, x="Date", y="Average Score", color="Round", markers=True,
                      title="Average Arrow Score over Time")
        # Add rolling avg trace manually if needed, or just rely on the raw data
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.write("No data for selected filters.")

with tab2:
    st.subheader("Precision & Dispersion")
    st.markdown("Analyze the **quality** of your grouping beyond just the score.")
    
    if not filtered_df.empty:
        # 1. CEP 50 Chart
        st.markdown("#### Circular Error Probable (CEP 50)")
        st.caption("The radius (cm) that contains your best 50% of shots. Smaller is better.")
        fig_cep = px.line(filtered_df, x="Date", y="CEP 50 (cm)", color="Round", markers=True)
        fig_cep.update_layout(yaxis_autorange="reversed") # Down is good
        st.plotly_chart(fig_cep, use_container_width=True)
        
        # 2. Horizontal vs Vertical Spread
        st.markdown("#### Horizontal vs Vertical Spread")
        st.caption("Compare your lateral (Windage) error vs height (Elevation) error. Helps diagnose form issues.")
        
        # Melt for comparison
        spread_df = filtered_df.melt(id_vars=["Date", "Round"], value_vars=["Sigma X (cm)", "Sigma Y (cm)"], 
                                     var_name="Axis", value_name="Spread (StdDev)")
        
        fig_spread = px.line(spread_df, x="Date", y="Spread (StdDev)", color="Axis", line_dash="Round", markers=True)
        st.plotly_chart(fig_spread, use_container_width=True)
        
        st.info("""
        **Interpretation:**
        - **High Sigma X (Horizontal):** Plunger tension, release errors, or canting.
        - **High Sigma Y (Vertical):** Nocking point, grip pressure, or inconsistent draw length.
        """)

    st.divider()
    st.subheader("Training Volume")
    if not filtered_df.empty:
        # Resample by Week
        volume_df = filtered_df.set_index("Date").resample("W")["Shot Count"].sum().reset_index()
        fig_vol = px.bar(volume_df, x="Date", y="Shot Count", title="Arrows Shot per Week")
        st.plotly_chart(fig_vol, use_container_width=True)

with tab3:
    st.subheader("Arrow Consistency Analysis")
    st.markdown("Identify 'rogue' arrows that consistently score lower than your average.")
    
    if not filtered_shots.empty:
        # Filter out "Unknown" arrows
        arrow_stats = filtered_shots[filtered_shots["Arrow #"] != "Unknown"]
        
        if not arrow_stats.empty:
            # Box Plot of Score by Arrow Number
            fig_box = px.box(arrow_stats, x="Arrow #", y="Score", color="Arrow #", 
                             title="Score Distribution by Arrow Number")
            st.plotly_chart(fig_box, use_container_width=True)
            
            # Summary Table
            summary = arrow_stats.groupby("Arrow #")["Score"].agg(['count', 'mean', 'std']).sort_values("mean")
            summary.columns = ["Shots", "Avg Score", "Consistency (StdDev)"]
            st.dataframe(summary.style.highlight_min(subset=["Avg Score"], color="pink"), use_container_width=True)
        else:
            st.info("No arrow numbers recorded. Make sure to select specific arrows in the Session Logger.")
    else:
        st.info("No shot data available.")

with tab4:
    st.subheader("Aggregate Heatmap")
    st.write("Visualizing all shots from the selected sessions (Normalized).")
    
    if not filtered_shots.empty:
        # Normalize coordinates
        # We need to handle different face sizes. 
        # x_norm = x / (face_size / 2)
        
        filtered_shots["x_norm"] = filtered_shots["x"] / (filtered_shots["Face Size"] / 2.0)
        filtered_shots["y_norm"] = filtered_shots["y"] / (filtered_shots["Face Size"] / 2.0)
        
        # --- Outlier Filtering & Visualization Options ---
        col_opts1, col_opts2, col_opts3 = st.columns(3)
        with col_opts1:
            exclude_fliers = st.checkbox("Exclude Fliers (Outliers)", value=False, 
                                        help="Removes shots further than 2 Standard Deviations from the mean.")
        with col_opts2:
            show_heatmap = st.checkbox("Show Density Heatmap", value=True,
                                      help="Overlays a density contour map to show shot concentration.")
        with col_opts3:
            color_by = st.selectbox("Color Shots By", ["Uniform (Black)", "Arrow Number", "End Number"])
        
        if exclude_fliers:
            # Calculate initial mean and std dev
            mu_x, mu_y = filtered_shots["x_norm"].mean(), filtered_shots["y_norm"].mean()
            sigma_x, sigma_y = filtered_shots["x_norm"].std(), filtered_shots["y_norm"].std()
            
            # Filter: Keep shots within 2 sigma
            # Using simple rectangular bounds for simplicity, or radial Z-score?
            # Let's use radial distance from the initial center
            filtered_shots["dist_from_center"] = np.sqrt((filtered_shots["x_norm"] - mu_x)**2 + (filtered_shots["y_norm"] - mu_y)**2)
            sigma_r = filtered_shots["dist_from_center"].std()
            
            # Keep shots within 2 sigma of radial dispersion
            clean_shots = filtered_shots[filtered_shots["dist_from_center"] <= (2 * sigma_r)]
            fliers = filtered_shots[filtered_shots["dist_from_center"] > (2 * sigma_r)]
            
            st.caption(f"Excluded {len(fliers)} fliers from center calculation.")
            calc_df = clean_shots
        else:
            calc_df = filtered_shots
            fliers = pd.DataFrame()

        # Create a target face background
        fig = go.Figure()
        
        if show_heatmap:
            fig.add_trace(go.Histogram2dContour(
                x=filtered_shots["x_norm"],
                y=filtered_shots["y_norm"],
                colorscale="Hot",
                reversescale=True,
                xaxis="x",
                yaxis="y",
                ncontours=20,
                showscale=False,
                opacity=0.6
            ))
        
        # Add Individual Shots (Scatter)
        if color_by == "Uniform (Black)":
            fig.add_trace(go.Scatter(
                x=filtered_shots["x_norm"],
                y=filtered_shots["y_norm"],
                mode='markers',
                marker=dict(color='black', size=5, opacity=0.4),
                name="Shots",
                hoverinfo='skip'
            ))
        else:
            # Group by the selected column
            group_col = "Arrow #" if color_by == "Arrow Number" else "End #"
            
            # Get unique values and sort
            if group_col in filtered_shots.columns:
                groups = sorted(filtered_shots[group_col].unique())
                
                # Loop to create a trace for each group (auto-assigns colors)
                for g in groups:
                    subset = filtered_shots[filtered_shots[group_col] == g]
                    fig.add_trace(go.Scatter(
                        x=subset["x_norm"],
                        y=subset["y_norm"],
                        mode='markers',
                        marker=dict(size=7, opacity=0.8, line=dict(width=1, color='white')),
                        name=f"{group_col} {g}",
                        text=f"{group_col} {g}",
                        hoverinfo='text'
                    ))
            else:
                st.warning(f"Data for {group_col} not available.")
        
        # Calculate Group Center (Centroid) from potentially filtered data
        mean_x = calc_df["x_norm"].mean()
        mean_y = calc_df["y_norm"].mean()
        
        # Add Group Center Marker
        fig.add_trace(go.Scatter(
            x=[mean_x], y=[mean_y],
            mode='markers',
            marker=dict(color='cyan', size=15, symbol='cross', line=dict(color='black', width=2)),
            name="Group Center",
            hoverinfo='text',
            text=f"Center: ({mean_x:.2f}, {mean_y:.2f})"
        ))
        
        # If fliers excluded, maybe mark them differently?
        if not fliers.empty:
             fig.add_trace(go.Scatter(
                x=fliers["x_norm"],
                y=fliers["y_norm"],
                mode='markers',
                marker=dict(color='red', size=8, symbol='x-open'),
                name="Fliers (Excluded)",
                hoverinfo='text',
                text="Flier"
            ))

        fig.update_layout(
            width=600, height=600,
            xaxis=dict(range=[-1.2, 1.2], showgrid=False, visible=False),
            yaxis=dict(range=[-1.2, 1.2], showgrid=False, scaleanchor="x", scaleratio=1, visible=False),
            shapes=[
                dict(type="circle", xref="x", yref="y", x0=-1, y0=-1, x1=1, y1=1, line_color="black"),
                dict(type="circle", xref="x", yref="y", x0=-0.2, y0=-0.2, x1=0.2, y1=0.2, line_color="gold"),
            ],
            margin=dict(l=0, r=0, t=0, b=0),
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)"
        )
        
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.write("No shots found.")

