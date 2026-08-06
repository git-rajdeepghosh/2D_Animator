# Project + Job models. A Project owns the prompt and its edit state; a Job is
# one run of the generation pipeline for that project.
import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
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

    # Pipeline artifacts, filled in as stages complete.
    narration_script: Mapped[str | None] = mapped_column(Text, nullable=True)
    scene_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    video_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    project: Mapped["Project"] = relationship(back_populates="jobs")
