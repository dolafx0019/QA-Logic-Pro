import pytest
from app.schemas.response import GeneratedTestCase

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
