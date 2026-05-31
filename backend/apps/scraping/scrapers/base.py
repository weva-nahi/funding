"""Abstract base scraper — all scrapers inherit from this."""

import hashlib
import logging
import time
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class BaseScraper(ABC):
    SOURCE_NAME = None

    def __init__(self, delay=2):
        self.delay = delay

    @abstractmethod
    def scrape(self, max_pages=5, progress_callback=None):
        pass

    def generate_hash(self, title, url, amount):
        raw = f"{title}{url}{amount}"
        return hashlib.sha256(raw.encode()).hexdigest()

    def calculate_completeness_score(self, project):
        fields = [
            "title",
            "description",
            "deadline",
            "amount",
            "country",
            "url",
            "funding_type",
            "sector",
            "eligibility_criteria",
        ]
        completed = sum(1 for f in fields if project.get(f))
        return int((completed / len(fields)) * 100)

    def classify_sector(self, text):
        text_lower = (text or "").lower()
        sectors = {
            "energy": ["energy", "solar", "wind", "renewable", "power"],
            "water": ["water", "sanitation", "irrigation", "hydro"],
            "agriculture": ["agriculture", "farming", "food", "crop"],
            "environment": ["environment", "climate", "biodiversity", "forest"],
            "health": ["health", "medical", "disease"],
            "infrastructure": ["infrastructure", "transport", "road"],
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
