"""Arrow Setup CRUD endpoints with shaft sub-resource and analytics."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlmodel import Session as SQLModelSession
from sqlmodel import delete, select

from api.deps import get_db
from src.arrow_analytics import compute_group_stats, detect_outliers, find_best_sets, find_similar_arrows, grade_shaft
from src.models import ArrowSetup, ArrowShaft, BowSetup
from src.physics import check_spine_match

router = APIRouter()


class ArrowSetupCreate(BaseModel):
    """Schema for creating an arrow setup."""

    make: str
    model: str
    spine: float
    length_in: float
    point_weight_gr: float
    total_arrow_weight_gr: float | None = None
    shaft_diameter_mm: float | None = None
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


# ---------------------------------------------------------------------------
# Analytics response schemas
# ---------------------------------------------------------------------------


class ShaftGradeEntry(BaseModel):
    arrow_number: int
    grade: str
    measured_weight_gr: float | None = None
    measured_spine_astm: float | None = None
    straightness: float | None = None


class MetricStats(BaseModel):
    mean: float
    std: float
    range: float
    cv_pct: float


class GroupStatsResponse(BaseModel):
    shaft_count: int
    weight: MetricStats | None = None
    spine: MetricStats | None = None
    straightness: MetricStats | None = None


class ShaftOutlierEntry(BaseModel):
    arrow_number: int
    feature: str
    value: float
    z_score: float


class ShaftAnalyticsResponse(BaseModel):
    grades: list[ShaftGradeEntry]
    group_stats: GroupStatsResponse
    outliers: list[ShaftOutlierEntry]


# ---------------------------------------------------------------------------
# Spine check response schema
# ---------------------------------------------------------------------------


class FrequencyMatchResponse(BaseModel):
    match_quality: str
    oscillations_during_power_stroke: float
    arrow_frequency_hz: float
    power_stroke_duration_ms: float
    message: str


class SpineCheckResponse(BaseModel):
    status: str
    recommended_spine: int
    effective_draw_weight: float
    actual_dynamic_spine: float
    deviation_pct: float
    message: str
    frequency_match: FrequencyMatchResponse | None = None


# ---------------------------------------------------------------------------
# Optimize request / response schemas
# ---------------------------------------------------------------------------


class OptimizeRequest(BaseModel):
    set_size: int = Field(ge=3, le=12, default=6)
    top_n: int = Field(ge=1, le=10, default=5)
    weight_priority: float = Field(ge=0, le=1, default=0.4)
    spine_priority: float = Field(ge=0, le=1, default=0.35)
    straightness_priority: float = Field(ge=0, le=1, default=0.25)


class OptimizedSetResponse(BaseModel):
    rank: int
    arrow_numbers: list[int]
    consistency_score: float
    weight_std_gr: float
    spine_std: float
    straightness_std: float


# ---------------------------------------------------------------------------
# Find-similar request / response schemas
# ---------------------------------------------------------------------------


class FindSimilarRequest(BaseModel):
    reference_arrow_numbers: list[int]
    top_n: int = Field(ge=1, le=20, default=5)


class SimilarArrowResponse(BaseModel):
    arrow_number: int
    similarity_score: float
    weight_diff_gr: float
    spine_diff: float
    straightness_diff: float


@router.get("", response_model=list[ArrowSetup])
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


@router.post("/{arrow_id}/shafts", response_model=list[ArrowShaft], status_code=status.HTTP_201_CREATED)
def import_shafts(arrow_id: str, shafts: list[ArrowShaftData], db: SQLModelSession = Depends(get_db)):
    """Import shaft data for an arrow setup."""
    arrow = db.get(ArrowSetup, arrow_id)
    if not arrow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arrow setup not found")

    # Create shaft records
    created_shafts = []
    for shaft_data in shafts:
        shaft = ArrowShaft(arrow_setup_id=arrow_id, **shaft_data.model_dump())
        db.add(shaft)
        created_shafts.append(shaft)

    db.commit()

    # Re-query all shafts in one statement instead of N refreshes
    statement = select(ArrowShaft).where(ArrowShaft.arrow_setup_id == arrow_id)
    return db.exec(statement).all()


@router.get("/{arrow_id}/shafts", response_model=list[ArrowShaft])
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


# ---------------------------------------------------------------------------
# Analytics endpoint
# ---------------------------------------------------------------------------


@router.get("/{arrow_id}/analytics", response_model=ShaftAnalyticsResponse)
def get_arrow_analytics(
    arrow_id: str,
    outlier_threshold: float = Query(default=2.0, ge=1.0, le=4.0),
    db: SQLModelSession = Depends(get_db),
):
    """Compute analytics (grades, group stats, outliers) for an arrow setup's shafts."""
    arrow = db.get(ArrowSetup, arrow_id)
    if not arrow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arrow setup not found")

    statement = select(ArrowShaft).where(ArrowShaft.arrow_setup_id == arrow_id).order_by(ArrowShaft.arrow_number)
    shafts = db.exec(statement).all()

    shaft_dicts = [
        {
            "arrow_number": s.arrow_number,
            "measured_weight_gr": s.measured_weight_gr,
            "measured_spine_astm": s.measured_spine_astm,
            "straightness": s.straightness,
        }
        for s in shafts
    ]

    # Group stats
    stats = compute_group_stats(shaft_dicts)

    # Grades — requires weight data to compute mean
    grades: list[dict] = []
    mean_weight = stats["weight"]["mean"] if stats["weight"] else None
    for s in shaft_dicts:
        if s["measured_weight_gr"] is not None and mean_weight is not None:
            grade = grade_shaft(s["measured_weight_gr"], mean_weight, s["straightness"])
        else:
            grade = "Unknown"
        grades.append({**s, "grade": grade})

    # Outliers
    outliers = detect_outliers(shaft_dicts, threshold=outlier_threshold)

    return ShaftAnalyticsResponse(
        grades=grades,
        group_stats=stats,
        outliers=outliers,
    )


# ---------------------------------------------------------------------------
# Spine check endpoint
# ---------------------------------------------------------------------------


@router.get("/{arrow_id}/spine-check", response_model=SpineCheckResponse)
def get_spine_check(
    arrow_id: str,
    bow_id: str = Query(..., description="Bow setup ID to check spine match against"),
    db: SQLModelSession = Depends(get_db),
):
    """Check whether the arrow's spine matches the bow's requirements."""
    arrow = db.get(ArrowSetup, arrow_id)
    if not arrow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arrow setup not found")

    bow = db.get(BowSetup, bow_id)
    if not bow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bow setup not found")

    if bow.draw_length_in is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Bow setup is missing draw_length_in — update the bow profile first",
        )

    result = check_spine_match(
        actual_spine=arrow.spine,
        draw_weight_lbs=bow.draw_weight_otf,
        draw_length_in=bow.draw_length_in,
        point_weight_gr=arrow.point_weight_gr,
        arrow_length_in=arrow.length_in,
        brace_height_in=bow.brace_height_in,
        strand_count=bow.strand_count,
        total_arrow_weight_gr=arrow.total_arrow_weight_gr,
        shaft_diameter_mm=arrow.shaft_diameter_mm,
    )
    return SpineCheckResponse(**result)


# ---------------------------------------------------------------------------
# Optimize endpoint
# ---------------------------------------------------------------------------


@router.post("/{arrow_id}/optimize", response_model=list[OptimizedSetResponse])
def optimize_arrow_set(
    arrow_id: str,
    request: OptimizeRequest,
    db: SQLModelSession = Depends(get_db),
):
    """Find the most consistent subset of arrows from the full set."""
    arrow = db.get(ArrowSetup, arrow_id)
    if not arrow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arrow setup not found")

    statement = select(ArrowShaft).where(ArrowShaft.arrow_setup_id == arrow_id).order_by(ArrowShaft.arrow_number)
    shafts = db.exec(statement).all()

    if len(shafts) < request.set_size:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Need at least {request.set_size} shafts for optimization, have {len(shafts)}",
        )

    shaft_dicts = [
        {
            "arrow_number": s.arrow_number,
            "measured_weight_gr": s.measured_weight_gr,
            "measured_spine_astm": s.measured_spine_astm,
            "straightness": s.straightness,
        }
        for s in shafts
    ]

    weights = {
        "weight": request.weight_priority,
        "spine": request.spine_priority,
        "straightness": request.straightness_priority,
    }

    results = find_best_sets(
        shafts=shaft_dicts,
        set_size=request.set_size,
        top_n=request.top_n,
        weights=weights,
    )

    return [OptimizedSetResponse(**r) for r in results]


# ---------------------------------------------------------------------------
# Find-similar endpoint
# ---------------------------------------------------------------------------


@router.post("/{arrow_id}/find-similar", response_model=list[SimilarArrowResponse])
def find_similar(
    arrow_id: str,
    request: FindSimilarRequest,
    db: SQLModelSession = Depends(get_db),
):
    """Find arrows most similar to a reference subset within the same setup."""
    arrow = db.get(ArrowSetup, arrow_id)
    if not arrow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arrow setup not found")

    statement = select(ArrowShaft).where(ArrowShaft.arrow_setup_id == arrow_id).order_by(ArrowShaft.arrow_number)
    shafts = db.exec(statement).all()

    shaft_dicts = [
        {
            "arrow_number": s.arrow_number,
            "measured_weight_gr": s.measured_weight_gr,
            "measured_spine_astm": s.measured_spine_astm,
            "straightness": s.straightness,
        }
        for s in shafts
    ]

    ref_numbers = set(request.reference_arrow_numbers)
    references = [s for s in shaft_dicts if s["arrow_number"] in ref_numbers]

    if not references:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="None of the reference arrow numbers were found in the shaft data",
        )

    candidates = [s for s in shaft_dicts if s["arrow_number"] not in ref_numbers]

    results = find_similar_arrows(references, candidates, top_n=request.top_n)
    return [SimilarArrowResponse(**r) for r in results]
