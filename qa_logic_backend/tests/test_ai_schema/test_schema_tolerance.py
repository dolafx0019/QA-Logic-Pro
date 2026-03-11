import pytest
from app.schemas.ai import LLMGenerationResponse

def test_llm_schema_tolerates_omitted_fields():
    """
    Test that the LLM schemas gracefully default omitted fields 
    (like notes, preconditions, and linked_requirement) 
    instead of throwing a ValidationError.
    """
    # Raw JSON payload simulating the AI returning a test case but 
    # omitting 'notes', 'preconditions', and 'linked_requirement'
    raw_payload = {
        "test_cases": [
            {
                "id": "TC-001",
                "title": "Check Login Edge Case",
                "steps": ["Step 1", "Step 2"],
                "expected_result": "Works",
                "priority": "High",
                "category": "Edge Case",
                "severity": 3,
                "probability": 2
                # Intentionally omitting: linked_requirement, preconditions, notes
            }
        ],
        "clarification_questions": [],
        "assumptions": []
    }
    
    # This should parse successfully without crashing
    response = LLMGenerationResponse.model_validate(raw_payload)
    
    assert len(response.test_cases) == 1
    tc = response.test_cases[0]
    
    # Verify the fallback defaults activated properly
    assert tc.linked_requirement == "__unlinked__"
    assert tc.preconditions == ""
    assert tc.notes == ""
    assert tc.steps == ["Step 1", "Step 2"]
