"""Opportunity selectors — read-only queries with full-text search."""

from decimal import Decimal, InvalidOperation

from django.db.models import Q

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
    amount_min=None,
    amount_max=None,
    funding_type=None,
    sector=None,
    min_completeness=None,
    has_deadline=None,
):
    qs = FundingOpportunity.objects.filter(status="published")

    if search:
        qs = qs.filter(Q(title__icontains=search) | Q(description__icontains=search))
    if source:
        qs = qs.filter(source=source)
    if country:
        qs = qs.filter(country__icontains=country)

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

    # "has_deadline" toggle — accept truthy strings from the query string.
    if has_deadline is not None and str(has_deadline).lower() in ("1", "true", "yes", "on"):
        qs = qs.filter(deadline__isnull=False)

    return qs.order_by("-created_at")


def get_all_opportunities(*, status_filter=None, search=None):
    qs = FundingOpportunity.objects.all()
    if status_filter:
        qs = qs.filter(status=status_filter)
    if search:
        qs = qs.filter(Q(title__icontains=search) | Q(description__icontains=search))
    return qs.order_by("-created_at")


def get_opportunity_by_id(*, opportunity_id: int) -> FundingOpportunity:
    return FundingOpportunity.objects.get(id=opportunity_id)


def get_latest_opportunities(*, limit: int = 5):
    return FundingOpportunity.objects.filter(status="published").order_by("-created_at")[:limit]


def get_opportunity_count():
    return FundingOpportunity.objects.filter(status="published").count()


# ─── Saved opportunities (save-for-later) ─────────────────────────────────────

def get_saved_opportunities(*, user):
    """Return the user's saved opportunities (published or not), newest first."""
    return (
        FundingOpportunity.objects.filter(saves__user=user)
        .order_by("-saves__created_at")
        .distinct()
    )


def get_saved_opportunity_ids(*, user) -> set:
    """Return a set of opportunity ids the user has saved (for quick lookup)."""
    return set(
        SavedOpportunity.objects.filter(user=user).values_list("opportunity_id", flat=True)
    )


def is_opportunity_saved(*, user, opportunity_id: int) -> bool:
    return SavedOpportunity.objects.filter(user=user, opportunity_id=opportunity_id).exists()


def get_saved_count(*, user) -> int:
    return SavedOpportunity.objects.filter(user=user).count()