from pydantic import BaseModel, Field
from typing import List, Optional

class ClarificationQuestion(BaseModel):
    question: str
    context: str

class AssumptionItem(BaseModel):
    assumption: str
    rationale: str

class RiskSummary(BaseModel):
    total_high: int
    total_medium: int
    total_low: int
    average_score: float

class ResponseMetadata(BaseModel):
    truncated: bool = False
    original_count: int = Field(..., ge=0)

class GeneratedTestCase(BaseModel):
    id: str = Field(..., description="e.g., TC-001")
    linked_requirement: str = Field(default="__unlinked__")
    title: str
    preconditions: str = Field(default="")
    steps: List[str] = Field(default_factory=list)
    expected_result: str
    priority: str = Field(..., pattern="^(High|Medium|Low)$")
    category: str = Field(..., pattern="^(Positive|Negative|Edge Case|Boundary|Validation)$")
    severity: int = Field(..., ge=1, le=5)
    probability: int = Field(..., ge=1, le=5)
    
    risk_score: Optional[int] = None
    risk_level: Optional[str] = Field(default=None, pattern="^(High|Medium|Low)$")
    notes: str = Field(default="")

class GenerationResponse(BaseModel):
    metadata: ResponseMetadata
    test_cases: List[GeneratedTestCase] = Field(default_factory=list)
    clarification_questions: List[ClarificationQuestion] = Field(default_factory=list)
    assumptions: List[AssumptionItem] = Field(default_factory=list)
    risk_summary: Optional[RiskSummary] = None
