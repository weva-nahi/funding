.PHONY: help up up-build down migrate makemigrations shell-be shell-db \
        test test-be test-fe logs logs-be demo collectstatic createsuperuser \
        scrape lint restart ps

help:
	@echo "Richat Funding Tracker — developer commands"
	@echo ""
	@echo "  make up-build        Build images and start all services (detached)"
	@echo "  make up              Start all services (detached)"
	@echo "  make down            Stop and remove all containers"
	@echo "  make restart         Restart all services"
	@echo "  make ps              Show running containers"
	@echo "  make migrate         Apply Django migrations"
	@echo "  make makemigrations  Create new Django migrations"
	@echo "  make collectstatic   Collect static files"
	@echo "  make createsuperuser Create a Django superuser"
	@echo "  make demo            (Re)create the two demo accounts"
	@echo "  make shell-be        Open a Django shell"
	@echo "  make shell-db        Open a psql shell"
	@echo "  make test            Run backend + frontend tests"
	@echo "  make test-be         Run backend tests (pytest)"
	@echo "  make test-fe         Run frontend tests (vitest)"
	@echo "  make logs            Tail all logs"
	@echo "  make logs-be         Tail backend logs"
	@echo "  make lint            Run flake8 on the backend"

up-build:
	docker compose up --build -d

up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart

ps:
	docker compose ps

migrate:
	docker compose exec backend python manage.py migrate

makemigrations:
	docker compose exec backend python manage.py makemigrations

collectstatic:
	docker compose exec backend python manage.py collectstatic --noinput

createsuperuser:
	docker compose exec backend python manage.py createsuperuser

demo:
	docker compose exec backend python manage.py create_demo_accounts

shell-be:
	docker compose exec backend python manage.py shell

shell-db:
	docker compose exec db psql -U richat_user -d richat_db

test: test-be test-fe

test-be:
	docker compose exec backend pytest

test-fe:
	docker compose exec frontend npm run test

logs:
	docker compose logs -f

logs-be:
	docker compose logs -f backend

lint:
	docker compose exec backend flake8 .

scrape:
	docker compose exec backend python manage.py shell -c "from apps.scraping.tasks import run_scraping_job; run_scraping_job.delay('world_bank', 5)"