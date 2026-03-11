from pydantic import BaseModel
from datetime import datetime
from app.schemas.request import GenerationRequest
from app.schemas.response import GenerationResponse

class HistorySummary(BaseModel):
    id: str
    created_at: datetime
    test_case_count: int
    user_story_preview: str

class HistoryRecord(BaseModel):
    id: str
    created_at: datetime
    request_payload: GenerationRequest
    response_payload: GenerationResponse
