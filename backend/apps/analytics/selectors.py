"""Analytics selectors — read-only aggregate queries."""

import csv
import io
from datetime import timedelta

from django.conf import settings
from django.db.models import Count, Q
from django.db.models.functions import TruncDay, TruncMonth
from django.utils import timezone

from apps.applications.models import Application
from apps.authentication.models import User
from apps.opportunities.models import FundingOpportunity


def get_dashboard_stats() -> dict:
    total = Application.objects.count()
    pending = Application.objects.filter(status__in=["pending", "in_review"]).count()
    now = timezone.now()
    approved_this_month = Application.objects.filter(
        status="approved",
        updated_at__month=now.month,
        updated_at__year=now.year,
    ).count()
    rejected_this_month = Application.objects.filter(
        status="rejected",
        updated_at__month=now.month,
        updated_at__year=now.year,
    ).count()
    active_clients = User.objects.filter(role="client", is_active=True).count()
    return {
        "total_applications": total,
        "pending_applications": pending,
        "approved_this_month": approved_this_month,
        "rejected_this_month": rejected_this_month,
        "active_clients": active_clients,
    }


def get_activity_chart(*, days: int = 14):
    since = timezone.now() - timedelta(days=days)
    return (
        Application.objects.filter(created_at__gte=since)
        .annotate(day=TruncDay("created_at"))
        .values("day")
        .annotate(count=Count("id"))
        .order_by("day")
    )


def get_status_distribution():
    return (
        Application.objects.values("status")
        .annotate(count=Count("id"))
        .order_by("status")
    )


def get_approval_rate_by_month(*, months: int = 6):
    since = timezone.now() - timedelta(days=months * 30)
    return (
        Application.objects.filter(created_at__gte=since)
        .annotate(month=TruncMonth("created_at"))
        .values("month")
        .annotate(
            total=Count("id"),
            approved=Count("id", filter=Q(status="approved")),
            rejected=Count("id", filter=Q(status="rejected")),
        )
        .order_by("month")
    )


def get_top_sources():
    return (
        FundingOpportunity.objects.filter(status="published")
        .values("source")
        .annotate(count=Count("id"))
        .order_by("-count")
    )


def get_client_activity() -> list:
    """
    Return top 20 clients sorted by application count.
    last_login is serialized to ISO string to avoid JSON serialization errors
    when the view calls list() on the queryset values().
    """
    rows = (
        User.objects.filter(role="client")
        .annotate(app_count=Count("applications"))
        .values("email", "app_count", "last_login")
        .order_by("-app_count")[:20]
    )
    result = []
    for row in rows:
        last_login = row["last_login"]
        result.append(
            {
                "email": row["email"],
                "app_count": row["app_count"],
                "last_login": last_login.isoformat() if last_login else None,
            }
        )
    return result


def get_avg_processing_time() -> dict:
    """
    Average days between application creation and its first 'approved'
    status-history entry. Uses a configurable sample limit.
    """
    from apps.applications.models import ApplicationStatusHistory

    # Safe fallback if setting is not defined
    sample_limit = getattr(settings, "PROCESSING_TIME_SAMPLE_LIMIT", 500)

    approved = (
        ApplicationStatusHistory.objects.filter(to_status="approved")
        .select_related("application")
        .order_by("-created_at")[:sample_limit]
    )
    total_seconds = 0.0
    count = 0
    for history in approved:
        delta = history.created_at - history.application.created_at
        total_seconds += delta.total_seconds()
        count += 1

    if not count:
        return {"avg_days": 0, "sample_size": 0}
    return {
        "avg_days": round((total_seconds / count) / 86400, 1),
        "sample_size": count,
    }


def export_analytics_csv() -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Month", "Total", "Approved", "Rejected", "Approval Rate"])
    for row in get_approval_rate_by_month(months=12):
        rate = (
            round(row["approved"] / row["total"] * 100, 1) if row["total"] else 0
        )
        writer.writerow(
            [
                row["month"].strftime("%Y-%m"),
                row["total"],
                row["approved"],
                row["rejected"],
                f"{rate}%",
            ]
        )
    return output.getvalue()