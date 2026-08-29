"""Application Settings & Environment Configuration."""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional


class Settings(BaseSettings):
    # Server
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # AI
    GEMINI_API_KEY: Optional[str] = Field(default=None, alias="GEMINI_API_KEY")
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # Database
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None
    DATABASE_URL: Optional[str] = None

    # Toggles & Fallbacks
    USE_MOCK_CONNECTORS: bool = True
    USE_MOCK_REASONING: bool = False

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
