from pydantic import BaseModel, Field
from typing import List

class LLMClarificationQuestion(BaseModel):
    question: str
    context: str

class LLMAssumptionItem(BaseModel):
    assumption: str
    rationale: str

class LLMGeneratedTestCase(BaseModel):
    id: str = Field(..., description="e.g., TC-001")
    linked_requirement: str = Field(default="__unlinked__")
    title: str
    preconditions: str = Field(default="")
    steps: List[str] = Field(default_factory=list)
    expected_result: str
    priority: str = Field(..., pattern="^(High|Medium|Low)$")
    category: str = Field(..., pattern="^(Positive|Negative|Edge Case|Boundary|Validation)$")
    test_focus: str = Field(
        default="Functional", 
        pattern="^(Functional|Performance|Accessibility|Security|Usability|Reliability|Compatibility|Other)$"
    )
    severity: int = Field(..., ge=1, le=5)
    probability: int = Field(..., ge=1, le=5)
    notes: str = Field(default="")

class LLMGenerationResponse(BaseModel):
    test_cases: List[LLMGeneratedTestCase] = Field(default_factory=list)
    clarification_questions: List[LLMClarificationQuestion] = Field(default_factory=list)
    assumptions: List[LLMAssumptionItem] = Field(default_factory=list)
