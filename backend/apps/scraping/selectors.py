"""Scraping selectors."""

from .models import ScrapingAlert, ScrapingJob


def get_all_jobs(*, source=None):
    qs = ScrapingJob.objects.all()
    if source:
        qs = qs.filter(source=source)
    return qs.order_by("-created_at")


def get_job_by_id(*, job_id: int):
    return ScrapingJob.objects.get(id=job_id)


def get_alerts(*, priority=None, status=None):
    qs = ScrapingAlert.objects.select_related("opportunity", "job").all()
    if priority:
        qs = qs.filter(priority=priority)
    if status:
        qs = qs.filter(status=status)
    return qs.order_by("-created_at")
