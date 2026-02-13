import math

import numpy as np
import plotly.graph_objects as go


def get_ring_score(radius_cm, face_size_cm, x_is_11=False):
    """
    Calculates the score based on the distance from center (radius_cm).
    Standard WA Target Face (1-10 rings).
    Ring width = Face Diameter / 20.
    """
    ring_width = face_size_cm / 20.0

    # Guard against zero face size
    if ring_width <= 0:
        return 0

    # Ring 10 outer edge = 1 * ring_width
    # Ring 9 outer edge = 2 * ring_width
    # ...
    # Ring 1 outer edge = 10 * ring_width

    # If radius is 0, score is 10 (X)
    if radius_cm < 0:
        return 0  # Should not happen

    ring_index = math.ceil(radius_cm / ring_width)

    if ring_index <= 1:
        # Check for X-ring (usually half the size of 10 ring for compound, but often tracked for all)
        # X-ring radius is half of 10-ring radius (which is ring_width)
        if x_is_11 and radius_cm <= (ring_width / 2):
            return 11
        return 10
    elif ring_index <= 10:
        return 11 - ring_index
    else:
        return 0  # Miss


def get_flint_score(radius_cm: float, face_size_cm: int) -> int:
    """
    Calculates score for IFAA Flint/Field rounds (5, 4, 3).
    Standard dimensions:
    35cm Face (Yards): 5 (7cm), 4 (14cm), 3 (21cm)
    20cm Face (Feet): 5 (4cm), 4 (8cm), 3 (12cm)

    Ratios are consistent:
    5-ring diameter = Face Size * 0.2
    4-ring diameter = Face Size * 0.4
    3-ring diameter = Face Size * 0.6
    """
    # Diameters relative to "Face Size" (which is usually the paper size, e.g., 35cm or 20cm)
    # Actually, for IFAA:
    # 35cm target: 5 ring is 7cm. 7/35 = 0.2
    # 20cm target: 5 ring is 4cm. 4/20 = 0.2

    # Radii
    r5 = (face_size_cm * 0.2) / 2
    r4 = (face_size_cm * 0.4) / 2
    r3 = (face_size_cm * 0.6) / 2

    if radius_cm <= r5:
        return 5
    elif radius_cm <= r4:
        return 4
    elif radius_cm <= r3:
        return 3
    else:
        return 0


def create_target_face(face_size_cm: int = 40, face_type: str = "WA"):
    """
    Generates a Plotly Figure representing a target face.
    face_type: "WA" (1-10), "Flint" (3-5)
    """
    fig = go.Figure()
    shapes = []

    if face_type == "Flint":
        # IFAA Flint/Field Colors: Black center (5), White (4), Black (3)

        # Radii
        r5 = (face_size_cm * 0.2) / 2
        r4 = (face_size_cm * 0.4) / 2
        r3 = (face_size_cm * 0.6) / 2

        # Shapes (Outer to Inner)
        shapes.append(
            dict(type="circle", x0=-r3, y0=-r3, x1=r3, y1=r3, fillcolor="black", line_color="black", layer="below")
        )
        shapes.append(
            dict(type="circle", x0=-r4, y0=-r4, x1=r4, y1=r4, fillcolor="white", line_color="black", layer="below")
        )
        shapes.append(
            dict(type="circle", x0=-r5, y0=-r5, x1=r5, y1=r5, fillcolor="black", line_color="white", layer="below")
        )

        # X Ring (White X in center) - Optional
        rx = r5 * 0.5
        shapes.append(dict(type="circle", x0=-rx, y0=-rx, x1=rx, y1=rx, line_color="white", layer="below"))

        fig.add_annotation(x=0, y=0, text="X", showarrow=False, font=dict(color="white", size=20))

        max_r = r3 * 1.1

    else:
        # Standard WA
        colors = [
            "#FFFF00",
            "#FFFF00",
            "#FF0000",
            "#FF0000",
            "#0000FF",
            "#0000FF",
            "#000000",
            "#000000",
            "#FFFFFF",
            "#FFFFFF",
        ]

        ring_width = face_size_cm / 20.0

        # Draw rings from outside in (1 to 10)
        for i in range(10, 0, -1):
            radius = i * ring_width
            color = colors[i - 1]

            shapes.append(
                dict(
                    type="circle",
                    x0=-radius,
                    y0=-radius,
                    x1=radius,
                    y1=radius,
                    fillcolor=color,
                    line_color="#D3D3D3",
                    layer="below",
                    line_width=1,
                )
            )

        # Add X-ring (Inner 10) boundary
        x_radius = 0.5 * ring_width
        shapes.append(
            dict(
                type="circle",
                x0=-x_radius,
                y0=-x_radius,
                x1=x_radius,
                y1=x_radius,
                line_color="#D3D3D3",
                layer="below",
                line_width=1,
            )
        )

        fig.add_annotation(x=0, y=0, text="+", showarrow=False, font=dict(color="black", size=10))

        max_r = (face_size_cm / 2) * 1.05

    fig.update_layout(shapes=shapes)

    # --- Interaction Layer (Transparent Heatmap) ---
    # Create a grid covering the target
    grid_size = 200
    x = np.linspace(-max_r, max_r, grid_size)
    y = np.linspace(-max_r, max_r, grid_size)
    X, Y = np.meshgrid(x, y)

    # Calculate radius for each point
    R = np.sqrt(X**2 + Y**2)

    if face_type == "Flint":
        conditions = [R <= r5, R <= r4, R <= r3]
        choices = [5, 4, 3]
        scores = np.select(conditions, choices, default=0)
        hover_text = np.char.add("Score: ", scores.astype(str))
        # Mark Miss
        hover_text = np.where(scores == 0, "Miss", hover_text)

    else:
        # WA Logic
        ring_indices = np.ceil(R / ring_width)
        scores = 11 - ring_indices
        scores = np.where(scores < 1, 0, scores)
        scores = np.where(scores > 10, 10, scores)

        hover_text = np.char.add("Score: ", scores.astype(int).astype(str))

        # Add X label
        is_x = R <= (0.5 * ring_width)
        hover_text = np.where(is_x, "Score: X", hover_text)

        # Handle Miss
        is_miss = R > (10 * ring_width)
        hover_text = np.where(is_miss, "Miss", hover_text)

    fig.add_trace(
        go.Heatmap(
            x=x,
            y=y,
            z=np.zeros_like(R),
            text=hover_text,
            hoverinfo="text",
            showscale=False,
            opacity=0.01,  # Almost invisible but interactive
            name="Target",
        )
    )

    fig.update_xaxes(range=[-max_r, max_r], showgrid=False, zeroline=False, visible=False)
    fig.update_yaxes(
        range=[-max_r, max_r], showgrid=False, zeroline=False, visible=False, scaleanchor="x", scaleratio=1
    )

    fig.update_layout(
        width=600,
        height=600,
        margin=dict(l=0, r=0, t=0, b=0),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        dragmode=False,
        showlegend=False,
    )

    return fig
