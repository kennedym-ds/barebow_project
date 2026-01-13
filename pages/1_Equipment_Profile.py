import streamlit as st
from src.models import BowSetup, ArrowSetup, TabSetup, LimbAlignment, ArrowShaft
from src.db import engine, create_db_and_tables
from sqlmodel import Session, select
from sqlalchemy import delete
import uuid
import pandas as pd

# Ensure DB exists
create_db_and_tables()

st.set_page_config(page_title="Equipment Profile", page_icon="🛠️")

st.title("🛠️ Equipment Profile")

tab1, tab2, tab3 = st.tabs(["Bow Setup", "Arrow Setup", "Tab Setup"])

with tab1:
    st.header("Bow Configuration")
    
    # Load existing bows
    with Session(engine) as session:
        bows = session.exec(select(BowSetup)).all()
    
    bow_map = {f"{b.name} ({b.riser_make}/{b.limbs_make})": b for b in bows}
    options = ["Create New"] + list(bow_map.keys())
    
    selected_option = st.selectbox("Select Profile to Edit", options)
    
    if selected_option != "Create New":
        current_bow = bow_map[selected_option]
        st.info(f"Editing: {current_bow.name}")
    else:
        current_bow = None
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Riser & Limbs")
        riser_make = st.text_input("Riser Make", value=current_bow.riser_make if current_bow else "Gillo")
        riser_model = st.text_input("Riser Model", value=current_bow.riser_model if current_bow else "G1")
        riser_length = st.number_input("Riser Length (in)", value=current_bow.riser_length_in if current_bow else 25.0)
        
        limbs_make = st.text_input("Limbs Make", value=current_bow.limbs_make if current_bow else "Uukha")
        limbs_model = st.text_input("Limbs Model", value=current_bow.limbs_model if current_bow else "Sx50")
        
        # Handle Enum/Selection defaults
        l_len_opts = ["Short", "Medium", "Long"]
        l_len_idx = l_len_opts.index(current_bow.limbs_length) if current_bow and current_bow.limbs_length in l_len_opts else 1
        limbs_length = st.selectbox("Limbs Length", l_len_opts, index=l_len_idx)
        
        limbs_poundage = st.number_input("Marked Poundage", value=current_bow.limbs_marked_poundage if current_bow else 36.0)

    with col2:
        st.subheader("Tuning Specs (The Physics)")
        draw_weight_otf = st.number_input("Draw Weight OTF (lbs)", value=current_bow.draw_weight_otf if current_bow else 38.0, help="Actual weight on the fingers")
        brace_height = st.number_input("Brace Height (in)", value=current_bow.brace_height_in if current_bow else 8.75)
        
        st.markdown("---")
        st.write("**Tiller**")
        tiller_top = st.number_input("Top Tiller (mm)", value=current_bow.tiller_top_mm if current_bow else 185.0)
        tiller_bottom = st.number_input("Bottom Tiller (mm)", value=current_bow.tiller_bottom_mm if current_bow else 185.0)
        
        t_type_opts = ["positive", "neutral", "negative"]
        t_type_idx = t_type_opts.index(current_bow.tiller_type) if current_bow and current_bow.tiller_type in t_type_opts else 1
        tiller_type = st.selectbox("Tiller Type", t_type_opts, index=t_type_idx)
        
        st.markdown("---")
        st.write("**Plunger**")
        plunger_tension = st.number_input("Spring Tension (1-10 or clicks)", value=current_bow.plunger_spring_tension if current_bow else 5.0)
        center_shot = st.number_input("Center Shot (mm)", value=current_bow.plunger_center_shot_mm if current_bow else 0.0)
        
        nock_height = st.number_input("Nocking Point Height (mm)", value=current_bow.nocking_point_height_mm if current_bow else 12.0)

    if st.button("Save Bow Profile"):
        try:
            # If editing, use existing ID, else generate new
            bow_id = current_bow.id if current_bow else str(uuid.uuid4())
            
            bow = BowSetup(
                id=bow_id,
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
            with Session(engine) as session:
                session.merge(bow) # merge handles both insert and update if ID exists
                session.commit()
                
            st.success(f"Saved Bow Profile: {bow.name}")
            st.rerun()
        except Exception as e:
            st.error(f"Error saving profile: {e}")

with tab2:
    st.header("Arrow Configuration")
    
    # Load existing arrows
    with Session(engine) as session:
        arrows = session.exec(select(ArrowSetup)).all()
        
    arrow_map = {f"{a.make} {a.model} ({a.spine})": a for a in arrows}
    a_options = ["Create New"] + list(arrow_map.keys())
    
    selected_a_option = st.selectbox("Select Arrow Profile to Edit", a_options)
    
    if selected_a_option != "Create New":
        current_arrow = arrow_map[selected_a_option]
        st.info(f"Editing: {current_arrow.make} {current_arrow.model}")
    else:
        current_arrow = None
    
    col1, col2 = st.columns(2)
    
    with col1:
        arrow_make = st.text_input("Make", value=current_arrow.make if current_arrow else "Easton")
        arrow_model = st.text_input("Model", value=current_arrow.model if current_arrow else "X23")
        spine = st.number_input("Static Spine", value=current_arrow.spine if current_arrow else 400.0, step=10.0)
        length = st.number_input("Length (in)", value=current_arrow.length_in if current_arrow else 30.0)
        
    with col2:
        point_weight = st.number_input("Point Weight (gr)", value=current_arrow.point_weight_gr if current_arrow else 150.0)
        total_weight = st.number_input("Total Arrow Weight (gr)", value=current_arrow.total_arrow_weight_gr if current_arrow else 450.0)
        diameter = st.number_input("Shaft Diameter (mm)", value=current_arrow.shaft_diameter_mm if current_arrow else 9.3)
        fletching = st.text_input("Fletching", value=current_arrow.fletching_type if current_arrow else "Feathers")
        nock = st.text_input("Nock", value=current_arrow.nock_type if current_arrow else "Beiter")
        arrow_count = st.number_input("Number of Arrows in Set", value=current_arrow.arrow_count if current_arrow else 12, min_value=1)

    if st.button("Save Arrow Profile"):
        try:
            arrow_id = current_arrow.id if current_arrow else str(uuid.uuid4())
            
            arrow = ArrowSetup(
                id=arrow_id,
                make=arrow_make,
                model=arrow_model,
                spine=spine,
                length_in=length,
                point_weight_gr=point_weight,
                total_arrow_weight_gr=total_weight,
                shaft_diameter_mm=diameter,
                fletching_type=fletching,
                nock_type=nock,
                arrow_count=arrow_count
            )
            with Session(engine) as session:
                session.merge(arrow)
                session.commit()
            
            st.success(f"Saved Arrow Profile: {arrow.make} {arrow.model}")
            st.rerun()
        except Exception as e:
            st.error(f"Error saving arrow: {e}")

    # Shaft Data Upload Section
    if current_arrow:
        st.markdown("---")
        st.subheader("Shaft Data (Consistency)")
        
        # CSV Uploader
        uploaded_file = st.file_uploader("Upload Shaft Data (CSV)", type=["csv"], help="Expected columns: No., grain, ASTM, straightness")
        
        if uploaded_file:
            try:
                df = pd.read_csv(uploaded_file, sep=";") # Assuming semi-colon from example, need to be robust
                
                # If separator is wrong, try comma
                if len(df.columns) <= 1:
                     uploaded_file.seek(0)
                     df = pd.read_csv(uploaded_file, sep=",")
                
                st.write("Preview:", df.head())
                
                if st.button("Import Shaft Data"):
                    # Map columns
                    # Example: No.;grain;gram;ASTM;AMO;straightness;...
                    
                    # Logic to import
                    # 1. Clear existing shafts for this arrow? Or Append? Let's clear for now to avoid dupes/confusion.
                    with Session(engine) as session:
                        # Delete existing shafts in bulk
                        session.exec(delete(ArrowShaft).where(ArrowShaft.arrow_setup_id == current_arrow.id))
                            
                        # Import new
                        for index, row in df.iterrows():
                            # Flexible column matching
                            try:
                                num = row.get("No.") or row.get("Number") or (index + 1)
                                weight = row.get("grain") or row.get("Weight")
                                spine = row.get("ASTM") or row.get("Spine")
                                straight = row.get("straightness") or 0.001
                                
                                shaft = ArrowShaft(
                                    arrow_setup_id=current_arrow.id,
                                    arrow_number=int(num),
                                    measured_weight_gr=float(weight) if weight else None,
                                    measured_spine_astm=float(spine) if spine else None,
                                    straightness=float(straight) if straight else None
                                )
                                session.add(shaft)
                            except Exception as parse_err:
                                st.warning(f"Skipping row {index}: {parse_err}")
                                
                        session.commit()
                        st.success(f"Imported {len(df)} shafts!")
                        st.rerun()
                        
            except Exception as e:
                st.error(f"Error parsing CSV: {e}")
                
        # Display Current Shaft Data
        with Session(engine) as session:
             # Refresh current_arrow to get shafts
             # Actually, need to fetch shafts via query since we passed current_arrow from a previous session context maybe
             shafts_db = session.exec(select(ArrowShaft).where(ArrowShaft.arrow_setup_id == current_arrow.id).order_by(ArrowShaft.arrow_number)).all()
             
             if shafts_db:
                 shaft_data = [{
                     "No": s.arrow_number,
                     "Weight (gr)": s.measured_weight_gr,
                     "Spine (ASTM)": s.measured_spine_astm,
                     "Straightness": s.straightness
                 } for s in shafts_db]
                 
                 st.dataframe(pd.DataFrame(shaft_data), use_container_width=True)
             else:
                 st.info("No detailed shaft data imported yet.")

with tab3:
    st.header("Tab Configuration")
    st.markdown("Configure your finger tab settings, especially for tabs with adjustable marks like the **Zniper**.")
    
    # Load existing tabs
    with Session(engine) as session:
        tabs = session.exec(select(TabSetup)).all()
        
    tab_map = {f"{t.make} {t.model}": t for t in tabs}
    t_options = ["Create New"] + list(tab_map.keys())
    
    selected_t_option = st.selectbox("Select Tab Profile to Edit", t_options)
    
    if selected_t_option != "Create New":
        current_tab = tab_map[selected_t_option]
        st.info(f"Editing: {current_tab.make} {current_tab.model}")
    else:
        current_tab = None
        
    col1, col2 = st.columns(2)
    
    with col1:
        tab_make = st.text_input("Tab Make", value=current_tab.make if current_tab else "Zniper")
        tab_model = st.text_input("Tab Model", value=current_tab.model if current_tab else "Barebow Tab")
        
    with col2:
        st.subheader("Mark Configuration")
        st.markdown("Enter the position of your marks in **mm** from the top edge (nock position), separated by commas.")
        st.caption("Example: 4.5, 9.0, 13.5, 18.0")
        
        marks_input = st.text_area("Marks (mm)", value=current_tab.marks if current_tab else "5.0, 10.0, 15.0")
        
    if st.button("Save Tab Profile"):
        try:
            tab_id = current_tab.id if current_tab else str(uuid.uuid4())
            
            # Validate marks
            try:
                # Just check if it parses, but store as string
                if marks_input.strip():
                    [float(m.strip()) for m in marks_input.split(',')]
            except ValueError:
                st.error("Invalid format for Marks. Please use numbers separated by commas.")
                st.stop()
            
            tab = TabSetup(
                id=tab_id,
                name=f"{tab_make} {tab_model}",
                make=tab_make,
                model=tab_model,
                marks=marks_input
            )
            
            with Session(engine) as session:
                session.merge(tab)
                session.commit()
                
            st.success(f"Saved Tab Profile: {tab.name}")
            st.rerun()
        except Exception as e:
            st.error(f"Error saving tab: {e}")
