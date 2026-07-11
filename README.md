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
- [Troubleshooting](#troubleshooting)

## Architecture

| Layer | Stack |
|---|---|
| Backend | Django 5, Django REST Framework, MySQL 8.0, Redis 7, Celery + Celery Beat, Django Channels (WebSockets) |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Zustand, react-i18next |
| Background jobs | Celery workers — general queue + dedicated scraping queue |

This is a local-only setup: backend, frontend, database, and Redis all run as native processes on your machine — no Docker, no reverse proxy.

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

- Python 3.11+
- Node.js 20+
- MySQL 8.0+ (running locally, e.g. via WAMP/XAMPP or a standalone install)
- Redis-compatible server on Windows — [Memurai](https://www.memurai.com/) (installs as a native Windows service) or Redis inside WSL2
- Google Chrome + a matching [ChromeDriver](https://googlechromelabs.github.io/chrome-for-testing/) (only needed to run the OECD scraper)

## Quick Start (Development)

```bash
git clone <repo-url>
cd Richat_Funding_Tracker
cp .env.example .env   # edit values as needed
```

Create the MySQL database and user (adjust to your local MySQL client):

```sql
CREATE DATABASE richat_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'richat_user'@'localhost' IDENTIFIED BY 'your-database-password';
GRANT ALL PRIVILEGES ON richat_db.* TO 'richat_user'@'localhost';
```

Make sure Memurai (or your Redis server) is running, then set up and start the backend:

```bash
cd backend
python -m venv venv
venv\Scripts\activate            # PowerShell: venv\Scripts\Activate.ps1
pip install -r requirements/development.txt

python manage.py migrate
python manage.py create_demo_accounts
python manage.py runserver
```

`runserver` serves both HTTP and WebSockets (Django Channels patches it automatically in DEBUG mode) — no separate ASGI server needed locally.

In separate terminals, start the Celery worker and beat scheduler (only needed if you're testing background jobs, notifications, or scraping):

```bash
cd backend
venv\Scripts\activate
celery -A config worker -l info --pool=solo -Q celery,default,scraping
celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

`--pool=solo` is required on Windows — the default `prefork` pool relies on `billiard` multiprocessing primitives that routinely fail with `PermissionError: [WinError 5]` on Windows. `solo` runs tasks sequentially in a single process (no `--concurrency` flag needed). On Linux/macOS you can drop `--pool=solo` and use `--concurrency=N` instead.

In another terminal, start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Services:

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000/api/v1/ |
| API docs | http://localhost:8000/api/v1/docs/ |
| Django admin | http://localhost:8000/admin/ |

**Development demo accounts** (created by `create_demo_accounts`, development only):

| Role | Email | Password |
|---|---|---| Admin | admin@richat.mr | Admin1234! |
| Client | client@richat.mr | Client1234! |
|

## Environment Variables

Copy `.env.example` to `.env` and fill in the values. Key groups:

- **Django**: `SECRET_KEY` (keep secret), `DEBUG`, `ALLOWED_HOSTS`, `FRONTEND_URL`
- **Database**: `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_HOST`, `MYSQL_PORT`
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
└── .github/workflows/        # CI pipeline
```

## Common Tasks

```bash
# Run backend tests
cd backend && pytest -v

# Run frontend tests
cd frontend && npm run test

# Django shell
cd backend && python manage.py shell

# Apply new migrations
cd backend && python manage.py makemigrations
cd backend && python manage.py migrate

# Trigger a scraper manually
cd backend && python -c \
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

Trigger from the admin Scraping page or via the API. The OECD scraper uses Selenium and needs `CHROME_BINARY_PATH`/`CHROMEDRIVER_PATH` in `.env` pointing at your local Chrome + ChromeDriver install.

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
cd backend && pytest -v --tb=short

# Frontend
cd frontend && npm run test

# TypeScript check
cd frontend && npx tsc --noEmit
```

CI runs on every push/PR to main/develop: lint (flake8), typecheck (tsc), backend tests (pytest against a MySQL + Redis service container), frontend tests (vitest).

## Troubleshooting

**Email not arriving in development**: With `EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend` (the local default), the verification URL is printed straight to the terminal running `runserver`. Check there first.

**WebSocket not connecting**: Confirm you're running `python manage.py runserver` (not `gunicorn`/WSGI-only) — Channels patches `runserver` to serve ASGI automatically in `DEBUG` mode.

**Scraping job stuck at "running"**: Check the terminal running `celery -A config worker`. The OECD scraper requires Chrome + ChromeDriver — confirm `CHROME_BINARY_PATH` and `CHROMEDRIVER_PATH` in `.env` point to valid local paths.

**Audit logs not pruning**: Confirm `celery beat` is running in its own terminal. The retention task runs monthly on a schedule.

**MySQL connection refused**: Confirm your local MySQL service is running and `MYSQL_HOST`/`MYSQL_PORT` in `.env` match it (default `localhost:3306`).

© 2026 Richat Partners — Nouakchott, Mauritania
