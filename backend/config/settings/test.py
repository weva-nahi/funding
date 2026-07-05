"""Test settings — fast, isolated, deterministic."""

from .base import *  # noqa: F401,F403

DEBUG = False
SECRET_KEY = "test-secret-key-absolutely-not-for-production-use"

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    },
}

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "test-cache",
    }
}

REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = []  # noqa: F405
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {}  # noqa: F405

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

DEFAULT_FILE_STORAGE = "django.core.files.storage.FileSystemStorage"
MEDIA_ROOT = BASE_DIR / "test_media"  # noqa: F405

# NE PAS redéfinir la connexion ici. Hériter de base.py qui lit
# MYSQL_HOST depuis l'environnement (= "db" dans Docker, PAS "localhost").
# C'était la seule cause des 30 erreurs "Connection refused".
DATABASES["default"]["TEST"] = {"NAME": "richat_test_db"}  # noqa: F405

import logging  # noqa: E402
logging.disable(logging.CRITICAL)
