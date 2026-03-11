from fastapi import APIRouter, BackgroundTasks
from app.core.config import settings
from app.schemas.request import GenerationRequest
from app.schemas.response import GenerationResponse, ResponseMetadata, GeneratedTestCase, ClarificationQuestion, AssumptionItem, RiskSummary
from app.services.sanitization import sanitize_generation_request
from app.services.ai.gemini_adapter import generate_test_cases
from app.services.risk.calculator import process_and_truncate_generation
from app.db.database import AsyncSessionLocal
from app.services.history import repository
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

async def background_save_history_task(request: GenerationRequest, response: GenerationResponse):
    """Safely handles the background persistence without sharing active HTTP connection pools."""
    async with AsyncSessionLocal() as session:
        try:
            await repository.save_history(session, request, response)
        except Exception:
            logger.exception("Failed to save generation history silently")

@router.post("", response_model=GenerationResponse)
async def generate_test_cases_route(request: GenerationRequest, background_tasks: BackgroundTasks) -> GenerationResponse:
    """
    Validates inputs natively via Pydantic struct boundaries, 
    cleans dangerous active payloads via explicit sanitization layer, 
    and pipes request to the prompt AI generation engine.
    """
    sanitized_request = sanitize_generation_request(request)
    
    if settings.MOCK_MODE:
        # Provide a fully valid mock response
        final_response = GenerationResponse(
            metadata=ResponseMetadata(truncated=False, original_count=2),
            test_cases=[
                GeneratedTestCase(
                    id="TC-MOCK-001",
                    linked_requirement="AC-1" if request.acceptance_criteria else "US",
                    title="Mock valid login path",
                    preconditions="User exists",
                    steps=["Open app", "Enter valid credentials", "Click login"],
                    expected_result="User is logged in successfully",
                    priority="High",
                    category="Positive",
                    severity=4,
                    probability=4,
                    risk_score=16,
                    risk_level="High",
                    notes="Mocked high priority test"
                ),
                GeneratedTestCase(
                    id="TC-MOCK-002",
                    linked_requirement="AC-1" if request.acceptance_criteria else "US",
                    title="Mock invalid password",
                    preconditions="User exists",
                    steps=["Open app", "Enter invalid credentials", "Click login"],
                    expected_result="User sees error message",
                    priority="High",
                    category="Negative",
                    severity=3,
                    probability=3,
                    risk_score=9,
                    risk_level="Medium",
                    notes="Mocked negative test"
                )
            ],
            clarification_questions=[
                ClarificationQuestion(question="What happens if the user presses enter?", context="MOCK_MODE")
            ],
            assumptions=[
                AssumptionItem(assumption="Mock mode enabled", rationale="Testing success path locally")
            ],
            risk_summary=RiskSummary(total_high=1, total_medium=1, total_low=0, average_score=12.5)
        )
    else:
        # Generate raw structures from AI
        response = await generate_test_cases(sanitized_request)
        final_response = process_and_truncate_generation(response, max_cap=50)
    
    # Inject flat MVP persistence track asynchronously securely
    background_tasks.add_task(background_save_history_task, sanitized_request, final_response)
    
    return final_response
