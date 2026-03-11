from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import HistoryRecordORM
from app.schemas.request import GenerationRequest
from app.schemas.response import GenerationResponse
from app.schemas.history import HistorySummary, HistoryRecord

async def save_history(
    session: AsyncSession,
    request: GenerationRequest,
    response: GenerationResponse
) -> str:
    """
    Saves a generation transaction deterministically as a flat history record.
    """
    
    # Extract preview and safely map
    story_preview = ""
    if request.user_story:
        story_preview = request.user_story[:497] + "..." if len(request.user_story) > 500 else request.user_story
    elif request.acceptance_criteria:
        story_preview = request.acceptance_criteria[0].description[:497] + "..." if len(request.acceptance_criteria[0].description) > 500 else request.acceptance_criteria[0].description
        
    record = HistoryRecordORM(
        user_story_preview=story_preview,
        test_case_count=len(response.test_cases),
        request_payload_json=request.model_dump_json(),
        response_payload_json=response.model_dump_json(),
    )
    
    session.add(record)
    await session.commit()
    await session.refresh(record)
    
    return record.id

async def get_history_summaries(
    session: AsyncSession,
    limit: int = 20,
    offset: int = 0
) -> list[HistorySummary]:
    """Retrieve paginated summaries descending."""
    # Enforce API bounds locally defensively
    safe_limit = min(limit, 50)
    safe_limit = max(safe_limit, 1)
    safe_offset = max(offset, 0)
    
    stmt = select(HistoryRecordORM).order_by(HistoryRecordORM.created_at.desc()).limit(safe_limit).offset(safe_offset)
    result = await session.execute(stmt)
    records = result.scalars().all()
    
    summaries = []
    for r in records:
        summaries.append(HistorySummary(
            id=r.id,
            created_at=r.created_at,
            test_case_count=r.test_case_count,
            user_story_preview=r.user_story_preview,
        ))
        
    return summaries

async def get_history_record(session: AsyncSession, record_id: str) -> HistoryRecord | None:
    """Retrieve full record, dynamically reloading validated JSON strings into Pydantic."""
    stmt = select(HistoryRecordORM).where(HistoryRecordORM.id == record_id)
    result = await session.execute(stmt)
    record = result.scalar_one_or_none()
    
    if not record:
        return None
        
    try:
        req_obj = GenerationRequest.model_validate_json(record.request_payload_json)
        res_obj = GenerationResponse.model_validate_json(record.response_payload_json)
    except Exception:
        # If payload integrity fails, return specific error
        raise ValueError("HISTORY_PAYLOAD_INVALID")
        
    return HistoryRecord(
        id=record.id,
        created_at=record.created_at,
        request_payload=req_obj,
        response_payload=res_obj
    )
