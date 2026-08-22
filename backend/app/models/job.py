# Project + Job models. A Project owns the prompt and its edit state; a Job is
# one run of the generation pipeline for that project.
import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class JobStatus(str, enum.Enum):
    """Pipeline stages a job moves through, in order.

    The worker advances the job through these as each stage completes; the API
    surfaces the current value and streams transitions over WebSocket.
    """

    QUEUED = "queued"
    SCRIPTING = "scripting"   # LLM: prompt -> narration script
    RENDERING = "rendering"   # sandbox: Manim scene code -> video
    VOICING = "voicing"       # TTS: script -> voiceover, then mux
    DONE = "done"
    FAILED = "failed"


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    # Supabase user id (the token's `sub`). Indexed because the only listing
    # query is "everything this user made, newest first".
    user_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    jobs: Mapped[list["Job"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", order_by="Job.created_at"
    )


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))

    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus, native_enum=False), default=JobStatus.QUEUED, nullable=False
    )
    progress: Mapped[int] = mapped_column(Integer, default=0)  # 0-100

    # Whether to synthesize a voiceover for this render. Per-job rather than
    # per-project so a revision can be re-rendered without audio — narration
    # doesn't change when you only edit the scene code, and skipping TTS keeps
    # iterating in the editor free. `server_default` so rows created before
    # this column existed read as True rather than NULL.
    voiceover: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )

    # Pipeline artifacts, filled in as stages complete.
    narration_script: Mapped[str | None] = mapped_column(Text, nullable=True)
    scene_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    video_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # First frame of the render, used as the card thumbnail. Stored rather
    # than derived from the job id so a job whose render failed simply has
    # none, instead of the UI requesting an image that was never made.
    poster_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Length of the finished video, measured with ffprobe once it is muxed.
    # Stored rather than probed on demand so listing pages don't shell out to
    # ffprobe once per card.
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    project: Mapped["Project"] = relationship(back_populates="jobs")

    @property
    def title(self) -> str | None:
        """The parent project's title.

        Exposed on the job so listing responses can carry it without every
        caller reaching through `job.project`. Listing queries eager-load the
        relationship — without that this property is an N+1 waiting to happen.
        """
        return self.project.title if self.project else None
