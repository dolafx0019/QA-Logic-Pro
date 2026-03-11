from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import ValidationError
import traceback
import logging

from app.schemas.prd import PRDExtractionResponse
from app.services.document_parser import parse_uploaded_document
from app.services.ai.extractor import extract_prd_requirements

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/extract", response_model=PRDExtractionResponse)
async def extract_prd(file: UploadFile = File(...)):
    """
    Ingest a PRD file (PDF, DOCX, TXT), extract structural text,
    and prompt Gemini to extract actionable software requirements.
    Rejects completely scanned/image-based PDFs.
    """
    try:
        # Step 1: Parse and validate file via standard libraries
        parsed_doc = await parse_uploaded_document(file)
        
        # Step 2: Extract structured logic using Gemini Pydantic schemas
        structured_response = await extract_prd_requirements(
            text=parsed_doc.text,
            file_name=parsed_doc.file_name,
            file_type=parsed_doc.file_type,
            parser_warnings=parsed_doc.warnings,
            parsing_notes=parsed_doc.parsing_notes,
        )
        
        return structured_response

    except HTTPException:
        # Re-raise explicit FASTAPI HTTP failures (like PDF validation errors)
        raise
        
    except ValidationError as ve:
        logger.error(f"Pydantic Validation Error during PRD Extraction: {ve.json()}")
        raise HTTPException(status_code=500, detail="Failed to map PRD output into strict schema.")
        
    except Exception as e:
        logger.error(f"Unexpected error during PRD extraction: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Unexpected error analyzing PRD: {str(e)}")
