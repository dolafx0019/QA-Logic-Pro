from pydantic import BaseModel, Field, model_validator, StringConstraints
from typing import List, Optional
from typing_extensions import Annotated

StrictStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]

class AcceptanceCriteriaItem(BaseModel):
    id: StrictStr = Field(..., description="e.g., AC-1")
    description: StrictStr

class BusinessRuleItem(BaseModel):
    id: StrictStr = Field(..., description="e.g., BR-1")
    description: StrictStr

class SettingsPreferences(BaseModel):
    target_count: int = Field(default=25, ge=12, le=50)
    strictness_preset: str = Field(default="Balanced", pattern="^(Relaxed|Balanced|Strict)$")

class GenerationRequest(BaseModel):
    user_story: Optional[str] = Field(default="", max_length=5000)
    acceptance_criteria: List[AcceptanceCriteriaItem] = Field(default_factory=list)
    business_rules: List[BusinessRuleItem] = Field(default_factory=list)
    preferences: SettingsPreferences = Field(default_factory=SettingsPreferences)

    @model_validator(mode='after')
    def check_non_empty_requirements(self) -> 'GenerationRequest':
        has_story = bool(self.user_story and self.user_story.strip())
        has_ac = bool(self.acceptance_criteria)
        if not has_story and not has_ac:
            raise ValueError("User Story or Acceptance Criteria must not be completely empty.")
        return self
