"""Celery tasks for scraping with real-time progress."""

from asgiref.sync import async_to_sync
from celery import shared_task
from channels.layers import get_channel_layer
from django.utils import timezone

from . import services
from .models import ScrapingJob


@shared_task(bind=True)
def run_scraping_job(self, source: str, max_pages: int = 5, user_id: int = None):
    job = ScrapingJob.objects.create(
        source=source,
        status="running",
        started_at=timezone.now(),
        triggered_by_id=user_id,
    )
    channel_layer = get_channel_layer()

    def progress_callback(current_page, total_pages, found):
        job.pages_scraped = current_page
        job.projects_found = found
        job.save(update_fields=["pages_scraped", "projects_found"])
        try:
            async_to_sync(channel_layer.group_send)(
                "scraping_progress",
                {
                    "type": "scraping_update",
                    "data": {
                        "job_id": job.id,
                        "source": source,
                        "pages_scraped": current_page,
                        "total_pages": total_pages,
                        "projects_found": found,
                        "status": "running",
                    },
                },
            )
        except Exception:
            pass

    try:
        projects = services.run_scraper(source=source, max_pages=max_pages, progress_callback=progress_callback)
        result = services.save_projects(projects=projects, job=job)

        job.status = "completed"
        job.projects_found = result["created"]
        job.finished_at = timezone.now()
        job.save()

        # Notify admin
        if user_id:
            from apps.authentication.models import User
            from apps.notifications.services import create_notification

            user = User.objects.get(id=user_id)
            create_notification(
                user=user,
                message=f"Scraping {source} completed: {result['created']} new, {result['duplicates']} duplicates.",
                notification_type="scraping_complete",
                category="scraping",
            )

        return {"job_id": job.id, **result}

    except Exception as e:
        job.status = "failed"
        job.error_log = str(e)
        job.finished_at = timezone.now()
        job.save()
        raise
