# Request/response models for the API (distinct from the ORM models).
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_serializer

from app.core import signing
from app.models.job import JobStatus


class JobCreate(BaseModel):
    """Body for POST /jobs — a plain-language concept prompt."""

    prompt: str = Field(min_length=1, max_length=2000)
    title: str | None = Field(default=None, max_length=200)
    # Synthesize a narrated voiceover. Defaults on so existing callers are
    # unaffected; turning it off skips TTS and ships the silent render.
    voiceover: bool = True


class JobRead(BaseModel):
    """Status + result view of a job, returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    status: JobStatus
    progress: int
    video_url: str | None = None
    # First frame of the render, for card thumbnails. Signed like
    # video_url, since it lives under the same private /renders route.
    poster_url: str | None = None
    error: str | None = None
    voiceover: bool = True
    # Denormalised from the parent Project so listing pages can render a card
    # without a second request per job.
    title: str | None = None
    duration_seconds: float | None = None
    created_at: datetime
    updated_at: datetime

    @field_serializer("video_url", "poster_url")
    def _sign_video_url(self, value: str | None) -> str | None:
        """Attach a signed, expiring token to the render URL.

        Done at serialization rather than in each route so every response
        carrying a job — create, get, list, revisions, detail — returns a URL
        that actually plays, and the frontend needs no knowledge of signing.

        Left untouched when no secret is configured, which keeps the open local
        mode working; startup warns loudly in that case.
        """
        if not value or not signing.is_configured():
            return value
        return signing.sign_path(value)


class JobDetail(JobRead):
    """Everything the editor needs for one job.

    Separate from JobRead on purpose: the listing endpoints stay lean, and the
    pipeline artifacts (which can run to thousands of characters) are only sent
    when something actually intends to display or edit them.
    """

    prompt: str
    narration_script: str | None = None
    scene_code: str | None = None


class RerenderCreate(BaseModel):
    """Body for POST /jobs/{id}/rerender — edited scene code to render again.

    Narration carries over from the job being revised, so a re-render never
    touches an LLM. Voiceover can be turned off per revision to skip TTS as
    well, which makes iterating on scene code entirely free.
    """

    scene_code: str = Field(min_length=1, max_length=100_000)
    # None inherits the setting from the job being revised.
    voiceover: bool | None = None


class LibraryVideo(BaseModel):
    """One curated video in the public catalogue."""

    id: str
    title: str
    url: str
    duration_seconds: float | None = None


class LibraryCollection(BaseModel):
    """A subject folder and the videos inside it."""

    slug: str
    name: str
    videos: list[LibraryVideo]


class JobUpdate(BaseModel):
    """Body for PATCH /jobs/{id} — currently just the title.

    The title lives on the Project, so renaming one job renames every revision
    of it. That is intended: revisions are takes of the same video, not
    separate videos.
    """

    title: str = Field(min_length=1, max_length=200)
