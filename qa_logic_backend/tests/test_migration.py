from app.schemas.response import GeneratedTestCase
from app.services.ai.gemini_adapter import generate_test_cases
from app.schemas.request import GenerationRequest, SettingsPreferences
from app.core.exceptions import BaseAPIException
from unittest.mock import AsyncMock, patch
import pytest

@pytest.mark.asyncio
async def test_ai_schema_failure_reclassification():
    """Verify that pydantic validation errors in AI responses return 422."""
    mock_request = GenerationRequest(
        user_story="test",
        acceptance_criteria=[],
        business_rules=[],
        preferences=SettingsPreferences(target_count=12, strictness_preset="Balanced")
    )
    
    # Mock Gemini to return malformed JSON that fails Pydantic but is valid JSON
    # e.g. missing 'id'
    malformed_payload = '{"test_cases": [{"title": "no id"}]}'
    
    with patch("app.services.ai.gemini_adapter.get_gemini_client") as mock_client_factory:
        mock_client = mock_client_factory.return_value
        
        from unittest.mock import MagicMock
        mock_response = MagicMock()
        mock_response.text = malformed_payload
        
        # Mock the async call
        mock_client.aio.models.generate_content = AsyncMock(return_value=mock_response)
        
        with pytest.raises(BaseAPIException) as exc_info:
            await generate_test_cases(mock_request)
        
        assert exc_info.value.status_code == 422
        assert exc_info.value.code == "AI_SCHEMA_FAILURE"
        assert exc_info.value.errors is not None

def test_legacy_category_normalization_domain_match():
    """Rule 2: Known domain in category should move to test_focus."""
    data = {
        "id": "TC-001",
        "title": "Legacy Performance Test",
        "expected_result": "Success",
        "priority": "High",
        "category": "Performance",
        "severity": 3,
        "probability": 2,
    }
    tc = GeneratedTestCase.model_validate(data)
    assert tc.category == "Validation"
    assert tc.test_focus == "Performance"

def test_legacy_category_normalization_unknown_domain():
    """Rule 3: Unknown category should map to test_focus='Other'."""
    data = {
        "id": "TC-002",
        "title": "Unknown Legacy Category",
        "expected_result": "Success",
        "priority": "Medium",
        "category": "StrangeCategory",
        "severity": 3,
        "probability": 2,
    }
    tc = GeneratedTestCase.model_validate(data)
    assert tc.category == "Validation"
    assert tc.test_focus == "Other"

def test_legacy_category_normalization_passthrough():
    """Rule 1: Valid scenario categories should remain unchanged."""
    data = {
        "id": "TC-003",
        "title": "Normal Negative Test",
        "expected_result": "Error",
        "priority": "Low",
        "category": "Negative",
        "severity": 4,
        "probability": 1,
    }
    tc = GeneratedTestCase.model_validate(data)
    assert tc.category == "Negative"
    assert tc.test_focus == "Functional"  # Defaulting rule

def test_missing_test_focus_defaulting():
    """Rule: Default test_focus to Functional if missing."""
    data = {
        "id": "TC-004",
        "title": "No Focus Test",
        "expected_result": "OK",
        "priority": "Medium",
        "category": "Positive",
        "severity": 3,
        "probability": 3,
    }
    tc = GeneratedTestCase.model_validate(data)
    assert tc.test_focus == "Functional"

def test_modern_payload_validation():
    """Verify modern payloads with both fields work correctly."""
    data = {
        "id": "TC-005",
        "title": "Modern Security Edge Case",
        "expected_result": "Forbidden",
        "priority": "High",
        "category": "Edge Case",
        "test_focus": "Security",
        "severity": 5,
        "probability": 1,
    }
    tc = GeneratedTestCase.model_validate(data)
    assert tc.category == "Edge Case"
    assert tc.test_focus == "Security"

def test_normalization_casing_and_suffixes():
    """Verify casing normalization and suffix stripping."""
    cases = [
        ("security testing", "Security"),
        ("FUNCTIONAL focus", "Functional"),
        ("Performance validation", "Performance"),
        ("Accessibility Test", "Accessibility"),
    ]
    for raw, expected in cases:
        data = {
            "id": "TC-XYZ",
            "title": f"Testing {raw}",
            "expected_result": "OK",
            "priority": "Low",
            "category": "Validation",
            "test_focus": raw,
            "severity": 1,
            "probability": 1,
        }
        tc = GeneratedTestCase.model_validate(data)
        assert tc.test_focus == expected

def test_normalization_fallbacks():
    """Verify null/empty/unknown map to Other or default."""
    # Unknown -> Other
    data_unknown = {
        "id": "TC-UN",
        "title": "Unknown Focus",
        "expected_result": "OK",
        "priority": "Medium",
        "category": "Validation",
        "test_focus": "Weird Domain",
        "severity": 3,
        "probability": 3,
    }
    assert GeneratedTestCase.model_validate(data_unknown).test_focus == "Other"

    # Empty -> Functional (default)
    data_empty = {
        "id": "TC-EM",
        "title": "Empty Focus",
        "expected_result": "OK",
        "priority": "Medium",
        "category": "Validation",
        "test_focus": "",
        "severity": 3,
        "probability": 3,
    }
    assert GeneratedTestCase.model_validate(data_empty).test_focus == "Functional"

def test_normalization_rule_overlap():
    """Rule 1 (Category=Focus) vs Rule 2 (Focus exists)."""
    data = {
        "id": "TC-OVR",
        "title": "Overlap",
        "expected_result": "OK",
        "priority": "High",
        "category": "Security",
        "test_focus": "Performance Testing",
        "severity": 4,
        "probability": 2,
    }
    tc = GeneratedTestCase.model_validate(data)
    # The current logic: if category is a FOCUS, it sets test_focus. 
    # But then row 2 also sets test_focus. 
    # In my current implementation: 
    # Rule 1 sets test_focus to resolved(category)
    # Rule 2 then sets test_focus to resolved(test_focus)
    # So test_focus should win.
    assert tc.category == "Validation"
    assert tc.test_focus == "Performance"
