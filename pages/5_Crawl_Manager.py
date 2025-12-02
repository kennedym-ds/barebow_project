import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from src.crawls import calculate_crawl_regression, predict_crawl, generate_crawl_chart

st.set_page_config(page_title="Crawl Manager", page_icon="📏")

st.title("📏 Crawl Manager")

st.markdown("""
**String Walking Calculator**: Enter your known crawls (e.g., 10m, 30m, 50m) and we will calculate the rest.
""")

# --- Input Section ---
if 'crawl_data' not in st.session_state:
    st.session_state.crawl_data = [
        {"distance": 10, "crawl": 25.0},
        {"distance": 30, "crawl": 10.0},
        {"distance": 50, "crawl": 0.0}
    ]

col1, col2 = st.columns([1, 2])

with col1:
    st.subheader("Known Marks")
    
    # Editable Dataframe
    df = pd.DataFrame(st.session_state.crawl_data)
    edited_df = st.data_editor(df, num_rows="dynamic", key="crawl_editor")
    
    # Update session state
    st.session_state.crawl_data = edited_df.to_dict('records')
    
    # Calculate Model
    distances = [float(r['distance']) for r in st.session_state.crawl_data if r['distance']]
    crawls = [float(r['crawl']) for r in st.session_state.crawl_data if r['distance']]
    
    if len(distances) >= 2:
        model = calculate_crawl_regression(distances, crawls)
        st.success("Model Calculated!")
    else:
        st.warning("Enter at least 2 marks to calculate.")
        model = None

with col2:
    st.subheader("Visual Tab")
    
    target_dist = st.slider("Target Distance (m)", 5, 60, 18)
    
    if model:
        predicted_crawl = predict_crawl(model, target_dist)
        st.metric(f"Crawl for {target_dist}m", f"{predicted_crawl:.1f} mm")
        
        # --- Visual Tab Renderer ---
        fig = go.Figure()
        
        # Draw Tab Plate (Rectangle)
        fig.add_shape(type="rect",
            x0=-20, y0=0, x1=20, y1=80,
            line=dict(color="black"), fillcolor="lightgrey"
        )
        
        # Draw Stitch Marks (every 5mm)
        for i in range(0, 85, 5):
            fig.add_shape(type="line",
                x0=-10, y0=i, x1=10, y1=i,
                line=dict(color="grey", width=1)
            )
            
        # Draw String (Vertical Line)
        fig.add_shape(type="line",
            x0=0, y0=-10, x1=0, y1=90,
            line=dict(color="white", width=3)
        )
        
        # Draw Nock Point (Reference 0)
        fig.add_shape(type="circle",
            x0=-2, y0=-2, x1=2, y1=2,
            fillcolor="red", line_color="red"
        )
        
        # Draw Thumb Position (The Crawl)
        # Crawl is distance DOWN from nock. So y = +crawl
        thumb_y = predicted_crawl
        
        fig.add_shape(type="rect",
            x0=-25, y0=thumb_y, x1=25, y1=thumb_y+15, # Thumb is ~15mm wide
            fillcolor="rgba(0, 255, 0, 0.5)", line_color="green"
        )
        
        fig.add_annotation(
            x=30, y=thumb_y + 7.5,
            text="Thumb",
            showarrow=False,
            font=dict(color="green")
        )
        
        # Invert Y axis so 0 is at top (Nock) and positive goes down?
        # Actually standard graph: Y goes up.
        # Let's say Nock is at Top (80). Crawl 20mm means Thumb at 60.
        # Let's re-orient: Nock at Y=80.
        # 0mm Crawl = Thumb top edge at 80.
        # 20mm Crawl = Thumb top edge at 60.
        
        # Re-drawing with correct orientation
        fig = go.Figure()
        
        # Tab Body
        fig.add_shape(type="rect", x0=-15, y0=0, x1=15, y1=80, fillcolor="#e0e0e0", line_color="black")
        
        # Nock (Top)
        fig.add_annotation(x=0, y=82, text="Nock", showarrow=False)
        
        # Stitches (Ruler)
        for i in range(0, 81, 5):
            # i is mm from bottom.
            # We want mm from top.
            y_pos = 80 - i
            fig.add_shape(type="line", x0=-5, y0=y_pos, x1=5, y1=y_pos, line=dict(color="grey"))
            if i % 10 == 0:
                fig.add_annotation(x=10, y=y_pos, text=str(i), showarrow=False, font=dict(size=8))

        # The Crawl Indicator
        # Crawl is mm down from 80.
        thumb_top = 80 - predicted_crawl
        
        fig.add_shape(type="rect",
            x0=-20, y0=thumb_top - 10, x1=20, y1=thumb_top, # Thumb below the line
            fillcolor="rgba(50, 205, 50, 0.6)", line_color="green"
        )
        
        fig.update_layout(
            width=300, height=600,
            xaxis=dict(visible=False, range=[-30, 30]),
            yaxis=dict(visible=False, range=[-10, 90]),
            margin=dict(l=0, r=0, t=20, b=0),
            title="Tab View"
        )
        
        st.plotly_chart(fig)
        
    else:
        st.info("Add marks to see the visualizer.")

# --- Chart ---
if model:
    st.subheader("Cheat Sheet")
    chart_data = generate_crawl_chart(model)
    chart_df = pd.DataFrame(chart_data, columns=["Distance (m)", "Crawl (mm)"])
    
    # Transpose for printing
    st.dataframe(chart_df.T)
