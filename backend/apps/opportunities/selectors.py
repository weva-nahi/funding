"""Opportunity selectors."""

from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.db.models import Q
from django.utils import timezone

from .models import FundingOpportunity, SavedOpportunity

# Funding types compatible with Islamic finance (no riba/interest)
ISLAMIC_FINANCE_TYPES = getattr(settings, "ISLAMIC_FINANCE_ALLOWED_TYPES", ["grant", "concessional", "blended"])


def _to_decimal(value):
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
    wilaya=None,
    amount_min=None,
    amount_max=None,
    funding_type=None,
    sector=None,
    min_completeness=None,
    has_deadline=None,
):
    """Published opportunities — Islamic finance only, active deadlines or no deadline."""
    today = timezone.now().date()
    
    qs = (
        FundingOpportunity.objects.filter(status="published")
        .filter(
            Q(deadline__isnull=True) | Q(deadline__gte=today)
        )  # No deadline OR future deadline
        .filter(funding_type__in=ISLAMIC_FINANCE_TYPES)  # Islamic finance only
        .select_related("created_by")
    )

    if search:
        qs = qs.filter(Q(title__icontains=search) | Q(description__icontains=search))
    if source:
        qs = qs.filter(source__icontains=source)
    if country:
        qs = qs.filter(country__icontains=country)
    # Support both city and wilaya params
    location = wilaya or city
    if location:
        qs = qs.filter(city__icontains=location)

    amount_min_dec = _to_decimal(amount_min)
    if amount_min_dec is not None:
        qs = qs.filter(amount__gte=amount_min_dec)

    amount_max_dec = _to_decimal(amount_max)
    if amount_max_dec is not None:
        qs = qs.filter(amount__lte=amount_max_dec)

    if funding_type:
        if funding_type in ISLAMIC_FINANCE_TYPES:
            qs = qs.filter(funding_type=funding_type)
    if sector:
        qs = qs.filter(sector__icontains=sector)
    if min_completeness:
        try:
            qs = qs.filter(completeness_score__gte=int(min_completeness))
        except (TypeError, ValueError):
            pass
    if has_deadline and has_deadline != 'false':
        qs = qs.filter(deadline__isnull=False, deadline__gte=today)

    return qs.order_by("-created_at")


def get_all_opportunities(*, status_filter=None, search=None):
    """Admin-facing — includes all rows."""
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
        .filter(funding_type__in=ISLAMIC_FINANCE_TYPES)
        .order_by("-created_at")[:limit]
    )


def get_opportunity_count():
    today = timezone.now().date()
    return (
        FundingOpportunity.objects.filter(status="published")
        .filter(Q(deadline__isnull=True) | Q(deadline__gte=today))
        .filter(funding_type__in=ISLAMIC_FINANCE_TYPES)
        .count()
    )


def get_saved_opportunities(*, user):
    return (
        FundingOpportunity.objects.filter(saves__user=user)
        .select_related("created_by")
        .order_by("-saves__created_at")
        .distinct()
    )


def get_saved_opportunity_ids(*, user) -> set:
    return set(
        SavedOpportunity.objects.filter(user=user).values_list("opportunity_id", flat=True)
    )


def is_opportunity_saved(*, user, opportunity_id: int) -> bool:
    return SavedOpportunity.objects.filter(user=user, opportunity_id=opportunity_id).exists()


def get_saved_count(*, user) -> int:
    return SavedOpportunity.objects.filter(user=user).count()