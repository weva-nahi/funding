FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        postgresql-client \
        libmagic1 \
        chromium \
        chromium-driver \
    && rm -rf /var/lib/apt/lists/*

COPY requirements /app/requirements/
RUN pip install --upgrade pip && pip install -r requirements/development.txt

COPY . /app/
