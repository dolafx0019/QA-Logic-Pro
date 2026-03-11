from fastapi import APIRouter
from pydantic import BaseModel
from app.schemas.common import HealthResponse
from app.core.config import settings

router = APIRouter()

class StatusResponse(BaseModel):
    status: str
    mock_mode: bool
    gemini_configured: bool

@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Service health check endpoint."""
    return HealthResponse(status="ok")

@router.get("/status", response_model=StatusResponse)
async def status_check() -> StatusResponse:
    """Returns runtime mode flags for the frontend."""
    return StatusResponse(
        status="ok",
        mock_mode=settings.MOCK_MODE,
        gemini_configured=bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your_gemini_api_key_here")
    )
