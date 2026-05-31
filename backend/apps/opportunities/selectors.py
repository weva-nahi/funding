"""Opportunity selectors — read-only queries with full-text search."""

from django.db.models import Q

from .models import FundingOpportunity


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
):
    qs = FundingOpportunity.objects.filter(status="published")

    if search:
        qs = qs.filter(Q(title__icontains=search) | Q(description__icontains=search))
    if source:
        qs = qs.filter(source=source)
    if country:
        qs = qs.filter(country__icontains=country)
    if amount_min:
        qs = qs.filter(amount__gte=amount_min)
    if amount_max:
        qs = qs.filter(amount__lte=amount_max)
    if funding_type:
        qs = qs.filter(funding_type=funding_type)
    if sector:
        qs = qs.filter(sector__icontains=sector)
    if min_completeness:
        qs = qs.filter(completeness_score__gte=min_completeness)

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
