# Celery app: broker=Redis. Registers tasks in worker/tasks/.
from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "2danimator",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["worker.tasks.render"],
)

celery_app.conf.update(
    task_track_started=True,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_time_limit=settings.render_timeout_seconds + 120,  # hard cap beyond the sandbox budget
)
