from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "QA-Logic Pro MVP"
    API_V1_STR: str = "/api/v1"
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173"]
    
    # Database (No persistence implemented yet, just prepared)
    DATABASE_URL: str = "sqlite+aiosqlite:///./qa_logic.db"

    # AI Provider
    GEMINI_API_KEY: str = ""
    GEMINI_EXTRACTION_MODEL: str = "gemini-2.5-flash"
    GEMINI_GENERATION_MODEL: str = "gemini-2.5-flash"
    MOCK_MODE: bool = False
    DEBUG_AI_PIPELINE: bool = False
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
