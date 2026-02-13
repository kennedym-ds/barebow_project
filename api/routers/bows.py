"""Bow Setup CRUD endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session as SQLModelSession
from sqlmodel import select

from api.deps import get_db
from src.models import BowSetup

router = APIRouter()


class BowSetupCreate(BaseModel):
    """Schema for creating a bow setup."""

    riser_make: str
    riser_model: str
    riser_length_in: float
    limbs_make: str
    limbs_model: str
    limbs_length: str
    limbs_marked_poundage: float
    draw_weight_otf: float
    brace_height_in: float
    tiller_top_mm: float
    tiller_bottom_mm: float
    tiller_type: str
    plunger_spring_tension: float
    plunger_center_shot_mm: float
    nocking_point_height_mm: float
    riser_weights: str = ""
    limb_alignment: str = "Straight"
    total_mass_g: float = 0
    string_material: str = ""
    strand_count: int = 16


class BowSetupUpdate(BaseModel):
    """Schema for updating a bow setup (all fields optional)."""

    riser_make: str | None = None
    riser_model: str | None = None
    riser_length_in: float | None = None
    limbs_make: str | None = None
    limbs_model: str | None = None
    limbs_length: str | None = None
    limbs_marked_poundage: float | None = None
    draw_weight_otf: float | None = None
    brace_height_in: float | None = None
    tiller_top_mm: float | None = None
    tiller_bottom_mm: float | None = None
    tiller_type: str | None = None
    plunger_spring_tension: float | None = None
    plunger_center_shot_mm: float | None = None
    nocking_point_height_mm: float | None = None
    riser_weights: str | None = None
    limb_alignment: str | None = None
    total_mass_g: float | None = None
    string_material: str | None = None
    strand_count: int | None = None


@router.get("", response_model=list[BowSetup])
def list_bows(db: SQLModelSession = Depends(get_db)):
    """List all bow setups."""
    statement = select(BowSetup)
    results = db.exec(statement).all()
    return results


@router.get("/{bow_id}", response_model=BowSetup)
def get_bow(bow_id: str, db: SQLModelSession = Depends(get_db)):
    """Get a specific bow setup by ID."""
    bow = db.get(BowSetup, bow_id)
    if not bow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bow setup not found")
    return bow


@router.post("", response_model=BowSetup, status_code=status.HTTP_201_CREATED)
def create_bow(bow_data: BowSetupCreate, db: SQLModelSession = Depends(get_db)):
    """Create a new bow setup."""
    # Auto-generate name from riser and limbs
    name = f"{bow_data.riser_make} {bow_data.riser_model} / {bow_data.limbs_make} {bow_data.limbs_model}"

    bow = BowSetup(name=name, **bow_data.model_dump())

    db.add(bow)
    db.commit()
    db.refresh(bow)
    return bow


@router.put("/{bow_id}", response_model=BowSetup)
def update_bow(bow_id: str, bow_data: BowSetupUpdate, db: SQLModelSession = Depends(get_db)):
    """Update a bow setup."""
    bow = db.get(BowSetup, bow_id)
    if not bow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bow setup not found")

    # Update only provided fields
    update_dict = bow_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(bow, key, value)

    # Regenerate name if key fields were updated
    if any(k in update_dict for k in ["riser_make", "riser_model", "limbs_make", "limbs_model"]):
        bow.name = f"{bow.riser_make} {bow.riser_model} / {bow.limbs_make} {bow.limbs_model}"

    db.add(bow)
    db.commit()
    db.refresh(bow)
    return bow


@router.delete("/{bow_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bow(bow_id: str, db: SQLModelSession = Depends(get_db)):
    """Delete a bow setup."""
    bow = db.get(BowSetup, bow_id)
    if not bow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bow setup not found")

    db.delete(bow)
    db.commit()
    return None
