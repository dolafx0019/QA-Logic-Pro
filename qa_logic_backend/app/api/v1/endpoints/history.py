from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api.dependencies import get_db
from app.core.exceptions import BaseAPIException
from app.schemas.history import HistorySummary, HistoryRecord
from app.services.history import repository

router = APIRouter()

@router.get("", response_model=List[HistorySummary])
async def list_history(
    limit: int = Query(20, ge=1, le=50, description="Max 50"),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Fetch paginated summary list."""
    summaries = await repository.get_history_summaries(db, limit, offset)
    return summaries

@router.get("/{history_id}", response_model=HistoryRecord)
async def get_history_detail(
    history_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Retrieve full history validation mapped payload."""
    try:
        record = await repository.get_history_record(db, history_id)
    except ValueError as e:
        if str(e) == "HISTORY_PAYLOAD_INVALID":
            raise BaseAPIException(
                detail=f"History record '{history_id}' payload is corrupted and cannot be loaded.",
                code="HISTORY_PAYLOAD_INVALID",
                status_code=500
            )
        raise e
        
    if not record:
        raise BaseAPIException(
            detail=f"History record '{history_id}' not found.",
            code="HISTORY_NOT_FOUND",
            status_code=404
        )
    return record
