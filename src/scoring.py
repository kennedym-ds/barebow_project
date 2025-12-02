import math
import plotly.graph_objects as go

def get_ring_score(radius_cm: float, face_size_cm: int) -> int:
    """
    Calculates the score based on the distance from center (radius_cm).
    Standard WA Target Face (1-10 rings).
    Ring width = Face Diameter / 20.
    """
    ring_width = face_size_cm / 20.0
    
    # Ring 10 outer edge = 1 * ring_width
    # Ring 9 outer edge = 2 * ring_width
    # ...
    # Ring 1 outer edge = 10 * ring_width
    
    # If radius is 0, score is 10 (X)
    if radius_cm < 0: return 0 # Should not happen
    
    ring_index = math.ceil(radius_cm / ring_width)
    
    if ring_index <= 1:
        # Check for X-ring (usually half the size of 10 ring for compound, but often tracked for all)
        # For simplicity, let's just return 10. X-count logic can be separate.
        return 10
    elif ring_index <= 10:
        return 11 - ring_index
    else:
        return 0 # Miss

def create_target_face(face_size_cm: int = 40):
    """
    Generates a Plotly Figure representing a standard WA target face.
    """
    fig = go.Figure()
    
    # Colors for standard WA face: Yellow (10,9), Red (8,7), Blue (6,5), Black (4,3), White (2,1)
    colors = ['#FFFF00', '#FFFF00', '#FF0000', '#FF0000', '#0000FF', '#0000FF', '#000000', '#000000', '#FFFFFF', '#FFFFFF']
    line_colors = ['#D3D3D3'] * 10 # Light grey lines
    
    ring_width = face_size_cm / 20.0
    
    # Draw rings from outside in (1 to 10) so smaller ones overlay larger ones
    for i in range(10, 0, -1):
        radius = i * ring_width
        color = colors[10-i]
        
        # For Black rings (3,4), text should be white. For others black.
        # Actually we are just drawing shapes.
        
        fig.add_shape(
            type="circle",
            xref="x", yref="y",
            x0=-radius, y0=-radius, x1=radius, y1=radius,
            fillcolor=color,
            line_color="black" if i > 2 else "grey", # Black line for most, grey for white rings
            line_width=1,
            layer="below"
        )
        
    # Add X-ring (Inner 10) - usually half the size of 10 ring
    x_radius = ring_width / 2
    fig.add_shape(
        type="circle",
        xref="x", yref="y",
        x0=-x_radius, y0=-x_radius, x1=x_radius, y1=x_radius,
        line_color="black",
        line_width=0.5,
        layer="below"
    )

    # Set layout to be square and fixed
    limit = face_size_cm / 2 * 1.1 # 10% margin
    fig.update_layout(
        xaxis=dict(range=[-limit, limit], showgrid=False, zeroline=False, visible=False),
        yaxis=dict(range=[-limit, limit], showgrid=False, zeroline=False, visible=False, scaleanchor="x", scaleratio=1),
        width=600, height=600,
        margin=dict(l=0, r=0, t=0, b=0),
        plot_bgcolor="rgba(0,0,0,0)",
        dragmode=False # We will handle clicks via Streamlit event
    )
    
    return fig
