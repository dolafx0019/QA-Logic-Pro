from typing import List, Dict, Tuple
from app.schemas.response import GenerationResponse, GeneratedTestCase, RiskSummary

def calculate_risk(tc: GeneratedTestCase) -> GeneratedTestCase:
    """
    Deterministically computes risk mapping based solely on Severity and Probability.
    Does not interpret or mutate the semantic priority natively assigned by the LLM.
    """
    tc.risk_score = tc.severity * tc.probability
    
    if tc.risk_score <= 5:
        tc.risk_level = "Low"
    elif tc.risk_score <= 12:
        tc.risk_level = "Medium"
    else:
        tc.risk_level = "High"
        
    return tc

def calculate_risk_summary(cases: List[GeneratedTestCase]) -> RiskSummary:
    """Calculates summary aggregates from the final trimmed payload list."""
    total_high = 0
    total_medium = 0
    total_low = 0
    total_score = 0
    count = len(cases)
    
    for tc in cases:
        if tc.risk_level == "High":
            total_high += 1
        elif tc.risk_level == "Medium":
            total_medium += 1
        elif tc.risk_level == "Low":
            total_low += 1
        
        total_score += (tc.risk_score or 0)
        
    avg = round(total_score / count, 2) if count > 0 else 0.0
    return RiskSummary(
        total_high=total_high,
        total_medium=total_medium,
        total_low=total_low,
        average_score=avg
    )

def _normalize_requirement(req: str | None) -> str:
    """Bucket missing or whitespace-only requirements predictably."""
    if not req or not req.strip():
        return "__unlinked__"
    return req.strip()

def process_and_truncate_generation(response: GenerationResponse, max_cap: int = 50) -> GenerationResponse:
    """
    Applies deterministic risk calculations and explicit truncation if necessary.
    Metadata explicitly tracks the events.
    Requirement Coverage is preserved where possible before falling back to Risk sorting.
    """
    # 1. Update risk scores
    for tc in response.test_cases:
        calculate_risk(tc)
        
    original_count = len(response.test_cases)
    
    # Phase 4 explicitly owns metadata lifecycle correctly
    response.metadata.original_count = original_count
    response.metadata.truncated = (original_count > max_cap)
    
    if original_count <= max_cap:
        response.risk_summary = calculate_risk_summary(response.test_cases)
        return response
    
    # 2. Decorate with original index for stable tie-breaking
    decorated = [(i, tc) for i, tc in enumerate(response.test_cases)]
    
    # 3. Group by normalized requirement
    req_groups: Dict[str, List[Tuple[int, GeneratedTestCase]]] = {}
    for idx, tc in decorated:
        norm_req = _normalize_requirement(tc.linked_requirement)
        if norm_req not in req_groups:
            req_groups[norm_req] = []
        req_groups[norm_req].append((idx, tc))
        
    # Sort function: Sort Descending by Risk Score, Ascending by Original Index (Stability)
    def sort_key(item: Tuple[int, GeneratedTestCase]):
        return (-(item[1].risk_score or 0), item[0])
        
    # 4. Sort cases within each group
    for k in req_groups:
        req_groups[k].sort(key=sort_key)
        
    final_cases: List[Tuple[int, GeneratedTestCase]] = []
    
    # 5. Take highest risk from each unique requirement group
    first_picks = []
    for k, items in req_groups.items():
        if items:
            first_picks.append(items.pop(0))
            
    # If the number of distinct requirements > max_cap, we still must trim
    # Prioritize keeping the highest risk coverage cases
    first_picks.sort(key=sort_key)
    final_cases.extend(first_picks[:max_cap])
    
    # 6. If we need more slots, fill directly sorted by Risk Score DESC
    if len(final_cases) < max_cap:
        remaining = []
        for items in req_groups.values():
            remaining.extend(items)
            
        remaining.sort(key=sort_key)
        slots_left = max_cap - len(final_cases)
        final_cases.extend(remaining[:slots_left])
        
    # 7. Final overall sorting to ensure output order is purely deterministic
    final_cases.sort(key=sort_key)
    
    response.test_cases = [tc for idx, tc in final_cases]
    response.risk_summary = calculate_risk_summary(response.test_cases)
    
    return response
