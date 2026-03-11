import json
from google import genai
from google.genai import types
from pydantic import ValidationError

from app.core.config import settings
from app.core.exceptions import BaseAPIException
from app.schemas.request import GenerationRequest
from app.schemas.response import GenerationResponse, GeneratedTestCase, ClarificationQuestion, AssumptionItem, ResponseMetadata
from app.schemas.ai import LLMGenerationResponse
from app.services.ai.prompt_builder import build_generation_prompt

def get_gemini_client() -> genai.Client:
    if not settings.GEMINI_API_KEY:
        raise BaseAPIException(
            detail="Gemini API Key is not configured.",
            code="AI_CONFIG_MISSING",
            status_code=500
        )
    # google-genai version 0.2.0 client
    return genai.Client(api_key=settings.GEMINI_API_KEY)

def clean_json_string(raw_text: str) -> str:
    """Exactly one repair pass to remove markdown JSON wrapping."""
    text = raw_text.strip()
    if text.startswith("```json"):
        text = text[len("```json"):]
    elif text.startswith("```"):
        text = text[len("```"):]
        
    if text.endswith("```"):
        text = text[:-len("```")]
        
    return text.strip()

async def generate_test_cases(request: GenerationRequest) -> GenerationResponse:
    prompt = build_generation_prompt(request)
    client = get_gemini_client()
    
    try:
        response = await client.aio.models.generate_content(
            model=settings.GEMINI_GENERATION_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=LLMGenerationResponse,
            ),
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Gemini API Error: {type(e).__name__} - {str(e)}")
        
        error_code = "AI_CONNECTION_FAILURE"
        detail = "AI Provider is temporarily unavailable or returned an error."
        status_code = 502
        
        from google.genai.errors import APIError
        if isinstance(e, APIError):
            # The new google-genai SDK APIError might not always have exactly 'code',
            # so we do substring checks on the string representation as a safe fallback
            # alongside known attributes.
            error_str = str(e)
            if "RESOURCE_EXHAUSTED" in error_str or "Quota exceeded" in error_str or "429" in error_str:
                error_code = "AI_RATE_LIMIT"
                detail = "AI Provider rate limit or free tier quota exceeded."
                status_code = 429
            elif "API key" in error_str or "401" in error_str or "403" in error_str:
                error_code = "AI_AUTH_FAILURE"
                detail = "AI Provider authentication failed. Please check API key."
                status_code = 401
            elif "not found" in error_str.lower() and "model" in error_str.lower() or "404" in error_str:
                error_code = "AI_MODEL_UNAVAILABLE"
                detail = "Configured AI model is not found or unavailable."
            elif "timeout" in error_str.lower() or "504" in error_str:
                error_code = "AI_PROVIDER_TIMEOUT"
                detail = "AI Provider network timeout."
                status_code = 504
            else:
                error_code = "AI_PROVIDER_UNKNOWN"
                detail = "AI Provider returned an unresolved error."
                
        raise BaseAPIException(detail=detail, code=error_code, status_code=status_code)
        
    raw_output = response.text
    if not raw_output:
        raise BaseAPIException(detail="AI Provider returned empty response.", code="AI_EMPTY_RESPONSE", status_code=502)
        
    try:
        parsed_data = json.loads(raw_output)
    except json.JSONDecodeError:
        # One repair pass
        cleaned_text = clean_json_string(raw_output)
        try:
            parsed_data = json.loads(cleaned_text)
        except json.JSONDecodeError:
            raise BaseAPIException(detail="AI Provider returned critically malformed data.", code="AI_MALFORMED_JSON", status_code=502)
    import logging
    logger = logging.getLogger(__name__)

    if settings.DEBUG_AI_PIPELINE:
        logger.debug(f"Generation request: User Story Length={len(request.user_story) if request.user_story else 0}, ACs={len(request.acceptance_criteria)}, BRs={len(request.business_rules)}")
        logger.debug(f"Raw Output Length: {len(raw_output)}")

    # Validate against strict Pydantic rules for the AI schema natively
    try:
        llm_response = LLMGenerationResponse.model_validate(parsed_data)
    except ValidationError as ve:
        logger.error(f"AI Schema Validation Error. Errors: {ve.errors()}")
        raise BaseAPIException(detail="AI Provider returned data that failed strict backend schema validation.", code="AI_SCHEMA_FAILURE", status_code=502)
        
    # Map from LLM schema to final Backend Response architecture
    mapped_test_cases = []
    for tc in llm_response.test_cases:
        mapped_test_cases.append(GeneratedTestCase(
            id=tc.id,
            linked_requirement=tc.linked_requirement,
            title=tc.title,
            preconditions=tc.preconditions,
            steps=tc.steps,
            expected_result=tc.expected_result,
            priority=tc.priority,
            category=tc.category,
            severity=tc.severity,
            probability=tc.probability,
            risk_score=None, # Deferred to Phase 4
            risk_level=None, # Deferred to Phase 4
            notes=tc.notes
        ))
        
    mapped_questions = [ClarificationQuestion(question=cq.question, context=cq.context) for cq in llm_response.clarification_questions]
    mapped_assumptions = [AssumptionItem(assumption=ai.assumption, rationale=ai.rationale) for ai in llm_response.assumptions]
    
    final_response = GenerationResponse(
        metadata=ResponseMetadata(
            truncated=False, # Truncation deferred
            original_count=len(mapped_test_cases)
        ),
        test_cases=mapped_test_cases,
        clarification_questions=mapped_questions,
        assumptions=mapped_assumptions,
        risk_summary=None # Deferred to Phase 4
    )
    
    return final_response
