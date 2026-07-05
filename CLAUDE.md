# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A full-stack B2B platform helping Mauritanian businesses discover, apply for, and track international climate financing opportunities (GEF, GCF, World Bank, AFD, EU, OECD, Climate Funds Update). Built by Richat Partners.

Stack: Django 5 + DRF + MySQL 8.0 + Redis 7 + Celery/Celery Beat + Django Channels on the backend; React 18 + TypeScript + Vite + Tailwind + TanStack Query + Zustand + react-i18next on the frontend. Everything runs as native local processes — no Docker, no reverse proxy.

## Commands

Backend needs a Python venv + a locally running MySQL 8.0 and a Redis-compatible server (Memurai on Windows, or Redis in WSL2). Frontend needs Node 20+.

```bash
# Backend setup (from backend/)
python -m venv venv && venv\Scripts\activate
pip install -r requirements/development.txt
python manage.py migrate
python manage.py create_demo_accounts   # admin@richat.mr / Admin1234!, client@richat.mr / Client1234!
python manage.py runserver              # serves HTTP + WebSockets (Channels patches runserver in DEBUG)

# Celery (separate terminals, only needed for background jobs/notifications/scraping)
# --pool=solo is required on Windows (prefork/billiard multiprocessing is unreliable there);
# use --concurrency=N instead on Linux/macOS.
celery -A config worker -l info --pool=solo -Q celery,default,scraping
celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler

# Frontend (from frontend/)
npm install
npm run dev

# Backend tests
cd backend && pytest -v --tb=short
pytest tests/test_applications_services.py -v                                    # single file
pytest tests/test_applications_services.py::TestClassName::test_name -v          # single test

# Frontend tests
cd frontend && npm run test          # vitest run
npm run test:watch                   # watch mode
npx tsc --noEmit                     # typecheck

# Lint
cd backend && flake8 .
cd frontend && npm run lint

# Migrations
cd backend && python manage.py makemigrations
cd backend && python manage.py migrate

# Trigger a scraper manually
cd backend && python -c \
  "from apps.scraping.tasks import run_scraping_job; run_scraping_job.delay(source='gef')"
```

Backend test settings: `pytest.ini` forces `DJANGO_SETTINGS_MODULE=config.settings.test` and `--reuse-db`; tests live under `backend/tests/` (not colocated with apps).

CI (`.github/workflows/ci.yml`) runs on push/PR to `main`/`develop`: flake8 (errors only: E9,F63,F7,F82,W6,E711,E712), `pytest -v --tb=short` against MySQL+Redis GitHub Actions service containers, frontend `tsc --noEmit`, and `npm run test`. There is no CD/deploy pipeline — this project runs locally only.

## Architecture

### Backend: services/selectors pattern

Each Django app under `backend/apps/` (`authentication`, `organizations`, `opportunities`, `applications`, `documents`, `notifications`, `scraping`, `consulting`, `analytics`, `audit`) follows a consistent internal split — **read this before touching business logic**:

- `models.py` — schema only
- `services.py` — all write operations / business logic (functions take keyword-only args, e.g. `create_application(*, user, opportunity, ...)`), raise `common.exceptions.ApplicationError` (or app-specific equivalents) for domain errors
- `selectors.py` — read/query logic
- `serializers.py`, `views.py`, `urls.py` — DRF layer, thin; delegate to services/selectors
- `tasks.py` — Celery tasks (where applicable)
- `admin.py` — Django admin registration

Cross-app calls happen by importing the other app's `services` module directly (e.g. `applications/services.py` calls into `apps.notifications.services.create_notification` inline to avoid import cycles). Follow this convention rather than reaching into another app's models/views directly.

`backend/common/` holds shared cross-app code: `exceptions.py`, `permissions.py`, `pagination.py`, `mixins.py`, `validators.py`, and Mauritania-specific filtering utilities under `common/utils/`.

`backend/config/` is the Django project root: `settings/` is split into `base.py`/`development.py`/`production.py`/`test.py`, plus `urls.py` (all API routes are namespaced under `/api/v1/<app>/`), `celery.py`, `asgi.py` (Channels entrypoint for WebSockets, served automatically by `runserver` in DEBUG).

### Redis partitioning

One Redis instance, four logical DBs — each independently movable to its own instance via env var, no code changes needed:

| DB | Purpose | Env var |
|---|---|---|
| 1 | Celery broker | `CELERY_BROKER_URL` |
| 2 | Celery result backend | `CELERY_RESULT_BACKEND` |
| 3 | Django Channels (WebSockets) | `CHANNEL_LAYERS_BACKEND` |
| 4 | Django cache / auth tokens | `REDIS_CACHE_URL` |

### Background jobs

Two Celery queues: a general queue and a dedicated scraping queue, plus `celery beat` for scheduled tasks (e.g. monthly audit log retention pruning). Scraping jobs run per-source (GEF, GCF, World Bank, AFD, EU, OECD, Climate Funds Update) and:
- filter exclusively for Mauritania
- keep only results with both a financed amount and a non-expired deadline
- skip duplicates silently
- run until the source is exhausted

The OECD scraper requires Chrome + a matching ChromeDriver (`CHROME_BINARY_PATH`, `CHROMEDRIVER_PATH` in `.env`, pointing at your local install).

### Application workflow (state machine)

```
pending → shortlisted → approved
  ↓           ↓
rejected    rejected
```

No draft state — clients apply directly via a 3-step flow (confirm → motivation letter → documents, PDF only, 5 MB/file, 20 MB total). Approving/rejecting a shortlisted application requires admin password re-confirmation (see `services.py` in `applications`). Consulting requests follow a simpler pure-conversation model (no status machine) between client and admin, in the `consulting` app.

### Frontend structure

- `src/lib/` — `axios.ts` (API client, handles JWT refresh), `websocket.ts` (Channels client), `i18n.ts`, `queryClient.ts` (TanStack Query), `constants.ts`
- `src/store/` — Zustand stores (`store/index.ts`)
- `src/router/` — route table plus `ProtectedRoute.tsx` / `AdminRoute.tsx` guards
- `src/pages/` — route pages, split by audience (public / auth / client / admin)
- `src/components/` — shared UI
- `src/locales/` — `fr.json` / `en.json` / `ar.json`; Arabic renders RTL

Auth: JWT access tokens are kept in memory only (never localStorage); refresh tokens live in httpOnly cookies. Logging out in one tab logs out all tabs (cross-tab session sync).

### Security-relevant conventions to preserve

- Passwords: Django standard validators (8+ chars, not common, not similar to user data)
- Login rate-limited 5/minute, signup 5/hour; account lockout after 5 failed logins (30 min)
- Image uploads validated by magic bytes with decompression-bomb protection before pixel decoding
- Admin password confirmation required for: approving/rejecting shortlisted applications, deleting users
- Audit logs (`apps/audit/`) are immutable — no code path should allow deleting/mutating them; they store before/after field diffs
- Application HTML content (e.g. motivation letters, messages) is sanitized via `bleach` before persisting — see the `_sanitize` pattern in `applications/services.py` and mirror it for any new rich-text input
- GDPR unsubscribe uses signed, login-free tokens

### Email

Verification links expire in 24h. If expired, the user can re-register with the same email (previous unverified accounts aren't blocked) and gets a new link immediately. All transactional email templates live in `backend/templates/emails/` and support i18n. In development (`EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend`), verification URLs are printed straight to the `runserver` terminal rather than actually emailed.
