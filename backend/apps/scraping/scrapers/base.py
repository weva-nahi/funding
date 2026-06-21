"""Abstract base scraper — all scrapers inherit from this."""

import hashlib
import logging
import random
import re
import time
from abc import ABC, abstractmethod

from common.utils.mauritania import extract_mauritania_city, is_mauritania_project

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

# Hard ceiling purely as a runaway-loop safety net — NOT a product limit.
# Sources are expected to exhaust (return an empty page) long before this,
# since each scraper is now filtered to Mauritania-only results. This exists
# only so a misbehaving source (e.g. one that never returns an empty page)
# can't loop forever and starve the scraping worker.
_SAFETY_MAX_PAGES = 500


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
    def scrape(self, progress_callback=None):
        """Scrape and return a list of project dicts.

        No max_pages parameter — scrapers run until the source returns no
        more results (or _SAFETY_MAX_PAGES is hit as a runaway-loop guard).
        Mauritania-only filtering happens inside each scraper via
        self.keep_if_mauritania() below.
        """

    @property
    def safety_max_pages(self) -> int:
        return _SAFETY_MAX_PAGES

    # ── Mauritania filtering ────────────────────────────────────────────
    def keep_if_mauritania(self, *texts: str) -> bool:
        """Call with every relevant text field for a scraped item. Returns
        True only if the item references Mauritania — scrapers must skip
        (continue) any item where this returns False."""
        return is_mauritania_project(*texts)

    def extract_city(self, *texts: str) -> str:
        """Best-effort extraction of the targeted Mauritanian city/locality."""
        return extract_mauritania_city(*texts)

    # ── Financing / deadline filtering ──────────────────────────────────
    def has_financed_amount_and_active_deadline(self, project: dict) -> bool:
        """Per the product requirement: only keep scraped projects that
        BOTH have a financed amount AND have a deadline that is still in
        the future (or no deadline requirement was specified by the source
        at all — handled by the caller, this method only validates rows
        that claim to have a deadline).

        Returns True if the project should be kept.
        """
        import datetime

        amount = project.get("amount")
        if not amount or float(amount) <= 0:
            return False

        deadline = project.get("deadline")
        if not deadline:
            # No deadline data available from the source — we still want
            # the opportunity if it has financing, since not all funders
            # expose a hard deadline (e.g. rolling-basis grants). The
            # "active deadline" requirement only excludes EXPIRED deadlines,
            # it doesn't exclude opportunities with NO stated deadline.
            return True

        if isinstance(deadline, str):
            try:
                deadline = datetime.date.fromisoformat(deadline)
            except (ValueError, TypeError):
                return True  # unparsable date — don't drop the row over it

        return deadline >= datetime.date.today()

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