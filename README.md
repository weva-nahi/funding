# Richat Funding Tracker

A full-stack B2B platform helping Mauritanian businesses discover, apply for, and track international climate financing opportunities (GEF, GCF, World Bank, AFD, EU, OECD), built by Richat Partners.

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
- [Email](#email)
- [Security](#security)
- [Testing](#testing)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

## Architecture

| Layer | Stack |
|---|---|
| Backend | Django 5, Django REST Framework, PostgreSQL 16, Redis 7, Celery + Celery Beat, Django Channels (WebSockets via Daphne) |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Zustand, react-i18next |
| Background jobs | Celery workers — general queue + dedicated scraping queue |
| Reverse proxy | Nginx (dev: Vite dev server + Django; prod: built static assets + API proxy) |
| Orchestration | Docker Compose (`docker-compose.yml` for dev, `docker-compose.prod.yml` for prod) |

### Redis partitioning

| DB index | Purpose |
|---|---|
| 1 | Celery broker |
| 2 | Celery result backend |
| 3 | Django Channels (WebSockets) |
| 4 | Django cache / auth tokens |

Each partition can be moved to a separate Redis instance by updating the corresponding environment variable — no code changes required.

## Key Features

- **Automated opportunity discovery** from 7 international funding sources, filtered to Mauritania only, with amount and deadline required
- **Islamic finance compliance** — only grants, concessional financing, and blended finance are shown (no interest-based loans)
- **3-step application flow** — confirm → motivation letter → documents (PDF only, 5 MB/file, 20 MB total)
- **Conversation threads** — clients and the review team can exchange messages and documents directly on each application and consulting request
- **Multi-stage review** — pending → shortlisted → approved/rejected; final decisions require admin password confirmation
- **Expert consulting** — pure conversation model between client and admin
- **Multilingual UI** — French/English/Arabic with RTL support for Arabic
- **Real-time notifications** via WebSockets; notification bell in header for both clients and admins
- **Cross-tab session sync** — logout in one tab logs out all tabs
- **Full audit trail** — immutable, clickable logs with before/after field diffs
- **GDPR-compliant unsubscribe** — one-click, login-free via signed tokens
- **Draft letter persistence** — motivation letters are saved to localStorage and restored on return

## Prerequisites

- Docker and Docker Compose v2
- Node.js 20+ (for local frontend dev outside Docker)
- Python 3.11+ (for local backend dev outside Docker)

## Quick Start (Development)

```bash
git clone <repo-url>
cd Richat_Funding_Tracker
cp .env.example .env   # edit values as needed

docker compose up --build
```

Services:

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000/api/v1/ |
| API docs | http://localhost:8000/api/v1/docs/ |
| Django admin | http://localhost:8000/admin/ |

**Development demo accounts** (created automatically, development only):

| Role | Email | Password |
|---|---|---|
| Admin | admin@richat.mr | Admin1234! |
| Client | client@richat.mr | Client1234! |

These accounts do not exist in production.

## Environment Variables

Copy `.env.example` to `.env` and fill in the values. Key groups:

- **Django**: `SECRET_KEY` (keep secret), `DEBUG` (False in production), `ALLOWED_HOSTS`, `FRONTEND_URL`
- **Database**: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`
- **Redis**: `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`, `CHANNEL_LAYERS_BACKEND`, `REDIS_CACHE_URL`
- **JWT**: `ACCESS_TOKEN_LIFETIME_MINUTES`, `REFRESH_TOKEN_LIFETIME_DAYS`
- **Email**: `EMAIL_HOST`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL`
- **Files**: `MAX_FILE_SIZE_MB`, `MAX_IMAGE_PIXELS`, `MAX_IMAGE_DIMENSION_PX`
- **Scraping**: `SCRAPING_DELAY_SECONDS`, `CHROME_BINARY_PATH`, `CHROMEDRIVER_PATH`

Never commit a populated `.env` file.

## Project Structure
```
Richat_Funding_Tracker/
├── backend/
│   ├── apps/
│   │   ├── authentication/   # Users, JWT, email verification, password reset
│   │   ├── organizations/    # Company records
│   │   ├── opportunities/    # Funding opportunities (Islamic finance filtered)
│   │   ├── applications/     # Applications + conversation threads
│   │   ├── documents/        # File attachments with signed-URL downloads
│   │   ├── notifications/    # In-app + email notifications
│   │   ├── scraping/         # Per-source scrapers + job management
│   │   ├── consulting/       # Consulting conversation model
│   │   ├── analytics/        # Admin dashboard stats
│   │   └── audit/            # Immutable audit trail
│   ├── common/               # Shared utilities, validators, Mauritania filtering
│   ├── config/               # Django settings, URLs, Celery, ASGI
│   └── templates/emails/     # Multilingual email templates
├── frontend/
│   ├── src/
│   │   ├── components/       # Shared UI components
│   │   ├── pages/            # Route pages (public / auth / client / admin)
│   │   ├── lib/              # Axios client, WebSocket manager, i18n, constants
│   │   ├── store/            # Zustand stores
│   │   ├── router/           # Routes + guards
│   │   └── locales/          # fr.json / en.json / ar.json
├── nginx/                    # Dev and prod Nginx configs
├── .github/workflows/        # CI and CD pipelines
├── docker-compose.yml        # Development
└── docker-compose.prod.yml   # Production
```

## Common Tasks

```bash
# View logs
docker compose logs -f backend
docker compose logs -f celery_scraping_worker

# Run backend tests
docker compose exec backend pytest -v

# Run frontend tests
docker compose exec frontend npm run test

# Django shell
docker compose exec backend python manage.py shell

# Apply new migrations
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate

# Trigger a scraper manually
docker compose exec backend python -c \
  "from apps.scraping.tasks import run_scraping_job; run_scraping_job.delay(source='gef')"
```

## Application Workflow
```
pending → shortlisted → approved
  ↓           ↓
rejected    rejected
```

- **pending**: submitted, awaiting review
- **shortlisted**: admin identified as finalist (supports bulk shortlisting)
- **approved / rejected**: final state — requires admin password for approval or rejection

Applications can no longer be created as drafts. Clients apply directly in a 3-step flow (confirm → motivation → documents).

## Scraping

7 sources are configured: GEF, GCF, World Bank, AFD, EU, OECD, Climate Funds Update.

All scrapers:
- Filter exclusively for Mauritania
- Only keep results with both a financed amount and a non-expired deadline
- Skip duplicates silently — only new opportunities are counted and saved
- Run until the source is exhausted

Trigger from the admin Scraping page or via the API.

## Email

Verification links expire in 24 hours (industry standard). If a link expires:
- The user can return to the registration page and re-register with the same email — previous unverified accounts are not blocked
- A new link is issued immediately

All transactional emails render in English by default. The "Check your email" page (shown after registration) includes a resend button with a 60-second cooldown.

## Security

- Passwords validated with Django's standard validators (min 8 chars, not common, not similar to user data)
- Login rate-limited (5/minute), signup rate-limited (5/hour)
- Account lockout after 5 failed login attempts (30 minutes)
- Image uploads validated by magic bytes; decompression-bomb protection before pixel decoding
- JWT access tokens in memory only (never localStorage); refresh tokens in httpOnly cookies
- Admin password confirmation required for: approving/rejecting shortlisted applications, deleting users
- Audit logs are immutable — no application code path can delete them

## Testing

```bash
# Backend
docker compose exec backend pytest -v --tb=short

# Frontend
docker compose exec frontend npm run test

# TypeScript check
docker compose exec frontend npx tsc --noEmit
```

CI runs on every push/PR to main/develop: lint (flake8), typecheck (tsc), backend tests (pytest), frontend tests (vitest).

## Production Deployment

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

Automated via `.github/workflows/deploy.yml` on push to main.

Production requirements:
- `DEBUG=False`
- Strong `SECRET_KEY`
- Valid SSL certificate in `nginx/certs/`
- SMTP credentials for transactional email
- S3/R2 credentials for media storage (optional — local storage works for small deployments)

## Troubleshooting

**Email not arriving in development**: The verification URL is printed to `docker compose logs backend`. Check there first.

**WebSocket not connecting**: Confirm Daphne is running in the backend container (not Django's runserver). Check `docker compose logs backend`.

**Scraping job stuck at "running"**: Check `docker compose logs celery_scraping_worker`. The OECD scraper requires Chromium — confirm `CHROME_BINARY_PATH` and `CHROMEDRIVER_PATH` match the paths in `Dockerfile.scraping`.

**Audit logs not pruning**: Confirm `celery_beat` is running. The retention task runs monthly on a schedule.

© 2026 Richat Partners — Nouakchott, Mauritania

