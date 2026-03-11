from app.schemas.request import GenerationRequest

def sanitize_text(input_text: str | None) -> str:
    """
    Normalizes whitespace and strips unsafe active payloads without destroying 
    structural code requirements or HTML-like strings that are part of the AC.
    """
    if not input_text:
        return ""
    
    text = input_text.replace('\r\n', '\n')
    text = text.replace('\x00', '')
    
    return text.strip()

def sanitize_generation_request(payload: GenerationRequest) -> GenerationRequest:
    """
    Mutates a given GenerationRequest returning a sanitized version ready for prompt construction.
    Limits checking is primarily handled by Pydantic; this strictly handles un-typeable sanitization.
    """
    sanitized = payload.model_copy(deep=True)
    
    if sanitized.user_story:
        sanitized.user_story = sanitize_text(sanitized.user_story)
        
    for ac in sanitized.acceptance_criteria:
        ac.description = sanitize_text(ac.description)
        
    for br in sanitized.business_rules:
        br.description = sanitize_text(br.description)
        
    return sanitized
