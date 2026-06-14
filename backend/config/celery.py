"""Celery configuration for Richat Funding Tracker."""

import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

app = Celery("richat")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

from django.conf import settings  # noqa: E402

app.conf.beat_schedule = getattr(settings, "CELERY_BEAT_SCHEDULE", {})


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f"Request: {self.request!r}")