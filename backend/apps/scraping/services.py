import datetime
import logging

from django.utils import timezone

from apps.opportunities.models import FundingOpportunity
from apps.opportunities.services import SOURCE_ALIASES

from .models import ScrapingJob
from .scrapers.gcf import GCFScraper
from .scrapers.gef import GEFScraper
from .scrapers.oecd import OECDScraper
from .scrapers.world_bank import WorldBankScraper

logger = logging.getLogger(__name__)

SCRAPER_MAPPING = {
    "gef": GEFScraper,
    "gcf": GCFScraper,
    "oecd": OECDScraper,
    "world_bank": WorldBankScraper,
}

ALL_SOURCES = list(SCRAPER_MAPPING.keys())

_SOURCE_NAME_TO_CHOICE = {
    "GEF": "GEF",
    "GCF": "GCF",
    "OECD": "OECD",
    "WORLD_BANK": "WORLD_BANK",
}

ISLAMIC_FINANCE_TYPES = {"grant", "concessional", "blended"}


def _normalize_source_for_model(raw: str) -> str:
    if not raw:
        return "OECD"
    upper = str(raw).strip().upper()
    if upper in _SOURCE_NAME_TO_CHOICE:
        return _SOURCE_NAME_TO_CHOICE[upper]
    alias = SOURCE_ALIASES.get(upper)
    if alias and alias in _SOURCE_NAME_TO_CHOICE:
        return alias
    from apps.opportunities.services import _normalize_source
    result = _normalize_source(raw)
    if result not in _SOURCE_NAME_TO_CHOICE:
        return "OECD"
    return result


def run_scraper(*, source: str, progress_callback=None):
    scraper_class = SCRAPER_MAPPING.get(source.lower())
    if not scraper_class:
        raise ValueError(
            f"Unknown source: {source}. Available: {list(SCRAPER_MAPPING.keys())}"
        )
    scraper = scraper_class()
    return scraper.scrape(progress_callback=progress_callback)


def save_projects(*, projects: list, job: ScrapingJob):
    created = duplicates = 0

    for project_data in projects:
        hash_val = project_data.get("hash", "")
        if not hash_val or FundingOpportunity.objects.filter(hash=hash_val).exists():
            duplicates += 1
            continue

        raw_source = project_data.get("source", "")
        normalized_source = _normalize_source_for_model(raw_source)

        if normalized_source not in _SOURCE_NAME_TO_CHOICE:
            duplicates += 1
            continue

        amount = project_data.get("amount")
        if amount is not None:
            try:
                amount = float(amount)
                if amount <= 0:
                    amount = None
            except (TypeError, ValueError):
                amount = None

        deadline = project_data.get("deadline")
        if isinstance(deadline, str) and deadline:
            try:
                deadline = datetime.date.fromisoformat(deadline[:10])
            except (ValueError, TypeError):
                deadline = None
        elif isinstance(deadline, datetime.datetime):
            deadline = deadline.date()
        elif not isinstance(deadline, (datetime.date, type(None))):
            deadline = None

        title = (project_data.get("title") or "")[:500]
        description = (project_data.get("description") or "")[:5000]
        url = (project_data.get("url") or "")[:1000]
        eligibility = (project_data.get("eligibility_criteria") or "")[:2000]

        raw_funding_type = project_data.get("funding_type", "grant")
        if raw_funding_type not in ISLAMIC_FINANCE_TYPES:
            raw_funding_type = "grant"

        try:
            FundingOpportunity.objects.create(
                title=title,
                source=normalized_source,
                description=description,
                country=project_data.get("country", "Mauritania"),
                city=project_data.get("city", ""),
                amount=amount,
                currency=project_data.get("currency", "USD"),
                deadline=deadline,
                eligibility_criteria=eligibility,
                required_documents=project_data.get("required_documents", ""),
                funding_type=raw_funding_type,
                sector=project_data.get("sector", "general"),
                completeness_score=project_data.get("completeness_score", 0),
                hash=hash_val,
                url=url,
                status="published",
                published_at=timezone.now(),
                metadata=project_data.get("metadata", {}),
            )
            created += 1
        except Exception as exc:
            logger.warning(
                "save_projects: failed to save '%s': %s",
                project_data.get("title", "?"),
                exc,
            )
            duplicates += 1

    return {"created": created, "duplicates": duplicates}


def classify_priority(opportunity):
    deadline = opportunity.deadline
    amount = opportunity.amount

    if deadline is None:
        return "low"

    today = timezone.now().date()
    if isinstance(deadline, str):
        try:
            deadline = datetime.date.fromisoformat(deadline[:10])
        except (ValueError, TypeError):
            return "low"
    elif isinstance(deadline, datetime.datetime):
        deadline = deadline.date()

    days_left = (deadline - today).days

    if days_left <= 7:
        return "urgent"
    if days_left <= 30:
        return "high"
    if amount and float(amount) >= 1_000_000:
        return "high"
    return "medium"


def get_source_counts():
    from django.db.models import Count
    return {
        item["source"]: item["count"]
        for item in FundingOpportunity.objects.filter(
            status="published"
        ).values("source").annotate(count=Count("id"))
    }