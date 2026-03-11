import pytest
from app.schemas.response import GenerationResponse, GeneratedTestCase, ResponseMetadata
from app.services.risk.calculator import calculate_risk, process_and_truncate_generation

def create_mock_tc(id: str, severity: int, probability: int, linked_req: str = "REQ-1"):
    return GeneratedTestCase(
        id=id,
        linked_requirement=linked_req,
        title=f"Test {id}",
        preconditions="None",
        steps=["Step 1"],
        expected_result="Pass",
        priority="High",
        category="Positive",
        severity=severity,
        probability=probability,
        notes="note"
    )

def create_mock_response(cases: list[GeneratedTestCase]) -> GenerationResponse:
    return GenerationResponse(
        metadata=ResponseMetadata(truncated=False, original_count=len(cases)),
        test_cases=cases,
        clarification_questions=[],
        assumptions=[]
    )

def test_basic_score_mapping_and_boundaries():
    boundaries = [
        (1, 1, 1, "Low"),
        (1, 5, 5, "Low"),
        (2, 3, 6, "Medium"),
        (3, 4, 12, "Medium"),
        (5, 3, 15, "High"),
        (5, 5, 25, "High")
    ]
    
    for sev, prob, expected_score, expected_level in boundaries:
        tc = create_mock_tc("TC-1", sev, prob)
        tc = calculate_risk(tc)
        assert tc.risk_score == expected_score
        assert tc.risk_level == expected_level
        # Ensure semantic priority is unchanged.
        assert tc.priority == "High"

def test_no_truncation_path():
    cases = [create_mock_tc(f"TC-{i}", 2, 2) for i in range(10)]
    resp = create_mock_response(cases)
    
    processed = process_and_truncate_generation(resp, max_cap=50)
    
    assert processed.metadata.truncated is False
    assert processed.metadata.original_count == 10
    assert len(processed.test_cases) == 10
    assert processed.risk_summary is not None
    assert processed.risk_summary.total_low == 10

def test_truncation_repeated_requirements():
    cases = [create_mock_tc(f"TC-{i}", 5, 5, "REQ-1") for i in range(30)] + \
            [create_mock_tc(f"TC-{i}", 3, 2, "REQ-2") for i in range(30, 60)]
            
    resp = create_mock_response(cases)
    processed = process_and_truncate_generation(resp, max_cap=50)
    
    assert processed.metadata.truncated is True
    assert processed.metadata.original_count == 60
    assert len(processed.test_cases) == 50
    
    # Requirement 2 MUST have at least 1 case preserved
    req2_cases = [tc for tc in processed.test_cases if tc.linked_requirement == "REQ-2"]
    assert len(req2_cases) > 0

def test_truncation_missing_or_blank_requirements():
    cases = [create_mock_tc(f"TC-{i}", 5, 5, " ") for i in range(40)] + \
            [create_mock_tc(f"TC-{i}", 2, 2, "") for i in range(40, 60)]
            
    resp = create_mock_response(cases)
    processed = process_and_truncate_generation(resp, max_cap=50)
    
    assert processed.metadata.truncated is True
    assert len(processed.test_cases) == 50
    # Both sets group into `__unlinked__`
    # It will pick 1 high risk from `__unlinked__` naturally, then fill with rest of high risk
    assert processed.test_cases[0].risk_score == 25

def test_more_than_50_distinct_requirements():
    cases = [create_mock_tc(f"TC-{i}", 1, 1, f"REQ-{i}") for i in range(60)]
    # Mark the last 10 as High Risk
    for tc in cases[50:]:
        tc.severity = 5
        tc.probability = 5
        
    resp = create_mock_response(cases)
    processed = process_and_truncate_generation(resp, max_cap=50)
    
    assert processed.metadata.truncated is True
    assert len(processed.test_cases) == 50
    # Should prioritize the 10 HIGH risk requirements first
    high_risk_groups = [tc for tc in processed.test_cases if tc.risk_score == 25]
    assert len(high_risk_groups) == 10

def test_stable_ordering():
    cases = [
        create_mock_tc("TC-1", 4, 4, "REQ-A"), # 16 (High)
        create_mock_tc("TC-2", 4, 4, "REQ-B"), # 16 (High)
        create_mock_tc("TC-3", 4, 4, "REQ-A"), # 16 (High)
    ]
    resp = create_mock_response(cases)
    processed = process_and_truncate_generation(resp, max_cap=2)
    
    assert processed.metadata.truncated is True
    assert len(processed.test_cases) == 2
    # Requirement coverage first => REQ-A and REQ-B should both exist.
    assert processed.test_cases[0].id == "TC-1"
    assert processed.test_cases[1].id == "TC-2"
