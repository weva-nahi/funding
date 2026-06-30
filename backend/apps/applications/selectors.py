"""Application selectors."""

from django.db.models import Count, Q
from django.db.models.functions import TruncMonth
from datetime import timedelta
from django.utils import timezone

from .models import Application, ApplicationStatusHistory


def get_user_applications(*, user, status_filter=None):
    qs = Application.objects.filter(user=user).select_related("opportunity")
    if status_filter:
        qs = qs.filter(status=status_filter)
    return qs.order_by("-created_at")


def get_application_by_id(*, application_id: int) -> Application:
    return Application.objects.select_related("user", "opportunity", "user__profile").get(id=application_id)


def get_all_applications(*, status_filter=None, search=None):
    qs = Application.objects.select_related("user", "opportunity", "user__profile").all()
    if status_filter:
        qs = qs.filter(status=status_filter)
    if search:
        qs = qs.filter(Q(user__email__icontains=search) | Q(opportunity__title__icontains=search))
    return qs.order_by("-created_at")


def get_pending_applications():
    return (
        Application.objects.filter(status="pending")
        .select_related("user", "opportunity")
        .order_by("-created_at")
    )


def get_shortlisted_applications(*, opportunity_id=None):
    qs = (
        Application.objects.filter(status="shortlisted")
        .select_related("user", "opportunity", "user__profile")
    )
    if opportunity_id:
        qs = qs.filter(opportunity_id=opportunity_id)
    return qs.order_by("-updated_at")


def get_application_timeline(*, application_id: int):
    return (
        ApplicationStatusHistory.objects.filter(application_id=application_id)
        .select_related("changed_by")
        .order_by("created_at")
    )


def get_application_stats():
    return Application.objects.values("status").annotate(count=Count("id"))