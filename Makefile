.PHONY: help up down build restart logs shell-be shell-fe migrate makemigrations \
       createsuperuser test-be test-fe test lint scrape collect seed

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ---------- Docker ----------
up: ## Start all services
	docker compose up -d

up-build: ## Build and start all services
	docker compose up -d --build

down: ## Stop all services
	docker compose down

down-v: ## Stop all services and remove volumes
	docker compose down -v

build: ## Build all images
	docker compose build

restart: ## Restart all services
	docker compose restart

logs: ## Tail logs for all services
	docker compose logs -f

logs-be: ## Tail backend logs
	docker compose logs -f backend

logs-fe: ## Tail frontend logs
	docker compose logs -f frontend

logs-celery: ## Tail celery worker logs
	docker compose logs -f celery_worker

# ---------- Django ----------
shell-be: ## Open Django shell
	docker compose exec backend python manage.py shell

migrate: ## Run database migrations
	docker compose exec backend python manage.py migrate

makemigrations: ## Create new migrations
	docker compose exec backend python manage.py makemigrations

createsuperuser: ## Create admin superuser
	docker compose exec backend python manage.py createsuperuser

collect: ## Collect static files
	docker compose exec backend python manage.py collectstatic --noinput

seed: ## Seed database with sample data
	docker compose exec backend python manage.py seed_data

# ---------- Frontend ----------
shell-fe: ## Open frontend shell
	docker compose exec frontend sh

# ---------- Testing ----------
test-be: ## Run backend tests
	docker compose exec backend pytest --cov=apps --cov-report=term-missing -v

test-fe: ## Run frontend tests
	docker compose exec frontend npm run test

test: test-be test-fe ## Run all tests

# ---------- Linting ----------
lint-be: ## Lint backend
	docker compose exec backend flake8 .

lint-fe: ## Lint frontend
	docker compose exec frontend npm run lint

lint: lint-be lint-fe ## Lint all

# ---------- Scraping ----------
scrape: ## Run scraping for a source (usage: make scrape SOURCE=gef PAGES=5)
	docker compose exec backend python manage.py run_scraper --source=$(SOURCE) --pages=$(or $(PAGES),5)

# ---------- Database ----------
db-shell: ## Open PostgreSQL shell
	docker compose exec db psql -U richat_user -d richat_db

db-backup: ## Backup database
	docker compose exec db pg_dump -U richat_user richat_db > backup_$$(date +%Y%m%d_%H%M%S).sql
