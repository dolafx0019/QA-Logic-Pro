from pydantic import BaseModel, Field
from typing import List, Optional

class PRDExtractionItem(BaseModel):
    id: str = Field(..., description="A unique readable ID, e.g., US-001, BR-001")
    description: str

class PRDAcceptanceCriteria(BaseModel):
    id: str = Field(..., description="E.g., AC-001")
    description: str
    linked_story_id: Optional[str] = Field(None, description="The ID of the User Story this AC belongs to if applicable")

class PRDExtractionMetadata(BaseModel):
    source_file_name: str
    source_file_type: str
    extracted_text_length: int
    chunk_count: int = 1
    warnings: List[str] = Field(default_factory=list)
    is_truncated: bool = False
    parsing_notes: str = ""

class PRDExtractionResponse(BaseModel):
    metadata: PRDExtractionMetadata
    document_title: str
    product_summary: str
    actors: List[str] = Field(default_factory=list)
    user_stories: List[PRDExtractionItem] = Field(default_factory=list)
    acceptance_criteria: List[PRDAcceptanceCriteria] = Field(default_factory=list)
    business_rules: List[PRDExtractionItem] = Field(default_factory=list)
    constraints: List[PRDExtractionItem] = Field(default_factory=list)
    edge_cases: List[PRDExtractionItem] = Field(default_factory=list)
    assumptions: List[PRDExtractionItem] = Field(default_factory=list)
    clarification_questions: List[PRDExtractionItem] = Field(default_factory=list)
    out_of_scope: List[PRDExtractionItem] = Field(default_factory=list)
    confidence_summary: str = Field(..., description="AI confidence summary about extraction quality")
    ai_warnings: List[str] = Field(default_factory=list, description="AI identified conflicts or gaps in the document")
