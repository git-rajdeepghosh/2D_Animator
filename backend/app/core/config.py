# Settings loaded from environment (DB, Redis, storage, LLM/TTS keys).
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration, sourced from the environment / .env.

    Field names map to the variables documented in .env.example. Every value
    has a dev-friendly default so the app boots without a full .env, but the
    LLM/TTS keys must be set for real generation to work.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- Backend API ---
    database_url: str = "postgresql://animator:animator@db:5432/animator"
    redis_url: str = "redis://redis:6379/0"
    storage_dir: str = "/data/renders"

    # Where the frontend runs, used to configure CORS.
    frontend_origin: str = "http://localhost:3000"

    # --- LLM / codegen ---
    llm_api_key: str = "changeme"
    llm_model: str = "claude-sonnet-5"

    # --- Text-to-speech (voiceover) ---
    tts_api_key: str = "changeme"
    tts_voice: str = "default"

    # --- Render sandbox ---
    sandbox_image: str = "2danimator-sandbox:latest"
    render_timeout_seconds: int = 300


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance (read once per process)."""
    return Settings()


settings = get_settings()
