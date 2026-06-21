"""Scraping orchestration services."""

import datetime
import logging

from django.utils import timezone

from apps.opportunities.models import FundingOpportunity
from common.exceptions import NotFoundError

from .models import ScrapingAlert, ScrapingJob
from .scrapers.afd import AFDScraper
from .scrapers.climate_fund import ClimateFundScraper
from .scrapers.eu_global_gateway import EUGlobalGatewayScraper
from .scrapers.gcf import GCFScraper
from .scrapers.gef import GEFScraper
from .scrapers.oecd import OECDScraper
from .scrapers.world_bank import WorldBankScraper

logger = logging.getLogger(__name__)

SCRAPER_MAPPING = {
    "gef": GEFScraper,
    "gcf": GCFScraper,
    "oecd": OECDScraper,
    "climate_fund": ClimateFundScraper,
    "world_bank": WorldBankScraper,
    "afd": AFDScraper,
    "eu": EUGlobalGatewayScraper,
}

ALL_SOURCES = list(SCRAPER_MAPPING.keys())


def run_scraper(*, source: str, progress_callback=None):
    """Run a single named scraper to completion (no page limit)."""
    scraper_class = SCRAPER_MAPPING.get(source.lower())
    if not scraper_class:
        raise ValueError(f"Unknown source: {source}. Available: {list(SCRAPER_MAPPING.keys())}")
    scraper = scraper_class()
    return scraper.scrape(progress_callback=progress_callback)


def save_projects(*, projects: list, job: ScrapingJob):
    created = duplicates = 0
    for project_data in projects:
        hash_val = project_data.get("hash", "")
        if not hash_val or FundingOpportunity.objects.filter(hash=hash_val).exists():
            duplicates += 1
            continue
        opp = FundingOpportunity.objects.create(
            title=project_data.get("title", ""),
            source=project_data.get("source", ""),
            description=project_data.get("description", ""),
            country=project_data.get("country", "Mauritania"),
            city=project_data.get("city", ""),
            amount=project_data.get("amount"),
            currency=project_data.get("currency", "USD"),
            deadline=project_data.get("deadline"),
            eligibility_criteria=project_data.get("eligibility_criteria", ""),
            funding_type=project_data.get("funding_type", "grant"),
            sector=project_data.get("sector", ""),
            completeness_score=project_data.get("completeness_score", 0),
            hash=hash_val,
            url=project_data.get("url", ""),
            status="draft",
            metadata=project_data.get("metadata", {}),
        )
        ScrapingAlert.objects.create(opportunity=opp, job=job, priority=classify_priority(opp))
        created += 1
    return {"created": created, "duplicates": duplicates}


def _coerce_date(value):
    """Coerce deadline to datetime.date regardless of whether it's a string or date."""
    if value is None:
        return None
    if isinstance(value, datetime.datetime):
        return value.date()
    if isinstance(value, datetime.date):
        return value
    if isinstance(value, str):
        try:
            return datetime.date.fromisoformat(value)
        except (ValueError, TypeError):
            return None
    return None


def classify_priority(opportunity):
    deadline = _coerce_date(opportunity.deadline)
    if deadline:
        days = (deadline - timezone.now().date()).days
        amount = float(opportunity.amount or 0)
        if days <= 7 or amount > 1_000_000:
            return "urgent"
        if days <= 30:
            return "high"
        if days <= 60:
            return "medium"
    return "low"


def _get_alert(alert_id: int) -> ScrapingAlert:
    try:
        return ScrapingAlert.objects.select_related("opportunity").get(id=alert_id)
    except ScrapingAlert.DoesNotExist:
        raise NotFoundError("Scraping alert not found.")


def publish_alert(*, alert_id: int):
    alert = _get_alert(alert_id)
    alert.opportunity.status = "published"
    alert.opportunity.published_at = timezone.now()
    alert.opportunity.save(update_fields=["status", "published_at"])
    alert.status = "published"
    alert.save(update_fields=["status"])
    return alert


def archive_alert(*, alert_id: int):
    alert = _get_alert(alert_id)
    alert.status = "archived"
    alert.save(update_fields=["status"])
    return alert


def ignore_alert(*, alert_id: int):
    alert = _get_alert(alert_id)
    alert.status = "ignored"
    alert.save(update_fields=["status"])
    return alert