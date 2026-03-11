from pydantic import BaseModel, Field, model_validator
from typing import Optional
from app.schemas.response import GenerationResponse

class ExportRequest(BaseModel):
    data: Optional[GenerationResponse] = Field(default=None, description="GenerationResponse payload")
    history_id: Optional[str] = None

    @model_validator(mode='after')
    def check_mutually_exclusive(self) -> 'ExportRequest':
        if not self.data and not self.history_id:
            raise ValueError("Exactly one of 'data' or 'history_id' must be provided.")
        if self.data and self.history_id:
            raise ValueError("Cannot provide both 'data' and 'history_id'.")
        return self
