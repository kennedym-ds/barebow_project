import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from src.crawls import calculate_crawl_regression, predict_crawl, generate_crawl_chart
from src.models import TabSetup
from src.db import engine
from sqlmodel import Session, select

st.set_page_config(page_title="Crawl Manager", page_icon="📏")

st.title("📏 Crawl Manager")

st.markdown("""
**String Walking Calculator**: Enter your known crawls (e.g., 10m, 30m, 50m) and we will calculate the rest.
""")

# --- Sidebar: Tab Selection ---
with st.sidebar:
    st.header("Equipment")
    with Session(engine) as session:
        tabs = session.exec(select(TabSetup)).all()
    
    tab_options = {f"{t.make} {t.model}": t for t in tabs}
    selected_tab_name = st.selectbox("Select Tab", ["None"] + list(tab_options.keys()))
    
    selected_tab = tab_options[selected_tab_name] if selected_tab_name != "None" else None
    
    tab_marks = []
    if selected_tab and selected_tab.marks:
        try:
            tab_marks = [float(m.strip()) for m in selected_tab.marks.split(',')]
            st.success(f"Loaded {len(tab_marks)} marks from {selected_tab.name}")
        except:
            st.error("Error parsing tab marks.")

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
        
        # Find closest mark if tab selected
        if tab_marks:
            # Find closest mark
            closest_mark = min(tab_marks, key=lambda x: abs(x - predicted_crawl))
            diff = predicted_crawl - closest_mark
            
            if abs(diff) < 0.5:
                instruction = f"Use **Mark {tab_marks.index(closest_mark) + 1}** ({closest_mark}mm)"
            elif diff > 0:
                instruction = f"**Mark {tab_marks.index(closest_mark) + 1}** + {diff:.1f}mm (Lower)"
            else:
                instruction = f"**Mark {tab_marks.index(closest_mark) + 1}** - {abs(diff):.1f}mm (Higher)"
                
            st.info(instruction)
        
        # --- Visual Tab Renderer ---
        fig = go.Figure()
        
        # Tab Body
        fig.add_shape(type="rect", x0=-15, y0=0, x1=15, y1=80, fillcolor="#e0e0e0", line_color="black")
        
        # Nock (Top)
        fig.add_annotation(x=0, y=82, text="Nock", showarrow=False)
        
        # Stitches (Ruler)
        for i in range(0, 81, 5):
            y_pos = 80 - i
            fig.add_shape(type="line", x0=-5, y0=y_pos, x1=5, y1=y_pos, line=dict(color="grey"))
            if i % 10 == 0:
                fig.add_annotation(x=10, y=y_pos, text=str(i), showarrow=False, font=dict(size=8))

        # Draw User's Tab Marks (Zniper Pins)
        if tab_marks:
            for idx, mark in enumerate(tab_marks):
                y_pos = 80 - mark
                # Draw a distinct line or marker
                fig.add_shape(type="line", 
                    x0=-15, y0=y_pos, x1=15, y1=y_pos, 
                    line=dict(color="blue", width=2, dash="dot")
                )
                fig.add_annotation(
                    x=-18, y=y_pos, 
                    text=f"M{idx+1}", 
                    showarrow=False, 
                    font=dict(color="blue", size=10),
                    xanchor="right"
                )

        # The Crawl Indicator (Thumb Position)
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
        
        # --- Schematic Section ---
        with st.expander("🖨️ Detailed Schematic"):
            st.write("High-contrast schematic for checking mark positions.")
            
            schematic_fig = go.Figure()
            
            # Ruler (0-80mm)
            schematic_fig.add_shape(type="line", x0=0, y0=0, x1=0, y1=80, line=dict(color="black", width=2))
            
            for i in range(0, 81, 1):
                y = 80 - i
                if i % 10 == 0:
                    schematic_fig.add_shape(type="line", x0=0, y0=y, x1=10, y1=y, line=dict(color="black", width=2))
                    schematic_fig.add_annotation(x=12, y=y, text=f"{i}mm", showarrow=False, xanchor="left", font=dict(size=12, color="black"))
                elif i % 5 == 0:
                    schematic_fig.add_shape(type="line", x0=0, y0=y, x1=7, y1=y, line=dict(color="black", width=1))
                else:
                    schematic_fig.add_shape(type="line", x0=0, y0=y, x1=4, y1=y, line=dict(color="black", width=1))

            # User Marks
            if tab_marks:
                for idx, mark in enumerate(tab_marks):
                    y = 80 - mark
                    schematic_fig.add_shape(type="line", x0=-15, y0=y, x1=0, y1=y, line=dict(color="blue", width=2))
                    schematic_fig.add_annotation(x=-16, y=y, text=f"M{idx+1} ({mark})", showarrow=False, xanchor="right", font=dict(color="blue"))

            # Current Crawl
            c_y = 80 - predicted_crawl
            schematic_fig.add_shape(type="line", x0=-25, y0=c_y, x1=25, y1=c_y, line=dict(color="green", width=3, dash="dash"))
            schematic_fig.add_annotation(x=25, y=c_y, text=f"Crawl {predicted_crawl:.1f}mm", showarrow=False, xanchor="left", font=dict(color="green", size=14))

            schematic_fig.update_layout(
                title="Tab Schematic (0mm = Top Edge)",
                width=400, height=800,
                xaxis=dict(visible=False, range=[-40, 40]),
                yaxis=dict(visible=False, range=[-5, 85]),
                plot_bgcolor="white",
                margin=dict(l=10, r=10, t=40, b=10)
            )
            st.plotly_chart(schematic_fig)
            st.caption("Use the camera icon in the toolbar to download this image.")

    else:
        st.info("Add marks to see the visualizer.")

# --- Chart ---
if model:
    st.markdown("---")
    st.subheader("🖨️ Printable Crawl Card")
    
    # Generate full chart
    chart_data = generate_crawl_chart(model)
    chart_df = pd.DataFrame(chart_data, columns=["Distance (m)", "Crawl (mm)"])
    
    # Add "Mark" column if tab marks exist
    if tab_marks:
        def get_mark_instruction(crawl):
            closest_mark = min(tab_marks, key=lambda x: abs(x - crawl))
            diff = crawl - closest_mark
            idx = tab_marks.index(closest_mark) + 1
            
            if abs(diff) < 0.5:
                return f"M{idx}"
            elif diff > 0:
                return f"M{idx} + {diff:.1f}"
            else:
                return f"M{idx} - {abs(diff):.1f}"
        
        chart_df["Mark"] = chart_df["Crawl (mm)"].apply(get_mark_instruction)
    
    # Layout for printing: 2 Columns
    # We split the dataframe into two halves to make it compact
    mid = len(chart_df) // 2
    left_df = chart_df.iloc[:mid].reset_index(drop=True)
    right_df = chart_df.iloc[mid:].reset_index(drop=True)
    
    # Display as a styled HTML table that looks like a card
    st.markdown("### Crawl Card")
    
    # CSS for the card
    card_css = """
    <style>
        .crawl-card {
            border: 2px solid #333;
            border-radius: 10px;
            padding: 15px;
            background-color: white;
            color: black;
            font-family: sans-serif;
            width: 100%;
            max-width: 600px;
        }
        .crawl-header {
            text-align: center;
            font-weight: bold;
            font-size: 1.2em;
            margin-bottom: 10px;
            border-bottom: 2px solid #333;
            padding-bottom: 5px;
        }
        .crawl-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.9em;
        }
        .crawl-table th {
            border-bottom: 1px solid #666;
            text-align: left;
            padding: 4px;
        }
        .crawl-table td {
            border-bottom: 1px solid #eee;
            padding: 4px;
        }
        .crawl-row:nth-child(even) {
            background-color: #f9f9f9;
        }
        .mark-col {
            font-weight: bold;
            color: #0066cc;
        }
    </style>
    """
    
    # Generate HTML rows
    rows_html = ""
    # Iterate through the longer of the two dfs
    max_len = max(len(left_df), len(right_df))
    
    for i in range(max_len):
        # Left Side
        if i < len(left_df):
            l_row = left_df.iloc[i]
            l_mark = f'<span class="mark-col">{l_row["Mark"]}</span>' if "Mark" in l_row else ""
            left_html = f"<td>{l_row['Distance (m)']:.0f}m</td><td>{l_row['Crawl (mm)']:.1f}</td><td>{l_mark}</td>"
        else:
            left_html = "<td></td><td></td><td></td>"
            
        # Right Side
        if i < len(right_df):
            r_row = right_df.iloc[i]
            r_mark = f'<span class="mark-col">{r_row["Mark"]}</span>' if "Mark" in r_row else ""
            right_html = f"<td>{r_row['Distance (m)']:.0f}m</td><td>{r_row['Crawl (mm)']:.1f}</td><td>{r_mark}</td>"
        else:
            right_html = "<td></td><td></td><td></td>"
            
        rows_html += f"<tr class='crawl-row'>{left_html}<td style='width:20px;'></td>{right_html}</tr>"

    # Final HTML
    card_html = f"""
    {card_css}
    <div class="crawl-card">
        <div class="crawl-header">
            {selected_tab_name if selected_tab_name != "None" else "Barebow Crawls"}
        </div>
        <table class="crawl-table">
            <thead>
                <tr>
                    <th>Dist</th><th>Crawl</th><th>Mark</th>
                    <th></th>
                    <th>Dist</th><th>Crawl</th><th>Mark</th>
                </tr>
            </thead>
            <tbody>
                {rows_html}
            </tbody>
        </table>
        <div style="text-align: center; margin-top: 10px; font-size: 0.8em; color: #666;">
            Generated by Baretrack
        </div>
    </div>
    """
    
    st.markdown(card_html, unsafe_allow_html=True)
    st.caption("Tip: Take a screenshot of this card to print or save to your phone.")
