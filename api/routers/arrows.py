"""Arrow Setup CRUD endpoints with shaft sub-resource."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session as SQLModelSession, select, delete
from typing import List
from pydantic import BaseModel
from src.models import ArrowSetup, ArrowShaft
from api.deps import get_db

router = APIRouter()


class ArrowSetupCreate(BaseModel):
    """Schema for creating an arrow setup."""
    make: str
    model: str
    spine: float
    length_in: float
    point_weight_gr: float
    total_arrow_weight_gr: float
    shaft_diameter_mm: float
    fletching_type: str
    nock_type: str
    arrow_count: int = 12


class ArrowSetupUpdate(BaseModel):
    """Schema for updating an arrow setup."""
    make: str | None = None
    model: str | None = None
    spine: float | None = None
    length_in: float | None = None
    point_weight_gr: float | None = None
    total_arrow_weight_gr: float | None = None
    shaft_diameter_mm: float | None = None
    fletching_type: str | None = None
    nock_type: str | None = None
    arrow_count: int | None = None


class ArrowShaftData(BaseModel):
    """Schema for shaft data."""
    arrow_number: int
    measured_weight_gr: float | None = None
    measured_spine_astm: float | None = None
    straightness: float | None = None


@router.get("", response_model=List[ArrowSetup])
def list_arrows(db: SQLModelSession = Depends(get_db)):
    """List all arrow setups."""
    statement = select(ArrowSetup)
    results = db.exec(statement).all()
    return results


@router.get("/{arrow_id}", response_model=ArrowSetup)
def get_arrow(arrow_id: str, db: SQLModelSession = Depends(get_db)):
    """Get a specific arrow setup by ID (includes shafts)."""
    arrow = db.get(ArrowSetup, arrow_id)
    if not arrow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arrow setup not found")
    return arrow


@router.post("", response_model=ArrowSetup, status_code=status.HTTP_201_CREATED)
def create_arrow(arrow_data: ArrowSetupCreate, db: SQLModelSession = Depends(get_db)):
    """Create a new arrow setup."""
    arrow = ArrowSetup(**arrow_data.model_dump())
    
    db.add(arrow)
    db.commit()
    db.refresh(arrow)
    return arrow


@router.put("/{arrow_id}", response_model=ArrowSetup)
def update_arrow(arrow_id: str, arrow_data: ArrowSetupUpdate, db: SQLModelSession = Depends(get_db)):
    """Update an arrow setup."""
    arrow = db.get(ArrowSetup, arrow_id)
    if not arrow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arrow setup not found")
    
    # Update only provided fields
    update_dict = arrow_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(arrow, key, value)
    
    db.add(arrow)
    db.commit()
    db.refresh(arrow)
    return arrow


@router.delete("/{arrow_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_arrow(arrow_id: str, db: SQLModelSession = Depends(get_db)):
    """Delete an arrow setup (cascades to shafts)."""
    arrow = db.get(ArrowSetup, arrow_id)
    if not arrow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arrow setup not found")
    
    db.delete(arrow)
    db.commit()
    return None


# Shaft sub-resource endpoints

@router.post("/{arrow_id}/shafts", response_model=List[ArrowShaft], status_code=status.HTTP_201_CREATED)
def import_shafts(arrow_id: str, shafts: List[ArrowShaftData], db: SQLModelSession = Depends(get_db)):
    """Import shaft data for an arrow setup."""
    arrow = db.get(ArrowSetup, arrow_id)
    if not arrow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arrow setup not found")
    
    # Create shaft records
    created_shafts = []
    for shaft_data in shafts:
        shaft = ArrowShaft(
            arrow_setup_id=arrow_id,
            **shaft_data.model_dump()
        )
        db.add(shaft)
        created_shafts.append(shaft)
    
    db.commit()
    
    # Re-query all shafts in one statement instead of N refreshes
    statement = select(ArrowShaft).where(ArrowShaft.arrow_setup_id == arrow_id)
    return db.exec(statement).all()


@router.get("/{arrow_id}/shafts", response_model=List[ArrowShaft])
def get_shafts(arrow_id: str, db: SQLModelSession = Depends(get_db)):
    """Get all shafts for an arrow setup."""
    arrow = db.get(ArrowSetup, arrow_id)
    if not arrow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arrow setup not found")
    
    statement = select(ArrowShaft).where(ArrowShaft.arrow_setup_id == arrow_id)
    results = db.exec(statement).all()
    return results


@router.delete("/{arrow_id}/shafts", status_code=status.HTTP_204_NO_CONTENT)
def clear_shafts(arrow_id: str, db: SQLModelSession = Depends(get_db)):
    """Delete all shafts for an arrow setup."""
    arrow = db.get(ArrowSetup, arrow_id)
    if not arrow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arrow setup not found")
    
    db.exec(delete(ArrowShaft).where(ArrowShaft.arrow_setup_id == arrow_id))
    db.commit()
    return None
