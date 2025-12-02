import pytest
from src.models import BowSetup, ArrowSetup, LimbAlignment
from pydantic import ValidationError

def test_bow_setup_creation():
    bow = BowSetup(
        id="test-bow-1",
        name="My Barebow",
        riser_make="Gillo",
        riser_model="G1",
        riser_length_in=25,
        limbs_make="Uukha",
        limbs_model="Sx50",
        limbs_length="Long",
        limbs_marked_poundage=36,
        draw_weight_otf=38.5,
        brace_height_in=8.75,
        tiller_top_mm=185,
        tiller_bottom_mm=185,
        tiller_type="neutral",
        plunger_spring_tension=5.5,
        plunger_center_shot_mm=0,
        nocking_point_height_mm=12,
        riser_weights="Internal 6 weights",
        limb_alignment=LimbAlignment.STRAIGHT
    )
    
    assert bow.draw_weight_otf == 38.5
    assert bow.tiller_type == "neutral"
    assert bow.plunger_spring_tension == 5.5

def test_arrow_setup_creation():
    arrow = ArrowSetup(
        id="test-arrow-1",
        make="Easton",
        model="X23",
        spine=400,
        length_in=30.5,
        point_weight_gr=150,
        total_arrow_weight_gr=450,
        shaft_diameter_mm=9.3,
        fletching_type="Feathers",
        nock_type="Beiter"
    )
    
    assert arrow.total_arrow_weight_gr == 450
    assert arrow.shaft_diameter_mm == 9.3

