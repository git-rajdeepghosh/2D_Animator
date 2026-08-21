# One image, two processes: the FastAPI API and the Celery worker (see the
# `api` and `worker` services in docker-compose.yml, which override CMD).
#
# Deliberately does NOT install Manim. This image never renders — the worker
# only launches throwaway sandbox containers via the mounted Docker socket, so
# Manim and its heavy native deps (cairo, pango, LaTeX) live solely in
# sandbox/Dockerfile.
FROM python:3.11-slim

# ffmpeg is needed by worker/tasks/render.py `_mux()` to combine the rendered
# video with the TTS voiceover. Harmless while TTS is unconfigured (that stage
# degrades to the silent render), required as soon as a provider is wired up.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Copy requirements first so pip layers cache across source-only changes.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Overridden by docker-compose for the worker service.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
