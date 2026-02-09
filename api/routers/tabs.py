"""Tab Setup CRUD endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session as SQLModelSession, select
from typing import List
from pydantic import BaseModel
from src.models import TabSetup
from api.deps import get_db

router = APIRouter()


class TabSetupCreate(BaseModel):
    """Schema for creating a tab setup."""
    make: str = "Zniper"
    model: str = "Barebow Tab"
    marks: str = ""


class TabSetupUpdate(BaseModel):
    """Schema for updating a tab setup."""
    make: str | None = None
    model: str | None = None
    marks: str | None = None


@router.get("", response_model=List[TabSetup])
def list_tabs(db: SQLModelSession = Depends(get_db)):
    """List all tab setups."""
    statement = select(TabSetup)
    results = db.exec(statement).all()
    return results


@router.get("/{tab_id}", response_model=TabSetup)
def get_tab(tab_id: str, db: SQLModelSession = Depends(get_db)):
    """Get a specific tab setup by ID."""
    tab = db.get(TabSetup, tab_id)
    if not tab:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tab setup not found")
    return tab


@router.post("", response_model=TabSetup, status_code=status.HTTP_201_CREATED)
def create_tab(tab_data: TabSetupCreate, db: SQLModelSession = Depends(get_db)):
    """Create a new tab setup."""
    # Auto-generate name from make and model
    name = f"{tab_data.make} {tab_data.model}"
    
    tab = TabSetup(
        name=name,
        **tab_data.model_dump()
    )
    
    db.add(tab)
    db.commit()
    db.refresh(tab)
    return tab


@router.put("/{tab_id}", response_model=TabSetup)
def update_tab(tab_id: str, tab_data: TabSetupUpdate, db: SQLModelSession = Depends(get_db)):
    """Update a tab setup."""
    tab = db.get(TabSetup, tab_id)
    if not tab:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tab setup not found")
    
    # Update only provided fields
    update_dict = tab_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(tab, key, value)
    
    # Regenerate name if make or model changed
    if "make" in update_dict or "model" in update_dict:
        tab.name = f"{tab.make} {tab.model}"
    
    db.add(tab)
    db.commit()
    db.refresh(tab)
    return tab


@router.delete("/{tab_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tab(tab_id: str, db: SQLModelSession = Depends(get_db)):
    """Delete a tab setup."""
    tab = db.get(TabSetup, tab_id)
    if not tab:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tab setup not found")
    
    db.delete(tab)
    db.commit()
    return None
