import secrets
import warnings
from functools import lru_cache
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: Literal["development", "test", "production"] = "development"
    database_url: str = "postgresql+psycopg://fridgeai:fridgeai@localhost:5432/fridgeai"

    secret_key: str = ""
    access_token_minutes: int = 12 * 60

    # Any OpenAI-compatible Chat Completions server; OpenRouter by default.
    ai_api_key: str = ""
    ai_base_url: str = "https://openrouter.ai/api/v1"
    ai_model: str = "nvidia/nemotron-3.5-super-vl:free"
    ai_timeout_seconds: float = 120.0
    # Skip the model's hidden "thinking" step: 3x faster scans, same quality for this app's structured tasks.
    ai_disable_reasoning: bool = True
    # Development/testing only: returns clearly labelled sample data instead of calling the AI model.
    ai_mock_mode: bool = False

    max_upload_mb: float = 8.0
    cors_origins: str = "http://localhost:5173"
    ai_rate_limit_per_minute: int = 10
    auth_rate_limit_per_minute: int = 10

    @property
    def max_upload_bytes(self) -> int:
        return int(self.max_upload_mb * 1024 * 1024)

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @model_validator(mode="after")
    def _check(self) -> "Settings":
        if self.environment == "production":
            if len(self.secret_key) < 32:
                raise ValueError("SECRET_KEY must be set (32+ chars) in production")
            if self.ai_mock_mode:
                raise ValueError("AI_MOCK_MODE cannot be enabled in production")
            if "*" in self.cors_origin_list:
                raise ValueError("CORS_ORIGINS must list explicit origins in production")
        elif not self.secret_key:
            # Dev convenience: tokens stop working when the server restarts.
            warnings.warn("SECRET_KEY not set; using a random per-process key (development only)")
            self.secret_key = secrets.token_urlsafe(48)
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
