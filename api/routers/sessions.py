"""Session and End management endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session as SQLModelSession, select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime
from src.models import Session as SessionModel, End, Shot, BowSetup, ArrowSetup
from api.deps import get_db

router = APIRouter()


class SessionCreate(BaseModel):
    """Schema for creating a session."""
    bow_id: Optional[str] = None
    arrow_id: Optional[str] = None
    round_type: str
    target_face_size_cm: int = Field(gt=0, description="Target face diameter in cm, must be positive")
    distance_m: float = Field(gt=0, description="Shooting distance in metres, must be positive")
    notes: str = ""


class ShotData(BaseModel):
    """Schema for a shot within an end."""
    score: int = Field(ge=0, le=11, description="Shot score (0-10, or 11 for X-as-11 workflows)")
    is_x: bool = False
    x: float = Field(ge=-500, le=500, description="X coordinate in cm (sanity bounds)")
    y: float = Field(ge=-500, le=500, description="Y coordinate in cm (sanity bounds)")
    arrow_number: Optional[int] = Field(default=None, gt=0, description="Arrow shaft number, must be positive if provided")


class EndCreate(BaseModel):
    """Schema for creating/saving an end with shots."""
    end_number: int = Field(gt=0, description="End number, must be positive")
    shots: List[ShotData]


class SessionSummary(BaseModel):
    """Summary view of a session for list endpoint."""
    id: str
    date: datetime
    round_type: str
    distance_m: float
    target_face_size_cm: int
    total_score: int
    shot_count: int
    avg_score: float
    bow_name: Optional[str] = None
    arrow_name: Optional[str] = None


# --- Response schemas for session detail (relationships) ---

class ShotResponse(BaseModel):
    id: str
    end_id: str
    score: int
    is_x: bool
    x: float
    y: float
    arrow_number: Optional[int] = None
    shot_sequence: Optional[int] = None


class EndResponse(BaseModel):
    id: str
    session_id: str
    end_number: int
    shots: List[ShotResponse] = []


class BowRef(BaseModel):
    id: str
    name: str


class ArrowRef(BaseModel):
    id: str
    make: str
    model: str
    spine: float


class SessionDetailResponse(BaseModel):
    id: str
    date: datetime
    bow_id: Optional[str] = None
    arrow_id: Optional[str] = None
    round_type: str
    target_face_size_cm: int
    distance_m: float
    notes: str = ""
    ends: List[EndResponse] = []
    bow: Optional[BowRef] = None
    arrow: Optional[ArrowRef] = None


@router.get("", response_model=List[SessionSummary])
def list_sessions(
    bow_id: Optional[str] = None,
    arrow_id: Optional[str] = None,
    db: SQLModelSession = Depends(get_db)
):
    """List sessions with summary stats. Optionally filter by bow_id or arrow_id."""
    statement = select(SessionModel).options(
        selectinload(SessionModel.ends).selectinload(End.shots),
        selectinload(SessionModel.bow),
        selectinload(SessionModel.arrow)
    ).order_by(SessionModel.date.desc())
    
    # Apply filters
    if bow_id:
        statement = statement.where(SessionModel.bow_id == bow_id)
    if arrow_id:
        statement = statement.where(SessionModel.arrow_id == arrow_id)
    
    sessions = db.exec(statement).all()
    
    # Calculate summaries
    summaries = []
    for session in sessions:
        total_score = 0
        shot_count = 0
        
        for end in session.ends:
            for shot in end.shots:
                total_score += shot.score
                shot_count += 1
        
        avg_score = total_score / shot_count if shot_count > 0 else 0.0
        
        summaries.append(SessionSummary(
            id=session.id,
            date=session.date,
            round_type=session.round_type,
            distance_m=session.distance_m,
            target_face_size_cm=session.target_face_size_cm,
            total_score=total_score,
            shot_count=shot_count,
            avg_score=round(avg_score, 2),
            bow_name=session.bow.name if session.bow else None,
            arrow_name=f"{session.arrow.make} {session.arrow.model}" if session.arrow else None
        ))
    
    return summaries


@router.get("/{session_id}", response_model=SessionDetailResponse)
def get_session(session_id: str, db: SQLModelSession = Depends(get_db)):
    """Get full session with eager-loaded ends, shots, bow, and arrow."""
    statement = select(SessionModel).where(SessionModel.id == session_id).options(
        selectinload(SessionModel.ends).selectinload(End.shots),
        selectinload(SessionModel.bow),
        selectinload(SessionModel.arrow)
    )
    
    session = db.exec(statement).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    
    return SessionDetailResponse(
        id=session.id,
        date=session.date,
        bow_id=session.bow_id,
        arrow_id=session.arrow_id,
        round_type=session.round_type,
        target_face_size_cm=session.target_face_size_cm,
        distance_m=session.distance_m,
        notes=session.notes,
        ends=[
            EndResponse(
                id=end.id,
                session_id=end.session_id,
                end_number=end.end_number,
                shots=[
                    ShotResponse(
                        id=shot.id,
                        end_id=shot.end_id,
                        score=shot.score,
                        is_x=shot.is_x,
                        x=shot.x,
                        y=shot.y,
                        arrow_number=shot.arrow_number,
                        shot_sequence=shot.shot_sequence
                    )
                    for shot in end.shots
                ]
            )
            for end in session.ends
        ],
        bow=BowRef(id=session.bow.id, name=session.bow.name) if session.bow else None,
        arrow=ArrowRef(
            id=session.arrow.id,
            make=session.arrow.make,
            model=session.arrow.model,
            spine=session.arrow.spine
        ) if session.arrow else None
    )


@router.post("", response_model=SessionModel, status_code=status.HTTP_201_CREATED)
def create_session(session_data: SessionCreate, db: SQLModelSession = Depends(get_db)):
    """Create a new session."""
    # Validate bow and arrow exist if IDs provided
    if session_data.bow_id:
        bow = db.get(BowSetup, session_data.bow_id)
        if not bow:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bow setup not found")
    
    if session_data.arrow_id:
        arrow = db.get(ArrowSetup, session_data.arrow_id)
        if not arrow:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arrow setup not found")
    
    session = SessionModel(**session_data.model_dump())
    
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(session_id: str, db: SQLModelSession = Depends(get_db)):
    """Delete a session (cascades to ends and shots)."""
    session = db.get(SessionModel, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    
    db.delete(session)
    db.commit()
    return None


@router.post("/{session_id}/ends", response_model=EndResponse, status_code=status.HTTP_201_CREATED)
def save_end(session_id: str, end_data: EndCreate, db: SQLModelSession = Depends(get_db)):
    """Save an end with shots to a session."""
    session = db.get(SessionModel, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    
    # Create end
    end = End(
        session_id=session_id,
        end_number=end_data.end_number
    )
    db.add(end)
    db.flush()  # Get the end ID
    
    # Create shots with shot_sequence for deterministic ordering
    for idx, shot_data in enumerate(end_data.shots):
        shot = Shot(
            end_id=end.id,
            shot_sequence=idx,
            **shot_data.model_dump()
        )
        db.add(shot)
    
    db.commit()

    # Reload with shots eagerly loaded
    statement = select(End).where(End.id == end.id).options(
        selectinload(End.shots)
    )
    end = db.exec(statement).one()

    return EndResponse(
        id=end.id,
        session_id=end.session_id,
        end_number=end.end_number,
        shots=[
            ShotResponse(
                id=shot.id,
                end_id=shot.end_id,
                score=shot.score,
                is_x=shot.is_x,
                x=shot.x,
                y=shot.y,
                arrow_number=shot.arrow_number,
                shot_sequence=shot.shot_sequence
            )
            for shot in end.shots
        ]
    )
