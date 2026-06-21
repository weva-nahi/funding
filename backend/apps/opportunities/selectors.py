"""Opportunity selectors — read-only queries with full-text search."""

from decimal import Decimal, InvalidOperation

from django.db.models import Q
from django.utils import timezone

from .models import FundingOpportunity, SavedOpportunity


def _to_decimal(value):
    """Safely coerce a raw query-string value to Decimal, or None if invalid."""
    if value in (None, ""):
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None


def get_published_opportunities(
    *,
    search=None,
    source=None,
    country=None,
    city=None,
    amount_min=None,
    amount_max=None,
    funding_type=None,
    sector=None,
    min_completeness=None,
    has_deadline=None,
):
    """Published, non-expired opportunities only. select_related("created_by")
    covers the N+1 risk on that field across list pagination."""
    today = timezone.now().date()
    qs = (
        FundingOpportunity.objects.filter(status="published")
        .filter(Q(deadline__isnull=True) | Q(deadline__gte=today))
        .select_related("created_by")
    )

    if search:
        qs = qs.filter(Q(title__icontains=search) | Q(description__icontains=search))
    if source:
        qs = qs.filter(source=source)
    if country:
        qs = qs.filter(country__icontains=country)
    if city:
        qs = qs.filter(city__icontains=city)

    amount_min_dec = _to_decimal(amount_min)
    if amount_min_dec is not None:
        qs = qs.filter(amount__gte=amount_min_dec)

    amount_max_dec = _to_decimal(amount_max)
    if amount_max_dec is not None:
        qs = qs.filter(amount__lte=amount_max_dec)

    if funding_type:
        qs = qs.filter(funding_type=funding_type)
    if sector:
        qs = qs.filter(sector__icontains=sector)
    if min_completeness:
        try:
            qs = qs.filter(completeness_score__gte=int(min_completeness))
        except (TypeError, ValueError):
            pass

    if has_deadline is not None and str(has_deadline).lower() in ("1", "true", "yes", "on"):
        qs = qs.filter(deadline__isnull=False)

    return qs.order_by("-created_at")


def get_all_opportunities(*, status_filter=None, search=None):
    """Admin-facing — intentionally includes expired/draft/archived rows."""
    qs = FundingOpportunity.objects.select_related("created_by").all()
    if status_filter:
        qs = qs.filter(status=status_filter)
    if search:
        qs = qs.filter(Q(title__icontains=search) | Q(description__icontains=search))
    return qs.order_by("-created_at")


def get_opportunity_by_id(*, opportunity_id: int) -> FundingOpportunity:
    return FundingOpportunity.objects.select_related("created_by").get(id=opportunity_id)


def get_latest_opportunities(*, limit: int = 5):
    today = timezone.now().date()
    return (
        FundingOpportunity.objects.filter(status="published")
        .filter(Q(deadline__isnull=True) | Q(deadline__gte=today))
        .order_by("-created_at")[:limit]
    )


def get_opportunity_count():
    today = timezone.now().date()
    return (
        FundingOpportunity.objects.filter(status="published")
        .filter(Q(deadline__isnull=True) | Q(deadline__gte=today))
        .count()
    )


# ─── Saved opportunities (save-for-later) ─────────────────────────────────────

def get_saved_opportunities(*, user):
    """Return the user's saved opportunities (published or not), newest first.

    select_related("created_by") closes the same N+1 gap on this path —
    previously only the published/admin list selectors had it, but this
    one (backing /opportunities/saved/) was overlooked and would have
    triggered one extra query per row whenever created_by_email or similar
    fields are read from the serialized opportunity.
    """
    return (
        FundingOpportunity.objects.filter(saves__user=user)
        .select_related("created_by")
        .order_by("-saves__created_at")
        .distinct()
    )


def get_saved_opportunity_ids(*, user) -> set:
    """Return a set of opportunity ids the user has saved (for quick lookup).
    This single query is what makes the get_is_saved() N+1 fix possible —
    call it ONCE per request and pass the resulting set through serializer
    context, rather than letting each serialized row re-query."""
    return set(
        SavedOpportunity.objects.filter(user=user).values_list("opportunity_id", flat=True)
    )


def is_opportunity_saved(*, user, opportunity_id: int) -> bool:
    """Single-object check — used only as a fallback in
    FundingOpportunitySerializer.get_is_saved() for the single-object
    detail view (OpportunityDetailView), where there's exactly one row
    being serialized and so no N+1 risk exists; list views should always
    pass saved_ids through context instead of relying on this fallback."""
    return SavedOpportunity.objects.filter(user=user, opportunity_id=opportunity_id).exists()


def get_saved_count(*, user) -> int:
    return SavedOpportunity.objects.filter(user=user).count()