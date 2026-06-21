# Richat Funding Tracker

A full-stack B2B platform that helps Mauritanian businesses discover, apply for, and track international climate financing opportunities (GEF, GCF, World Bank, AFD, EU, OECD), with an admin backend for managing the opportunity pipeline, reviewing applications, and running automated scrapers.

## Table of Contents

- [Architecture](#architecture)
- [Key Features](#key-features)
- [Prerequisites](#prerequisites)
- [Quick Start (Development)](#quick-start-development)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Common Tasks](#common-tasks)
- [Application Workflow](#application-workflow)
- [Scraping](#scraping)
- [Email & Internationalization](#email--internationalization)
- [Security Notes](#security-notes)
- [Testing](#testing)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

## Architecture

| Layer | Stack |
|---|---|
| Backend | Django 5, Django REST Framework, PostgreSQL 16, Redis 7, Celery + Celery Beat, Django Channels (WebSockets, via Daphne) |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Zustand, react-i18next |
| Background jobs | Celery workers — one general-purpose queue, one dedicated scraping queue (isolated Chromium dependency) |
| Reverse proxy | Nginx (dev: routes to Vite dev server + Django; prod: serves built static assets + proxies API/WS) |
| Orchestration | Docker Compose (separate `docker-compose.yml` for dev, `docker-compose.prod.yml` for production) |

### Why two backend Docker images?

`backend/Dockerfile` is a slim (~200MB) image used by the `backend`, `celery_worker`, and `celery_beat` services. `backend/Dockerfile.scraping` additionally installs Chromium + chromedriver (~800MB extra) and is used **only** by `celery_scraping_worker`, since the OECD scraper is the only component that needs a real browser (via Selenium). This split keeps the three non-scraping services lean.

### Redis usage

A single Redis instance is logically partitioned by DB index for four purposes:

| DB index | Purpose | Env var |
|---|---|---|
| 1 | Celery broker | `CELERY_BROKER_URL` |
| 2 | Celery result backend | `CELERY_RESULT_BACKEND` |
| 3 | Django Channels layer (WebSockets) | `CHANNEL_LAYERS_BACKEND` |
| 4 | Django cache / short-lived auth tokens | `REDIS_CACHE_URL` |

This is an intentional, scale-appropriate design, not an oversight. If Redis ever becomes a bottleneck or single point of failure in production, each of the four URLs can point at a separate Redis instance with **zero code changes** — just update the corresponding environment variable.

## Key Features

- **Opportunity discovery**: browse, filter (city, sector, source, funding type, amount range), and save opportunities for later.
- **Mauritania-only scraping**: all seven source scrapers (GEF, GCF, World Bank, AFD, EU, OECD, Climate Funds Update) filter exclusively for Mauritania-targeted projects, extract the specific Mauritanian city/locality when identifiable, and only keep results with both a financed amount and a non-expired deadline. Scrapers run to exhaustion (no artificial page cap) and can be triggered individually or all-at-once from the admin panel.
- **Multi-stage application review**: `draft → pending → in_review → shortlisted → approved/rejected`. The shortlist stage lets admins collect all candidates for an opportunity before making final decisions, supporting bulk shortlisting.
- **Transparency lock**: once an opportunity is published, its `amount` and `deadline` fields are immutable (enforced server-side) — applicants must be able to trust the terms they applied under.
- **Multilingual**: UI in French/English/Arabic (with RTL support for Arabic) via `react-i18next`; transactional emails render in each recipient's individually-set preferred language.
- **GDPR-compliant unsubscribe**: every transactional email includes a one-click, login-free unsubscribe link backed by a non-expiring signed token.
- **Real-time updates**: WebSocket-pushed notifications and live scraping job progress via Django Channels.
- **Cross-tab session sync**: logging out in one browser tab immediately logs out every other open tab via `BroadcastChannel`.
- **Draft resume**: in-progress motivation letters are persisted to `localStorage` and restored if the user navigates away mid-application.
- **Full audit trail**: every write operation is logged immutably (audit log rows cannot be deleted or modified by application code — only a scheduled retention task may prune records older than 6 months). Each log entry is clickable in the admin UI and shows a field-level before/after diff.
- **Admin confirmation dialogs**: destructive or high-consequence admin actions (deleting a user, publishing an opportunity, archiving, cancelling a scrape job) require explicit confirmation; the most destructive ones (user deletion) require typing a confirmation phrase.

## Prerequisites

- Docker and Docker Compose (v2)
- For local non-Docker frontend development: Node.js 20+
- For local non-Docker backend development: Python 3.11+, PostgreSQL 16, Redis 7

## Quick Start (Development)

```bash
# 1. Clone and configure environment
git clone <repo-url>
cd Richat_Funding_Tracker
cp .env.example .env   # edit values as needed — sane defaults are provided for local dev

# 2. Build and start all services
docker compose up --build

# 3. The backend automatically runs migrations and seeds demo accounts on
#    first startup (see backend command in docker-compose.yml). No manual
#    migrate step is required for a fresh environment.
```

Once running:

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000/api/v1/ |
| API docs (Swagger) | http://localhost:8000/api/v1/docs/ |
| Django admin | http://localhost:8000/admin/ |

**Demo accounts** (created automatically in development):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@richat.mr` | `Admin1234!` |
| Client | `client@richat.mr` | `Client1234!` |

## Environment Variables

All variables live in `.env` at the project root (one file, read by both `docker-compose.yml` and the Django settings modules). Key groups:

- **Django core**: `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `FRONTEND_URL`
- **Database**: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`
- **Redis** (see [Redis usage](#redis-usage) above): `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`, `CHANNEL_LAYERS_BACKEND`, `REDIS_CACHE_URL`
- **JWT**: `ACCESS_TOKEN_LIFETIME_MINUTES`, `REFRESH_TOKEN_LIFETIME_DAYS`
- **Email**: `EMAIL_BACKEND`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL`
- **File uploads**: `MAX_FILE_SIZE_MB`, `MAX_IMAGE_PIXELS`, `MAX_IMAGE_DIMENSION_PX` (the latter two guard against decompression-bomb image uploads)
- **Scraping**: `SCRAPING_DELAY_SECONDS`, `CHROME_BINARY_PATH`, `CHROMEDRIVER_PATH`
- **Retention**: `AUTH_TOKEN_RETENTION_DAYS` (expired verification/reset tokens), `AUDIT_LOG_RETENTION_MONTHS`

A `.env.example` with documented defaults is provided — copy it to `.env` and adjust for your environment. **Never commit a populated `.env` file** — it contains secrets.

## Project Structure

```
Richat_Funding_Tracker/
├── backend/
│   ├── apps/
│   │   ├── authentication/   # User, Profile, JWT auth, email verification, password reset
│   │   ├── organizations/    # Company/organization records linked to client users
│   │   ├── opportunities/    # FundingOpportunity, SavedOpportunity
│   │   ├── applications/     # Application, status history, shortlist workflow
│   │   ├── documents/        # Application file attachments (signed-URL downloads)
│   │   ├── notifications/    # In-app + email notifications, daily digest
│   │   ├── scraping/         # Per-source scrapers, ScrapingJob/ScrapingAlert
│   │   ├── consulting/       # Client consulting requests + admin responses
│   │   ├── analytics/        # Admin dashboard aggregate stats
│   │   └── audit/            # Immutable audit log + middleware
│   ├── common/                # Shared mixins, permissions, validators, utils (i18n, hashing, dates, Mauritania filtering)
│   ├── config/                 # Django settings (base/development/production/test), URLs, Celery, ASGI/WSGI
│   ├── templates/emails/      # Shared base.html + per-email-type templates (i18n string injection)
│   ├── tests/                 # pytest suite — services, endpoints, permissions
│   ├── Dockerfile             # Slim image (backend, celery_worker, celery_beat)
│   ├── Dockerfile.scraping    # Chromium-included image (celery_scraping_worker only)
│   └── Dockerfile.prod        # Production backend image
├── frontend/
│   ├── src/
│   │   ├── components/        # Shared UI: layouts, ConfirmDialog, CharCounter, LanguageSwitcher, ErrorBoundary
│   │   ├── pages/              # Route-level pages, split into public/auth/client/admin
│   │   ├── lib/                 # axios client (token refresh), websocket manager, i18n config, constants
│   │   ├── store/               # Zustand stores (auth, notifications)
│   │   ├── router/              # Route definitions + protected/admin route guards
│   │   ├── locales/             # fr.json / en.json / ar.json UI translation files
│   │   └── tests/                # Vitest + Testing Library suite
│   ├── Dockerfile              # Dev image (Vite dev server)
│   └── Dockerfile.prod         # Production image (multi-stage: Vite build → Nginx serve)
├── nginx/                      # Dev and prod Nginx configs
├── .github/workflows/          # CI (test/lint) and deploy pipelines
├── docker-compose.yml          # Development orchestration
└── docker-compose.prod.yml     # Production orchestration
```

## Common Tasks

```bash
# View logs for a specific service
docker compose logs -f backend
docker compose logs -f celery_scraping_worker

# Run backend tests
docker compose exec backend pytest -v

# Run frontend tests
docker compose exec frontend npm run test

# Open a Django shell
docker compose exec backend python manage.py shell

# Create a Django superuser manually (in addition to the auto-seeded demo admin)
docker compose exec backend python manage.py createsuperuser

# Apply a new migration after model changes
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate

# Trigger a single scraper manually
docker compose exec backend python manage.py shell -c \
  "from apps.scraping.tasks import run_scraping_job; run_scraping_job.delay(source='gef')"
```

## Application Workflow

```
draft → pending → in_review → shortlisted → approved
                       ↓             ↓           ↓
                    rejected     rejected    (final)
```

- **draft**: client is still editing; not visible to admins.
- **pending**: submitted, awaiting initial admin attention.
- **in_review**: an admin has started actively reviewing it.
- **shortlisted**: optional intermediate stage — admin has identified this as a finalist candidate. Supports bulk shortlisting from the pending pool so admins can collect all applicants for an opportunity before deciding. Shortlisted applications can still be approved or rejected.
- **approved / rejected**: terminal states. Rejection requires a reason of at least 20 characters (configurable via `REJECTION_REASON_MIN_LENGTH`).
- **withdrawn**: the client withdrew their own application; they may re-apply later (a partial unique DB constraint allows a new application to coexist with a withdrawn one for the same user+opportunity pair).

## Scraping

Each source scraper lives in `backend/apps/scraping/scrapers/` and inherits from `BaseScraper`. All scrapers:

- Filter exclusively for Mauritania (via the source's own country facet/API parameter where available, with a defensive text-match re-check via `common.utils.mauritania.is_mauritania_project()` in every case).
- Extract the specific Mauritanian city/locality when identifiable (`common.utils.mauritania.extract_mauritania_city()`).
- Only keep results that have both a financed amount and a deadline that hasn't passed (or no stated deadline at all, since rolling-basis grants are legitimate).
- Run until the source itself is exhausted — there is no product-level page cap. A generous safety-net cap (`BaseScraper.safety_max_pages`, currently 500) exists only to prevent an infinite loop if a source's pagination ever misbehaves; it is not meant to be hit in normal operation.

Admins can trigger an individual source or all seven sources at once (`POST /api/v1/scraping/start-all/`) from the Scraping Orchestrator page.

## Email & Internationalization

- **UI language**: chosen via the in-app language switcher (FR/EN/AR), persisted in `localStorage`, applied via `react-i18next`. Arabic renders the entire layout right-to-left.
- **Email language**: independent from the UI language — set per-account in Profile Settings (`preferred_language` on the `Profile` model). Every transactional email (verification, password reset, application approved/rejected, consulting response, daily digest) renders in the recipient's chosen language with the correct text direction.
- **Unsubscribe**: every email footer includes an unsubscribe link using a non-expiring signed token (`common.utils.email_i18n`). Unsubscribing flips `notify_email_enabled` to `False` and does not require the recipient to log in.

## Security Notes

- Passwords are validated against Django's standard validators (minimum length, common-password check, similarity-to-user-attributes check, not-entirely-numeric).
- Login and signup are both rate-limited (`login`: 5/minute, `signup`: 5/hour by default — see `DEFAULT_THROTTLE_RATES` in `config/settings/base.py`).
- Failed login attempts trigger a temporary account lockout after `ACCOUNT_LOCKOUT_ATTEMPTS` (default 5) within the lockout window.
- Image uploads (avatars, application documents) are validated by magic bytes (not file extension) and checked against `MAX_IMAGE_PIXELS`/`MAX_IMAGE_DIMENSION_PX` **before** any pixel decoding occurs, to reject decompression-bomb-style uploads.
- Expired email-verification and password-reset tokens are purged daily by a Celery task (`apps.authentication.tasks.cleanup_expired_tokens`).
- Audit log records cannot be deleted or modified through any application code path — the model's `delete()`/`save()` methods raise `PermissionError` on mutation attempts. The only exception is a scheduled monthly retention task that prunes records older than `AUDIT_LOG_RETENTION_MONTHS` (default 6) via a direct SQL statement, deliberately bypassing the ORM-level guard as a documented, narrow exception.
- JWT access tokens live in memory only (never `localStorage`); refresh tokens are stored in an `httponly`, `secure` (in production), `SameSite=Strict` cookie scoped to the refresh endpoint path only.

## Testing

```bash
# Backend (from backend/ or via docker compose exec backend)
pytest -v --tb=short

# Frontend (from frontend/ or via docker compose exec frontend)
npm run test
```

CI (`.github/workflows/ci.yml`) runs both suites plus a flake8 lint pass and a TypeScript typecheck on every push/PR to `main`/`develop`.

## Production Deployment

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

Deployment is automated via `.github/workflows/deploy.yml` on push to `main` — it SSHes into the production host, pulls the latest code, rebuilds, and restarts the stack. Migrations and static-file collection run automatically as part of the backend container's startup command.

Production-specific settings (`config/settings/production.py`) enable: HTTPS redirect, HSTS, secure cookies, S3/R2-compatible object storage for media files (via `django-storages`), and Sentry error tracking (if `SENTRY_DSN` is set).

## Troubleshooting

**"Email not verified" on login in development**: the verification link is printed to the backend container logs (`docker compose logs backend`) rather than requiring a real mailbox, since the dev `.env` typically uses a real SMTP relay only if you've configured one. Use the in-app "Resend verification email" link if needed.

**WebSocket not connecting**: confirm the Vite proxy (`frontend/vite.config.ts`) is forwarding `/ws/` to the backend, and that `daphne` (not the WSGI dev server) is what's actually serving the backend container — check `docker compose logs backend` for `Starting server at...` from Daphne, not Django's runserver.

**Scraping job stuck at "running"**: check `docker compose logs celery_scraping_worker` — most commonly this is a Selenium/Chromium startup failure inside that specific container. Confirm `CHROME_BINARY_PATH` and `CHROMEDRIVER_PATH` match what's actually installed in `Dockerfile.scraping`.

**Audit logs not being pruned**: confirm `celery_beat` is running (`docker compose logs celery_beat`) — the retention task only fires on the schedule defined in `CELERY_BEAT_SCHEDULE`; it does not run automatically without a live Beat scheduler process.