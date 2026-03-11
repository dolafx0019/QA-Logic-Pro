from google import genai
from app.core.config import settings
from app.schemas.prd import PRDExtractionResponse, PRDExtractionMetadata

def init_genai():
    return genai.Client(api_key=settings.GEMINI_API_KEY)

async def extract_prd_requirements(
    text: str,
    file_name: str,
    file_type: str,
    parser_warnings: list[str],
    parsing_notes: str,
    chunk_count: int = 1
) -> PRDExtractionResponse:
    """
    Extract structured QA requirements from raw PRD text using Gemini.
    """
    client = init_genai()

    prompt = f"""
    You are a Staff Quality Assurance Analyst and Product Manager.
    Your task is to analyze the following Product Requirements Document (PRD) and extract structured requirements for testing and development.
    
    If the document provides vague or contradictory information, surface these in the `confidence_summary`, `ai_warnings`, `assumptions`, or `clarification_questions`.
    DO NOT invent requirements that are not supported by the document's text.
    Strictly separate true requirements from pure narrative.
    
    Document Text:
    {text}
    """
    
    # We pass the metadata through so the model returns it intact or we just inject it into the Pydantic model after.
    # Actually, it's safer to have Gemini extract the core data, and we inject the metadata fields ourselves, 
    # but since the schema expects `metadata`, we can let the model generate the outer shell and map the rest, or just use a tailored schema for extraction and construct the final response ourselves.
    
    # Let's use `PRDExtractionResponse` and instruct the model just to return the data matching it.
    
    # Actually, we can just use the Pydantic schema for `response_schema`.
    
    # 1. Enforce strict character budget to save cost on huge blobs
    # even if coarse parsing allowed them through
    MAX_CHARS = 40000 # ~10k-12k tokens depending on density
    if len(text) > MAX_CHARS:
        text = text[:MAX_CHARS] + "\n...(truncated by backend budget)..."
        parser_warnings.append(f"PRD truncated to {MAX_CHARS} characters to conserve API quota.")
    
    # Use async SDK to not block the event loop
    response = await client.aio.models.generate_content(
        model=settings.GEMINI_EXTRACTION_MODEL,
        contents=prompt,
        config=genai.types.GenerateContentConfig(
            temperature=0.0, # Deterministic extraction
            response_mime_type="application/json",
            response_schema=PRDExtractionResponse,
        ),
    )
    
    # Parse the LLM output into the strict schema
    result = PRDExtractionResponse.model_validate_json(response.text)
    
    # Inject deterministic metadata that Gemini shouldn't guess
    result.metadata.source_file_name = file_name
    result.metadata.source_file_type = file_type
    result.metadata.extracted_text_length = len(text)
    result.metadata.chunk_count = chunk_count
    result.metadata.warnings = parser_warnings
    result.metadata.parsing_notes = parsing_notes
    result.metadata.is_truncated = bool(len(text) >= 150000)

    return result
