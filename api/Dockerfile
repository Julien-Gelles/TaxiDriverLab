# syntax=docker/dockerfile:1
#
# Backend image: FastAPI + WebSocket simulation API.
# Build context is the REPO ROOT (see docker-compose.yml) so the API package
# and the `core` simulation package it imports are both available.

FROM python:3.11-slim

# Predictable, quiet Python in containers.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Dependencies first, for Docker layer caching. Torch is pulled from the
# CPU-only wheel index — Taxi-v4 needs no GPU and this keeps the image small.
COPY api/requirements.txt api/requirements.txt
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu \
 && pip install --no-cache-dir -r api/requirements.txt

# Application code: the API package + the simulation core (agents, envs and the
# pretrained models under core/save/ that demo mode replays).
COPY api/ api/
COPY core/ core/

EXPOSE 8000

# The frontend waits on this (compose service_healthy). /health is cheap and
# does not load any model, so it answers as soon as uvicorn is up.
HEALTHCHECK --interval=10s --timeout=3s --start-period=40s --retries=6 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health').status==200 else 1)"

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
