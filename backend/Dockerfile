FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        postgresql-client \
        libmagic1 \
        chromium \
        chromium-driver \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user so Celery doesn't warn about running as root.
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app

COPY requirements /app/requirements/
RUN pip install --upgrade pip && pip install -r requirements/development.txt

COPY --chown=appuser:appuser . /app/

USER appuser