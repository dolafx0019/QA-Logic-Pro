from datetime import datetime
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies import get_db
from app.core.exceptions import BaseAPIException
from app.schemas.export import ExportRequest
from app.services.export.excel_generator import generate_excel_bytes
from app.services.history import repository

router = APIRouter()

@router.post("", response_class=StreamingResponse)
async def export_test_cases(request: ExportRequest, db: AsyncSession = Depends(get_db)):
    """
    Validates the export instruction securely. Generates the .xlsx file fully in-memory, 
    without saving to server disk or mutating original GenerationResponse logic.
    """
    export_data = request.data
    
    if request.history_id:
        # History lookup mapped directly to Phase 6
        try:
            record = await repository.get_history_record(db, request.history_id)
        except ValueError as e:
            if str(e) == "HISTORY_PAYLOAD_INVALID":
                raise BaseAPIException(
                    status_code=500,
                    detail=f"History record '{request.history_id}' payload corrupted.",
                    code="HISTORY_PAYLOAD_INVALID"
                )
            raise e
            
        if not record:
            raise BaseAPIException(
                status_code=404, 
                detail=f"History record '{request.history_id}' not found.",
                code="HISTORY_NOT_FOUND"
            )
        export_data = record.response_payload
        
    if not export_data:
        raise BaseAPIException(
            status_code=400, 
            detail="Missing export data payload.",
            code="EXPORT_DATA_MISSING"
        )
        
    # Generate Excel buffer without blocking event loop via threadpool
    buffer = await run_in_threadpool(generate_excel_bytes, export_data)
    
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    filename = f"qa-logic-pro-test-cases-{timestamp}.xlsx"
    
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"'
    }
    
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers
    )
