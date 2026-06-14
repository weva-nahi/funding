.PHONY: help up up-build down restart logs logs-be logs-worker logs-beat ps \
        migrate makemigrations collect createsuperuser demo shell-be shell-fe \
        db-shell redis-cli test test-be test-fe lint format scrape \
        deadline-reminders health clean

# ─── Colors ──────────────────────────────────────────────────────────────────
CYAN  := \033[36m
RESET := \033[0m

help: ## Show this help message
	@echo ""
	@echo "  $(CYAN)Richat Funding Tracker — Dev Commands$(RESET)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-22s$(RESET) %s\n", $$1, $$2}'
	@echo ""

# ─── Docker Compose ───────────────────────────────────────────────────────────
up: ## Start all services (detached)
	docker compose up -d

up-build: ## Build images then start all services
	docker compose up -d --build

down: ## Stop all services
	docker compose down

restart: ## Restart all services
	docker compose restart

restart-be: ## Restart backend + celery only
	docker compose restart backend celery_worker celery_beat

logs: ## Follow all service logs
	docker compose logs -f

logs-be: ## Follow backend logs only
	docker compose logs -f backend

logs-worker: ## Follow celery worker logs
	docker compose logs -f celery_worker

logs-beat: ## Follow celery beat logs
	docker compose logs -f celery_beat

ps: ## Show service status
	docker compose ps

# ─── Django Management ────────────────────────────────────────────────────────
migrate: ## Run database migrations
	docker compose exec backend python manage.py migrate --noinput

makemigrations: ## Create new migrations
	docker compose exec backend python manage.py makemigrations

collect: ## Collect static files
	docker compose exec backend python manage.py collectstatic --noinput

createsuperuser: ## Create a Django superuser interactively
	docker compose exec backend python manage.py createsuperuser

demo: ## Create demo admin + client accounts (idempotent)
	docker compose exec backend python manage.py create_demo_accounts

shell-be: ## Open Django interactive shell
	docker compose exec backend python manage.py shell

shell-fe: ## Open frontend container shell
	docker compose exec frontend sh

db-shell: ## Open PostgreSQL psql shell
	docker compose exec db psql \
		-U $${POSTGRES_USER:-richat_user} \
		-d $${POSTGRES_DB:-richat_db}

redis-cli: ## Open Redis CLI
	docker compose exec redis redis-cli

# ─── Testing ──────────────────────────────────────────────────────────────────
test: test-be test-fe ## Run all tests (backend + frontend)

test-be: ## Run backend pytest tests
	docker compose exec backend python -m pytest tests/ -v --tb=short

test-fe: ## Run frontend vitest tests
	docker compose exec frontend npm run test

lint: ## Lint backend with flake8
	docker compose exec backend \
		flake8 . --max-line-length=120 --exclude=migrations,venv,.venv

format: ## Format backend with black
	docker compose exec backend \
		black . --line-length=120 --exclude=migrations

# ─── Celery Tasks ─────────────────────────────────────────────────────────────
scrape: ## Queue a GEF scraping job (2 pages for speed)
	docker compose exec backend python manage.py shell -c "\
from apps.scraping.tasks import run_scraping_job; \
run_scraping_job.delay('gef', max_pages=2); \
print('Scraping job queued.')"

deadline-reminders: ## Manually trigger deadline reminder task
	docker compose exec backend python manage.py shell -c "\
from apps.notifications.tasks import send_deadline_reminders; \
result = send_deadline_reminders(); \
print('Reminders sent:', result)"

# ─── Maintenance ──────────────────────────────────────────────────────────────
health: ## Check API and frontend health endpoints
	@curl -sf http://localhost:8000/api/v1/health/ \
		&& echo "  Backend : OK" \
		|| echo "  Backend : FAIL"
	@curl -sf http://localhost:5173/ > /dev/null \
		&& echo "  Frontend: OK" \
		|| echo "  Frontend: FAIL"

clean: ## Remove stopped containers, dangling images, unused volumes
	docker compose down --remove-orphans
	docker image prune -f
	docker volume prune -f