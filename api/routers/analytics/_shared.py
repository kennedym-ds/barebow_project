from datetime import datetime

from fastapi import HTTPException


def _parse_date(value: str) -> datetime:
    """Parse ISO date string, raising 422 on invalid format."""
    try:
        return datetime.fromisoformat(value)
    except (ValueError, TypeError) as err:
        raise HTTPException(
            status_code=422, detail=f"Invalid date format: '{value}'. Expected ISO 8601 (e.g. 2025-01-15)"
        ) from err
