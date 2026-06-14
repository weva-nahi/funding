# This makes the Celery app available as soon as Django loads,
# ensuring @shared_task decorators across all apps register correctly.
from .celery import app as celery_app

__all__ = ("celery_app",)