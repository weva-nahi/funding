"""Abstract base scraper — all scrapers inherit from this."""

import hashlib
import logging
import re
import time
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class BaseScraper(ABC):
    SOURCE_NAME = None

    def __init__(self, delay=2):
        self.delay = delay
        self.headers = {
            "User-Agent": (
                "Mozilla/5.0 (compatible; RichatFundingTracker/1.0; "
                "+https://richat.mr)"
            ),
            "Accept-Language": "en,fr;q=0.8",
        }

    @abstractmethod
    def scrape(self, max_pages=5, progress_callback=None):
        """Scrape and return a list of project dicts."""

    # ── Hashing / scoring ─────────────────────────────────────────────
    def generate_hash(self, title, url, extra=""):
        raw = f"{title}{url}{extra}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def calculate_completeness_score(self, project):
        fields = [
            "title", "description", "deadline", "amount", "country",
            "url", "funding_type", "sector", "eligibility_criteria",
        ]
        completed = sum(1 for f in fields if project.get(f))
        return int((completed / len(fields)) * 100)

    # ── Parsing helpers ───────────────────────────────────────────────
    def parse_amount(self, value):
        """Extract an integer amount from a number or a string such as
        '700,000', '€ 7 000 000', '16,000,000', '40000000'.
        Returns None when there is no numeric content."""
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return int(value) if value else None
        digits = re.sub(r"[^\d]", "", str(value))
        return int(digits) if digits else None

    def parse_date(self, value):
        """Return an ISO date string (YYYY-MM-DD) if one can be parsed,
        otherwise None. Django's DateField accepts the ISO string on save."""
        if not value:
            return None
        match = re.search(r"(\d{4})-(\d{2})-(\d{2})", str(value))
        return match.group(0) if match else None

    # ── Classification ────────────────────────────────────────────────
    def classify_sector(self, text):
        text_lower = (text or "").lower()
        sectors = {
            "energy": ["energy", "solar", "wind", "renewable", "power", "electric"],
            "water": ["water", "sanitation", "irrigation", "hydro", "marine", "ocean"],
            "agriculture": ["agriculture", "farming", "food", "crop", "rural", "agri"],
            "environment": ["environment", "climate", "biodiversity", "forest", "ecosystem"],
            "health": ["health", "medical", "disease"],
            "infrastructure": ["infrastructure", "transport", "road", "cities", "urban"],
            "education": ["education", "school", "training"],
        }
        for sector, keywords in sectors.items():
            if any(kw in text_lower for kw in keywords):
                return sector
        return "general"

    def classify_funding_type(self, text):
        text_lower = (text or "").lower()
        if "grant" in text_lower:
            return "grant"
        if "loan" in text_lower:
            return "loan"
        if "blended" in text_lower:
            return "blended"
        if "concessional" in text_lower:
            return "concessional"
        return "grant"

    def sleep(self):
        time.sleep(self.delay)