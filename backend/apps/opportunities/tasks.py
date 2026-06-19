"""Celery tasks for opportunities."""

from celery import shared_task


@shared_task
def archive_expired_opportunities():
    """Archive every published opportunity whose deadline is in the past."""
    from django.utils import timezone

    from .models import FundingOpportunity
    from .services import archive_opportunity

    expired = FundingOpportunity.objects.filter(
        status="published",
        deadline__lt=timezone.now().date(),
    )
    count = 0
    for opp in expired:
        archive_opportunity(opportunity=opp)
        count += 1
    return {"archived": count}