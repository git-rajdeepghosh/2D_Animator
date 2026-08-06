# Progress pub/sub over Redis, bridging the Celery worker and the API's
# WebSocket. The worker publishes stage updates for a job; the API subscribes
# to that job's channel and forwards messages to connected clients.
import json

import redis
import redis.asyncio as aioredis

from app.core.config import settings


def _channel(job_id: str) -> str:
    return f"job:{job_id}:progress"


def publish_progress(job_id: str, status: str, progress: int, **extra: object) -> None:
    """Publish a progress update (called from the synchronous worker)."""
    client = redis.Redis.from_url(settings.redis_url)
    payload = {"job_id": job_id, "status": status, "progress": progress, **extra}
    try:
        client.publish(_channel(job_id), json.dumps(payload))
    finally:
        client.close()


async def subscribe_progress(job_id: str):
    """Async generator yielding progress payloads for a job (used by the WS route)."""
    client = aioredis.Redis.from_url(settings.redis_url)
    pubsub = client.pubsub()
    await pubsub.subscribe(_channel(job_id))
    try:
        async for message in pubsub.listen():
            if message.get("type") != "message":
                continue
            yield json.loads(message["data"])
    finally:
        await pubsub.unsubscribe(_channel(job_id))
        await pubsub.aclose()
        await client.aclose()
