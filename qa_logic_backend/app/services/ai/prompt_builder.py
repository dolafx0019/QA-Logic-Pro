import re
from app.schemas.request import GenerationRequest

def detect_dominant_language(text: str) -> str:
    """
    Simple heuristic to detect if Arabic is dominant over English.
    Returns "Arabic" or "English".
    """
    if not text:
        return "English"
    
    arabic_chars = len(re.findall(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]', text))
    english_chars = len(re.findall(r'[a-zA-Z]', text))
    
    if arabic_chars > english_chars:
        return "Arabic"
    return "English"

def build_generation_prompt(request: GenerationRequest) -> str:
    """
    Builds the structured text prompt for Gemini, including the explicit language hint
    and standard test case generation rules.
    """
    all_text = [request.user_story or ""]
    for ac in request.acceptance_criteria:
        all_text.append(ac.description)
    for br in request.business_rules:
        all_text.append(br.description)
        
    combined_text = " ".join(all_text)
    dominant_language = detect_dominant_language(combined_text)
    
    prompt = f"""
You are an expert QA Automation Architect. Your task is to generate comprehensive test cases based on the provided requirements.

### Language Requirement
The detected dominant language of the input is: {dominant_language}. 
You must output ALL generated test cases, assumptions, and clarification questions natively in {dominant_language}.

### Output Volume
You must generate around {request.preferences.target_count} test cases (minimum 12, maximum 50).

### Input Requirements
User Story:
{request.user_story if request.user_story else "N/A"}

Acceptance Criteria:
"""
    if request.acceptance_criteria:
        for ac in request.acceptance_criteria:
            prompt += f"- [{ac.id}] {ac.description}\n"
    else:
        prompt += "N/A\n"
        
    prompt += "\nBusiness Rules:\n"
    if request.business_rules:
        # Build relevance keywords from user story and ACs
        relevance_kw = set()
        if request.user_story:
            relevance_kw.update(w.lower() for w in request.user_story.split() if len(w) > 4)
        for ac in request.acceptance_criteria:
            relevance_kw.update(w.lower() for w in ac.description.split() if len(w) > 4)

        included_rules = []
        # Heuristic budget: inject up to 2,500 characters of rule text into the prompt.
        # Rules are included only if they match relevance keywords or contain global-scope language.
        # This is a lightweight heuristic, not a perfect relevance engine.
        char_budget = 2500
        current_chars = 0
        
        for br in request.business_rules:
            br_lower = br.description.lower()
            # Always include clearly global rules
            is_global = any(gw in br_lower for gw in ["all", "every", "always", "global", "system", "must"])
            # Match rules that share words with the specific user story being generated
            is_relevant = any(kw in br_lower for kw in relevance_kw)
            
            if is_global or is_relevant:
                br_len = len(br.description)
                if current_chars + br_len <= char_budget:
                    included_rules.append(br)
                    current_chars += br_len

        # Fallback if filtered list is empty, just take the first few within budget
        if not included_rules:
            for br in request.business_rules:
                br_len = len(br.description)
                if current_chars + br_len <= char_budget:
                    included_rules.append(br)
                    current_chars += br_len

        for br in included_rules:
            prompt += f"- [{br.id}] {br.description}\n"
            
        if len(included_rules) < len(request.business_rules):
            prompt += f"(Filtered {len(request.business_rules) - len(included_rules)} rules to save context tokens)\n"
    else:
        prompt += "N/A\n"
        
    prompt += """
### Rules of Generation
1. Do not invent business rules. If the input is incomplete, produce Assumptions and ClarificationQuestions instead of hallucinating certainty.
2. If the inputs conflict, surface the conflict explicitly in both `clarification_questions` and `assumptions`. Do not silently choose one rule.
3. For each test case, suggest a severity (1-5) and probability (1-5), where 5 is the most severe/probable.
4. **Taxonomy Rules**:
   - `category`: Scenario type. Allowed: Positive, Negative, Edge Case, Boundary, Validation.
   - `test_focus`: Testing domain. Allowed: Functional, Performance, Accessibility, Security, Usability, Reliability, Compatibility, Other.
   - Example: A performance latency check is `test_focus = Performance` and `category = Validation`.
   - Default `test_focus` to "Functional" if it is a standard business requirement check.
5. Follow the provided response schema exactly.
"""
    return prompt.strip()
