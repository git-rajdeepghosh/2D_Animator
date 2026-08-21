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
    # Hand-curated public catalogue: one folder per subject, MP4s inside.
    library_dir: str = "/data/library"

    # Where the frontend runs, used to configure CORS.
    frontend_origin: str = "http://localhost:3000"

    # --- Auth (Supabase) ---
    # Base project URL, e.g. https://<ref>.supabase.co. Access tokens are
    # verified locally against the project's published JWKS, so no shared
    # secret is needed here — only this public URL.
    supabase_url: str = ""
    # Claims every Supabase access token carries. Overridable for self-hosted.
    supabase_jwt_audience: str = "authenticated"

    @property
    def supabase_jwks_url(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"

    @property
    def supabase_issuer(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/auth/v1"

    @property
    def auth_enabled(self) -> bool:
        """Auth is enforced only once a project URL is configured.

        Leaving SUPABASE_URL unset keeps the API open, which is what the
        pipeline work (Track A) needs — it drives the API with curl and has no
        browser session to borrow a token from.
        """
        return bool(self.supabase_url)

    # --- LLM / codegen ---
    # Manim scene code (OpenAI). Use the full `-luna` id: the bare `gpt-5.6`
    # alias routes to a different model in the family (Sol).
    llm_api_key: str = "changeme"
    llm_model: str = "gpt-5.6-luna"

    # Retry ceiling for the OpenAI SDK, which already retries 408/409/429/5xx
    # with exponential backoff — this raises its limit rather than
    # reimplementing backoff on top of it. Higher than the SDK default of 2
    # because a transient upstream blip otherwise kills a job seconds before
    # it would have spent a minute rendering.
    llm_max_retries: int = 5

    # Narration script (Gemini).
    gemini_api_key: str = "changeme"
    gemini_model: str = "gemini-3.7-flash"

    # Which provider writes the narration. "gemini" uses Gemini and falls back
    # to OpenAI if it errors; "openai" skips Gemini entirely (useful when the
    # free tier is rate-limited and you just want runs to go through).
    narration_provider: str = "gemini"

    # OpenAI model used for narration — both as the Gemini fallback and when
    # narration_provider is "openai". Deliberately a nano-tier model: the
    # script is ~150 words, so this costs a fraction of a cent per job.
    narration_fallback_model: str = "gpt-5.4-nano"

    # --- Text-to-speech (voiceover) ---
    # OpenAI's speech endpoint. Leave TTS_API_KEY blank to reuse LLM_API_KEY —
    # it is the same account, and duplicating a secret across two env vars just
    # creates a way for them to drift apart.
    tts_api_key: str = ""
    tts_model: str = "gpt-4o-mini-tts"
    tts_voice: str = "alloy"

    # Synthesized audio is cached here, keyed by the narration text and the
    # voice settings. Re-rendering edited scene code reuses the same narration,
    # so without this every iteration in the editor pays for identical speech.
    tts_cache_dir: str = "/data/tts-cache"

    # gpt-4o-mini-tts accepts free-text delivery direction alongside the script,
    # so house tone is configuration rather than something baked into a voice
    # choice. Applies to every video.
    tts_instructions: str = (
        "Speak calmly and clearly at a measured pace, like a patient teacher "
        "explaining a concept to a curious student."
    )

    @property
    def tts_key(self) -> str:
        """Key for the speech endpoint, falling back to the main OpenAI key."""
        return self.tts_api_key or self.llm_api_key

    # --- Signed render URLs ---
    # HMAC key for the short-lived signatures on /renders. A <video> tag cannot
    # send an Authorization header, so private output is protected by signing
    # the URL instead. Generate one with:
    #   python -c "import secrets; print(secrets.token_urlsafe(32))"
    render_url_secret: str = ""

    # --- Render sandbox ---
    sandbox_image: str = "2danimator-sandbox:latest"
    render_timeout_seconds: int = 300

    # Scratch space for per-job scene code and render output, as the *worker*
    # sees it.
    sandbox_work_dir: str = "/data/work"

    # The same directory as the *Docker daemon* sees it. When the worker runs
    # inside a container it drives the host's daemon over the mounted socket,
    # and the daemon resolves bind-mount sources on the host — it cannot see
    # paths inside the worker's own filesystem. Leave blank when running the
    # worker directly on the host, where no translation is needed.
    sandbox_work_host_dir: str = ""


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance (read once per process)."""
    return Settings()


settings = get_settings()
