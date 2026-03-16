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

from app.schemas.enums import TestFocus

class GeneratedTestCase(BaseModel):
    id: str = Field(..., description="e.g., TC-001")
    linked_requirement: str = Field(default="__unlinked__")
    title: str
    preconditions: str = Field(default="")
    steps: List[str] = Field(default_factory=list)
    expected_result: str
    priority: str = Field(..., pattern="^(High|Medium|Low)$")
    category: str = Field(..., pattern="^(Positive|Negative|Edge Case|Boundary|Validation)$")
    test_focus: TestFocus = Field(default=TestFocus.FUNCTIONAL)
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
        
        # Explicit alias mapping for common variations
        focus_aliases = {
            "functional": TestFocus.FUNCTIONAL,
            "performance": TestFocus.PERFORMANCE,
            "accessibility": TestFocus.ACCESSIBILITY,
            "security": TestFocus.SECURITY,
            "usability": TestFocus.USABILITY,
            "reliability": TestFocus.RELIABILITY,
            "compatibility": TestFocus.COMPATIBILITY,
            "other": TestFocus.OTHER
        }
        
        category = data.get("category")
        test_focus_raw = data.get("test_focus")
        
        def resolve_focus(val: Any) -> TestFocus:
            if not val or not isinstance(val, str):
                return TestFocus.FUNCTIONAL
                
            # 1. Clean and casing normalization
            clean_val = val.strip().lower()
            
            # 2. Suffix stripping (deterministic)
            for suffix in [" testing", " validation", " focus", " test"]:
                if clean_val.endswith(suffix):
                    clean_val = clean_val[:-len(suffix)].strip()
                    break
            
            # 3. Direct alias match
            if clean_val in focus_aliases:
                return focus_aliases[clean_val]
                
            return TestFocus.OTHER

        # Normalization Logic:
        
        # 1. Resolve Focus from test_focus field
        focus_from_field = resolve_focus(test_focus_raw) if test_focus_raw else TestFocus.FUNCTIONAL
        
        # 2. Resolve Focus from category (if it's a focus area)
        focus_from_cat = TestFocus.FUNCTIONAL
        if category and category not in allowed_categories:
            focus_from_cat = resolve_focus(category)
            data["category"] = "Validation"
            
        # 3. Decision: Explicit focus wins unless it's Functional and we have something from Category
        if focus_from_field != TestFocus.FUNCTIONAL:
            data["test_focus"] = focus_from_field
        elif focus_from_cat != TestFocus.FUNCTIONAL:
            data["test_focus"] = focus_from_cat
        else:
            data["test_focus"] = TestFocus.FUNCTIONAL
            
        # Rule 4: Ensure category exists
        if not data.get("category"):
            data["category"] = "Validation"
            
        return data

class GenerationResponse(BaseModel):
    metadata: ResponseMetadata
    test_cases: List[GeneratedTestCase] = Field(default_factory=list)
    clarification_questions: List[ClarificationQuestion] = Field(default_factory=list)
    assumptions: List[AssumptionItem] = Field(default_factory=list)
    risk_summary: Optional[RiskSummary] = None
