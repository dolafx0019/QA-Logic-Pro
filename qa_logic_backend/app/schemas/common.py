from pydantic import BaseModel
from typing import Any, Optional, List

class StandardErrorResponse(BaseModel):
    detail: str
    code: str

class ValidationErrorResponse(StandardErrorResponse):
    errors: Optional[List[Any]] = None

class HealthResponse(BaseModel):
    status: str
