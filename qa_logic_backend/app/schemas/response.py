from pydantic import BaseModel, Field, model_validator
from typing import List, Optional, Any

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
    test_focus: str = Field(
        default="Functional",
        pattern="^(Functional|Performance|Accessibility|Security|Usability|Reliability|Compatibility|Other)$"
    )
    severity: int = Field(..., ge=1, le=5)
    probability: int = Field(..., ge=1, le=5)
    
    risk_score: Optional[int] = None
    risk_level: Optional[str] = Field(default=None, pattern="^(High|Medium|Low)$")
    notes: str = Field(default="")

    @model_validator(mode="before")
    @classmethod
    def normalize_legacy_category(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
            
        allowed_categories = {"Positive", "Negative", "Edge Case", "Boundary", "Validation"}
        allowed_focus = {
            "Functional", "Performance", "Accessibility", "Security", 
            "Usability", "Reliability", "Compatibility", "Other"
        }
        
        category = data.get("category")
        test_focus = data.get("test_focus")
        
        # Rule 1: Pass-through if category is recognized scenario type
        if category in allowed_categories:
            pass
        # Rule 2 & 3: Normalize if category is a domain or unknown
        elif category in allowed_focus:
            data["test_focus"] = category
            data["category"] = "Validation"
        else:
            # Fallback for completely unknown categories
            data["category"] = "Validation"
            data["test_focus"] = "Other"
            
        # Defaulting missing focus
        if not data.get("test_focus"):
            data["test_focus"] = "Functional"
            
        return data

class GenerationResponse(BaseModel):
    metadata: ResponseMetadata
    test_cases: List[GeneratedTestCase] = Field(default_factory=list)
    clarification_questions: List[ClarificationQuestion] = Field(default_factory=list)
    assumptions: List[AssumptionItem] = Field(default_factory=list)
    risk_summary: Optional[RiskSummary] = None
