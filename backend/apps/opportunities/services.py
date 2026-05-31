"""Opportunity services — write operations."""

from common.utils.hashing import generate_opportunity_hash
from django.utils import timezone

from .models import FundingOpportunity


def create_opportunity(*, created_by=None, **kwargs) -> FundingOpportunity:
    if "hash" not in kwargs:
        kwargs["hash"] = generate_opportunity_hash(
            kwargs.get("title", ""),
            kwargs.get("url", ""),
            kwargs.get("amount", ""),
        )
    if "completeness_score" not in kwargs or kwargs["completeness_score"] == 0:
        kwargs["completeness_score"] = _calculate_completeness(kwargs)

    return FundingOpportunity.objects.create(**kwargs)


def update_opportunity(*, opportunity: FundingOpportunity, **kwargs) -> FundingOpportunity:
    for field, value in kwargs.items():
        if hasattr(opportunity, field):
            setattr(opportunity, field, value)
    opportunity.completeness_score = _calculate_completeness_from_instance(opportunity)
    opportunity.save()
    return opportunity


def publish_opportunity(*, opportunity: FundingOpportunity, user=None) -> FundingOpportunity:
    opportunity.status = "published"
    opportunity.published_at = timezone.now()
    opportunity.save(update_fields=["status", "updated_at", "published_at"])
    return opportunity


def archive_opportunity(*, opportunity: FundingOpportunity) -> FundingOpportunity:
    opportunity.status = "archived"
    opportunity.save(update_fields=["status", "updated_at"])
    return opportunity


def _calculate_completeness(data: dict) -> int:
    fields = [
        "title",
        "description",
        "deadline",
        "amount",
        "country",
        "eligibility_criteria",
        "funding_type",
        "sector",
        "url",
    ]
    completed = sum(1 for f in fields if data.get(f))
    return int((completed / len(fields)) * 100)


def _calculate_completeness_from_instance(opp: FundingOpportunity) -> int:
    fields = [
        "title",
        "description",
        "deadline",
        "amount",
        "country",
        "eligibility_criteria",
        "funding_type",
        "sector",
        "url",
    ]
    completed = sum(1 for f in fields if getattr(opp, f, None))
    return int((completed / len(fields)) * 100)
