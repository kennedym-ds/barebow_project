"""Tab Setup CRUD endpoints."""
import os
import uuid as uuid_mod
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlmodel import Session as SQLModelSession, select
from typing import List, Optional
from pydantic import BaseModel
from src.models import TabSetup
from api.deps import get_db

router = APIRouter()

UPLOAD_DIR = Path("uploads/tabs")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


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
    nock_y_px: float | None = None
    scale_mm_per_px: float | None = None


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
    
    # Clean up image file if present
    if tab.tab_image_path:
        img_path = UPLOAD_DIR / tab.tab_image_path
        if img_path.exists():
            img_path.unlink()
    
    db.delete(tab)
    db.commit()
    return None


@router.post("/{tab_id}/image", response_model=TabSetup)
def upload_tab_image(
    tab_id: str,
    file: UploadFile = File(...),
    db: SQLModelSession = Depends(get_db),
):
    """Upload a photo of the tab face."""
    tab = db.get(TabSetup, tab_id)
    if not tab:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tab setup not found")
    
    # Validate content type
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, or WebP images are accepted")
    
    # Delete old image if exists
    if tab.tab_image_path:
        old_path = UPLOAD_DIR / tab.tab_image_path
        if old_path.exists():
            old_path.unlink()
    
    # Save with unique filename — only allow safe extensions
    ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "jpg"
    if ext not in ALLOWED_EXTENSIONS:
        ext = "jpg"
    filename = f"{tab_id}_{uuid_mod.uuid4().hex[:8]}.{ext}"
    dest = UPLOAD_DIR / filename
    
    contents = file.file.read()
    dest.write_bytes(contents)
    
    tab.tab_image_path = filename
    db.add(tab)
    db.commit()
    db.refresh(tab)
    return tab


@router.get("/{tab_id}/image")
def get_tab_image(tab_id: str, db: SQLModelSession = Depends(get_db)):
    """Serve the uploaded tab image."""
    tab = db.get(TabSetup, tab_id)
    if not tab or not tab.tab_image_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No image for this tab")
    
    img_path = UPLOAD_DIR / tab.tab_image_path
    if not img_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image file missing")
    
    return FileResponse(img_path)


@router.delete("/{tab_id}/image", status_code=status.HTTP_204_NO_CONTENT)
def delete_tab_image(tab_id: str, db: SQLModelSession = Depends(get_db)):
    """Remove the tab image."""
    tab = db.get(TabSetup, tab_id)
    if not tab:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tab setup not found")
    
    if tab.tab_image_path:
        img_path = UPLOAD_DIR / tab.tab_image_path
        if img_path.exists():
            img_path.unlink()
        tab.tab_image_path = None
        tab.nock_y_px = None
        tab.scale_mm_per_px = None
        db.add(tab)
        db.commit()
    return None
