# Richat Funding Tracker

A full-stack B2B platform for Mauritanian businesses to access international climate financing.

## Architecture

- **Backend:** Django 5, DRF, PostgreSQL, Redis, Celery, Channels
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, TanStack Query, Zustand
- **Orchestration:** Docker Compose

## Quick Start

### 1. Environment Setup

```bash
cp .env.example .env
# Edit .env to set your desired variables
```

### 2. Launch Services

```bash
make up-build
```

### 3. Setup Database & Static Files

```bash
make migrate
make collect
make createsuperuser
```

### 4. Developer Commands

This project includes a fully featured Makefile.

```bash
make help       # Shows all commands
make test       # Runs both frontend and backend tests
make shell-be   # Opens Django shell
make scrape     # Runs the celery web scraper manually
```
# Richat_Funding_Tracker
