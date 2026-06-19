"""Abstract base scraper — all scrapers inherit from this."""

import hashlib
import logging
import random
import re
import time
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

# A pool of realistic browser User-Agent strings used to rotate on each
# request. GEF and some other sources block the generic "requests/2.x" UA;
# rotating through common browser UAs sidesteps that block without requiring
# a real browser.
_USER_AGENTS = [
    (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/123.0.0.0 Safari/537.36"
    ),
    (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) "
        "Gecko/20100101 Firefox/125.0"
    ),
    (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) "
        "AppleWebKit/605.1.15 (KHTML, like Gecko) "
        "Version/17.4.1 Safari/605.1.15"
    ),
    (
        "Mozilla/5.0 (X11; Linux x86_64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
]


class BaseScraper(ABC):
    SOURCE_NAME = None

    def __init__(self, delay=2):
        self.delay = delay
        self._ua_index = 0
        self.headers = self._make_headers()

    def _make_headers(self) -> dict:
        """Build headers with the next User-Agent in the rotation pool."""
        ua = _USER_AGENTS[self._ua_index % len(_USER_AGENTS)]
        self._ua_index += 1
        return {
            "User-Agent": ua,
            "Accept-Language": "en,fr;q=0.8",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }

    def rotate_user_agent(self):
        """Call between requests to cycle to the next User-Agent."""
        self.headers = self._make_headers()

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
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return int(value) if value else None
        digits = re.sub(r"[^\d]", "", str(value))
        return int(digits) if digits else None

    def parse_date(self, value):
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
        # Add small random jitter (±30%) to make the scraper less detectable.
        jitter = self.delay * random.uniform(0.7, 1.3)
        time.sleep(jitter)
        # Rotate the UA after each page sleep.
        self.rotate_user_agent()