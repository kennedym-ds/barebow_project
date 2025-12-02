import streamlit as st
from src.models import BowSetup, ArrowSetup, LimbAlignment
import uuid

st.set_page_config(page_title="Equipment Profile", page_icon="🛠️")

st.title("🛠️ Equipment Profile")

tab1, tab2 = st.tabs(["Bow Setup", "Arrow Setup"])

with tab1:
    st.header("Bow Configuration")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Riser & Limbs")
        riser_make = st.text_input("Riser Make", "Gillo")
        riser_model = st.text_input("Riser Model", "G1")
        riser_length = st.number_input("Riser Length (in)", value=25.0)
        
        limbs_make = st.text_input("Limbs Make", "Uukha")
        limbs_model = st.text_input("Limbs Model", "Sx50")
        limbs_length = st.selectbox("Limbs Length", ["Short", "Medium", "Long"], index=1)
        limbs_poundage = st.number_input("Marked Poundage", value=36.0)

    with col2:
        st.subheader("Tuning Specs (The Physics)")
        draw_weight_otf = st.number_input("Draw Weight OTF (lbs)", value=38.0, help="Actual weight on the fingers")
        brace_height = st.number_input("Brace Height (in)", value=8.75)
        
        st.markdown("---")
        st.write("**Tiller**")
        tiller_top = st.number_input("Top Tiller (mm)", value=185.0)
        tiller_bottom = st.number_input("Bottom Tiller (mm)", value=185.0)
        tiller_type = st.selectbox("Tiller Type", ["positive", "neutral", "negative"], index=1)
        
        st.markdown("---")
        st.write("**Plunger**")
        plunger_tension = st.number_input("Spring Tension (1-10 or clicks)", value=5.0)
        center_shot = st.number_input("Center Shot (mm)", value=0.0)
        
        nock_height = st.number_input("Nocking Point Height (mm)", value=12.0)

    if st.button("Save Bow Profile"):
        try:
            bow = BowSetup(
                id=str(uuid.uuid4()),
                name=f"{riser_make} - {limbs_make}",
                riser_make=riser_make,
                riser_model=riser_model,
                riser_length_in=riser_length,
                limbs_make=limbs_make,
                limbs_model=limbs_model,
                limbs_length=limbs_length,
                limbs_marked_poundage=limbs_poundage,
                draw_weight_otf=draw_weight_otf,
                brace_height_in=brace_height,
                tiller_top_mm=tiller_top,
                tiller_bottom_mm=tiller_bottom,
                tiller_type=tiller_type,
                plunger_spring_tension=plunger_tension,
                plunger_center_shot_mm=center_shot,
                nocking_point_height_mm=nock_height
            )
            st.success(f"Saved Bow Profile: {bow.name}")
            st.json(bow.model_dump())
        except Exception as e:
            st.error(f"Error saving profile: {e}")

with tab2:
    st.header("Arrow Configuration")
    
    col1, col2 = st.columns(2)
    
    with col1:
        arrow_make = st.text_input("Make", "Easton")
        arrow_model = st.text_input("Model", "X23")
        spine = st.number_input("Static Spine", value=400.0, step=10.0)
        length = st.number_input("Length (in)", value=30.0)
        
    with col2:
        point_weight = st.number_input("Point Weight (gr)", value=150.0)
        total_weight = st.number_input("Total Arrow Weight (gr)", value=450.0)
        diameter = st.number_input("Shaft Diameter (mm)", value=9.3)
        fletching = st.text_input("Fletching", "Feathers")
        nock = st.text_input("Nock", "Beiter")

    if st.button("Save Arrow Profile"):
        try:
            arrow = ArrowSetup(
                id=str(uuid.uuid4()),
                make=arrow_make,
                model=arrow_model,
                spine=spine,
                length_in=length,
                point_weight_gr=point_weight,
                total_arrow_weight_gr=total_weight,
                shaft_diameter_mm=diameter,
                fletching_type=fletching,
                nock_type=nock
            )
            st.success(f"Saved Arrow Profile: {arrow.make} {arrow.model}")
            st.json(arrow.model_dump())
        except Exception as e:
            st.error(f"Error saving arrow: {e}")
