# Request/response models for the API (distinct from the ORM models).
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.job import JobStatus


class JobCreate(BaseModel):
    """Body for POST /jobs — a plain-language concept prompt."""

    prompt: str = Field(min_length=1, max_length=2000)
    title: str | None = Field(default=None, max_length=200)


class JobRead(BaseModel):
    """Status + result view of a job, returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    status: JobStatus
    progress: int
    video_url: str | None = None
    error: str | None = None
    created_at: datetime
    updated_at: datetime
