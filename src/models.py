from enum import Enum
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime
import uuid

# Enums
class Handedness(str, Enum):
    RIGHT = 'Right'
    LEFT = 'Left'

class LimbAlignment(str, Enum):
    STRAIGHT = 'Straight'
    OUT_OF_LINE = 'Out of Line'

# Database Models

class BowSetup(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str
    
    # Flattened Riser Config
    riser_make: str
    riser_model: str
    riser_length_in: float
    
    # Flattened Limbs Config
    limbs_make: str
    limbs_model: str
    limbs_length: str # Short, Medium, Long
    limbs_marked_poundage: float
    
    # Tuning Specs
    draw_weight_otf: float
    brace_height_in: float
    
    # Flattened Tiller
    tiller_top_mm: float
    tiller_bottom_mm: float
    tiller_type: str # positive, neutral, negative
    
    # Flattened Plunger
    plunger_spring_tension: float
    plunger_center_shot_mm: float
    
    nocking_point_height_mm: float
    riser_weights: str = ""
    limb_alignment: str = LimbAlignment.STRAIGHT
    total_mass_g: float = 0
    string_material: str = ""
    strand_count: int = 16
    
    # Relationships
    sessions: List["Session"] = Relationship(back_populates="bow")

    @property
    def tiller(self):
        # Helper to maintain compatibility with old code if needed
        from pydantic import BaseModel
        class TillerProxy(BaseModel):
            top_mm: float
            bottom_mm: float
            type: str
        return TillerProxy(top_mm=self.tiller_top_mm, bottom_mm=self.tiller_bottom_mm, type=self.tiller_type)

class ArrowSetup(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    make: str
    model: str
    spine: float
    length_in: float
    point_weight_gr: float
    total_arrow_weight_gr: float
    shaft_diameter_mm: float
    fletching_type: str
    nock_type: str
    arrow_count: int = Field(default=12, description="Number of arrows in the set")
    
    # Relationships
    sessions: List["Session"] = Relationship(back_populates="arrow")
    shafts: List["ArrowShaft"] = Relationship(back_populates="arrow_setup", sa_relationship_kwargs={"cascade": "all, delete"})

class ArrowShaft(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    arrow_setup_id: str = Field(foreign_key="arrowsetup.id")
    
    arrow_number: int # Matches "No." from CSV
    measured_weight_gr: Optional[float] = None
    measured_spine_astm: Optional[float] = None
    straightness: Optional[float] = None
    
    # Relationship
    arrow_setup: ArrowSetup = Relationship(back_populates="shafts")

class TabSetup(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str
    make: str = "Zniper"
    model: str = "Barebow Tab"
    
    # Comma-separated list of mark positions in mm (e.g., "4.5, 9.0, 13.5")
    marks: str = ""
    
    # Path to uploaded tab image (relative to uploads/ dir)
    tab_image_path: Optional[str] = None
    
    # Calibration: how many mm on the physical tab does one pixel represent?
    # Users set nock_y (top of string groove) and scale_mm_per_px after uploading.
    nock_y_px: Optional[float] = None
    scale_mm_per_px: Optional[float] = None 
    
    # Relationships
    # sessions: List["Session"] = Relationship(back_populates="tab") # Future proofing

class Session(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    date: datetime = Field(default_factory=datetime.now)
    
    bow_id: Optional[str] = Field(default=None, foreign_key="bowsetup.id")
    arrow_id: Optional[str] = Field(default=None, foreign_key="arrowsetup.id")
    # tab_id: Optional[str] = Field(default=None, foreign_key="tabsetup.id") # Add later if needed
    
    round_type: str # "WA 18m", "WA 25m", "Flint"
    target_face_size_cm: int # 40, 60, etc.
    distance_m: float
    
    notes: str = ""
    
    # Relationships
    bow: Optional[BowSetup] = Relationship(back_populates="sessions")
    arrow: Optional[ArrowSetup] = Relationship(back_populates="sessions")
    ends: List["End"] = Relationship(back_populates="session", sa_relationship_kwargs={"cascade": "all, delete"})

class End(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    session_id: str = Field(foreign_key="session.id")
    end_number: int
    
    # Relationships
    session: Session = Relationship(back_populates="ends")
    shots: List["Shot"] = Relationship(back_populates="end", sa_relationship_kwargs={"cascade": "all, delete"})

class Shot(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    end_id: str = Field(foreign_key="end.id")
    
    score: int # 10, 9, 8... 0 for Miss
    is_x: bool = False
    
    # Coordinates on the target face (normalized -1 to 1 or cm)
    x: float
    y: float
    
    arrow_number: Optional[int] = Field(default=None, description="The number marked on the arrow shaft")
    shot_sequence: Optional[int] = Field(default=None, description="Deterministic shot order within end (0-indexed)")

    # Relationships
    end: End = Relationship(back_populates="shots")

# Compatibility Classes for Pydantic-only usage (if needed)
# We can remove the old classes or alias them if the rest of the app depends on them heavily.
# For now, I'm replacing the file content entirely with the SQLModel versions.


