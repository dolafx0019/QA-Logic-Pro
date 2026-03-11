from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.encoders import jsonable_encoder

async def custom_validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """
    Standardizes validation error structure for Pydantic failures 
    (e.g., missing 422 fields shape).
    """
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Input validation failed.",
            "code": "VALIDATION_FAILED",
            "errors": jsonable_encoder(exc.errors())
        }
    )

class BaseAPIException(Exception):
    """
    Custom HTTP exception wrapper handling predefined app exceptions 
    (e.g., Gemini timeouts, Excel export conflicts).
    """
    def __init__(self, detail: str, code: str, status_code: int = 400):
        self.detail = detail
        self.code = code
        self.status_code = status_code

async def custom_api_exception_handler(request: Request, exc: BaseAPIException) -> JSONResponse:
    """
    Catches custom BaseAPIException instances and maps them to JSON Response
    adhering strictly to standard DTOs.
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "code": exc.code
        }
    )
