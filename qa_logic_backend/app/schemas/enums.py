from enum import Enum

class TestFocus(str, Enum):
    FUNCTIONAL = "Functional"
    PERFORMANCE = "Performance"
    ACCESSIBILITY = "Accessibility"
    SECURITY = "Security"
    USABILITY = "Usability"
    RELIABILITY = "Reliability"
    COMPATIBILITY = "Compatibility"
    OTHER = "Other"
