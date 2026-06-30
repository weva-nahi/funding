"""Django base settings for Richat Funding Tracker."""

import os
from datetime import timedelta
from pathlib import Path

from celery.schedules import crontab

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = os.environ.get("SECRET_KEY", "insecure-dev-key-change-in-production")
# DEBUG defaults to False — development.py explicitly sets it True
DEBUG = os.environ.get("DEBUG", "False") == "True"
ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")

DJANGO_APPS = [
    "daphne",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "channels",
    "django_celery_beat",
    "drf_spectacular",
    "storages",
]

LOCAL_APPS = [
    "apps.authentication",
    "apps.organizations",
    "apps.opportunities",
    "apps.applications",
    "apps.documents",
    "apps.notifications",
    "apps.scraping",
    "apps.consulting",
    "apps.analytics",
    "apps.audit",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.audit.middleware.AuditLogMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", "richat_db"),
        "USER": os.environ.get("POSTGRES_USER", "richat_user"),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "richat_password_change_me"),
        "HOST": os.environ.get("POSTGRES_HOST", "localhost"),
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),
        "CONN_MAX_AGE": 60,
    }
}

REDIS_CACHE_URL = os.environ.get("REDIS_CACHE_URL", "redis://redis:6379/4")
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": REDIS_CACHE_URL,
    }
}

AUTH_USER_MODEL = "authentication.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ("rest_framework_simplejwt.authentication.JWTAuthentication",),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_PAGINATION_CLASS": "common.pagination.StandardPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "30/minute",
        "user": "100/minute",
        "login": "5/minute",
        "signup": "5/hour",
        "upload": "20/hour",
    },
    "EXCEPTION_HANDLER": "common.exceptions.custom_exception_handler",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=int(os.environ.get("ACCESS_TOKEN_LIFETIME_MINUTES", 15))),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=int(os.environ.get("REFRESH_TOKEN_LIFETIME_DAYS", 7))),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

CORS_ALLOWED_ORIGINS = [FRONTEND_URL]
CORS_ALLOW_CREDENTIALS = True

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [os.environ.get("CHANNEL_LAYERS_BACKEND", "redis://redis:6379/3")],
        },
    },
}

CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", "redis://redis:6379/1")
CELERY_RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", "redis://redis:6379/2")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "UTC"
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"

CELERY_BEAT_SCHEDULE = {
    "send-deadline-reminders": {
        "task": "apps.notifications.tasks.send_deadline_reminders",
        "schedule": crontab(hour=7, minute=0),
    },
    "archive-expired-opportunities": {
        "task": "apps.opportunities.tasks.archive_expired_opportunities",
        "schedule": crontab(hour=1, minute=0),
    },
    "send-daily-digests": {
        "task": "apps.notifications.tasks.send_daily_digests",
        "schedule": crontab(hour=8, minute=0),
    },
    "cleanup-expired-auth-tokens": {
        "task": "apps.authentication.tasks.cleanup_expired_tokens",
        "schedule": crontab(hour=3, minute=0),
    },
    "cleanup-old-audit-logs": {
        "task": "apps.audit.tasks.cleanup_old_audit_logs",
        "schedule": crontab(hour=4, minute=0),
    },
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Richat Funding Tracker API",
    "DESCRIPTION": "API for managing climate funding opportunities for Mauritanian businesses",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
}

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

MAX_FILE_SIZE_MB = int(os.environ.get("MAX_FILE_SIZE_MB", 5))
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
# PDF only for application documents
ALLOWED_FILE_TYPES = os.environ.get(
    "ALLOWED_FILE_TYPES",
    "application/pdf,image/jpeg,image/png",
).split(",")

MAX_IMAGE_PIXELS = int(os.environ.get("MAX_IMAGE_PIXELS", 25_000_000))
MAX_IMAGE_DIMENSION_PX = int(os.environ.get("MAX_IMAGE_DIMENSION_PX", 8000))

SCRAPING_DELAY_SECONDS = int(os.environ.get("SCRAPING_DELAY_SECONDS", 2))
CHROME_BINARY_PATH = os.environ.get("CHROME_BINARY_PATH", "/usr/bin/chromium")
CHROMEDRIVER_PATH = os.environ.get("CHROMEDRIVER_PATH", "/usr/bin/chromedriver")

ACCOUNT_LOCKOUT_ATTEMPTS = 5
ACCOUNT_LOCKOUT_DURATION_MINUTES = 30

SIGNED_URL_EXPIRY_SECONDS = int(os.environ.get("SIGNED_URL_EXPIRY_SECONDS", 3600))

REJECTION_REASON_MIN_LENGTH = 20
PROCESSING_TIME_SAMPLE_LIMIT = 500
DEADLINE_REMINDER_DAYS = [7, 1]

AUTH_TOKEN_RETENTION_DAYS = int(os.environ.get("AUTH_TOKEN_RETENTION_DAYS", 7))
AUDIT_LOG_RETENTION_MONTHS = int(os.environ.get("AUDIT_LOG_RETENTION_MONTHS", 6))

# Islamic finance: only these funding types are shown to clients
# (grants, concessional, blended — no interest-based loans)
ISLAMIC_FINANCE_ALLOWED_TYPES = ["grant", "concessional", "blended"]