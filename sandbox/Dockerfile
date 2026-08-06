# Isolated Manim render environment. Runs untrusted, LLM-generated scene code
# with no network, a read-only code mount, and a strict CPU/time budget.
FROM python:3.11-slim

# System deps for Manim (cairo, pango, ffmpeg, LaTeX for math typesetting).
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg build-essential pkg-config libcairo2-dev libpango1.0-dev \
    texlive texlive-latex-extra texlive-fonts-extra dvisvgm \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir manim

# In-container render entrypoint (reads mounted scene code, runs Manim).
COPY scripts/ /sandbox/scripts/

# Non-root render user.
RUN useradd -m renderer
USER renderer
WORKDIR /work

# Entrypoint receives a scene file + config, renders to /work/out, exits.
ENTRYPOINT ["python", "/sandbox/scripts/render.py"]
