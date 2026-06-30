"""Abstract base scraper — all scrapers inherit from this."""

import hashlib
import logging
import random
import re
import time
from abc import ABC, abstractmethod

from django.conf import settings

from common.utils.mauritania import extract_mauritania_city, is_mauritania_project

logger = logging.getLogger(__name__)

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
        "Mozilla/5.0 (X11; Linux x86_64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
]

_SAFETY_MAX_PAGES = 500


class BaseScraper(ABC):
    SOURCE_NAME = None

    def __init__(self, delay=2):
        self.delay = delay
        self._ua_index = 0
        self.headers = self._make_headers()
        self.driver = None

    def _make_headers(self) -> dict:
        ua = _USER_AGENTS[self._ua_index % len(_USER_AGENTS)]
        self._ua_index += 1
        return {
            "User-Agent": ua,
            "Accept-Language": "en,fr;q=0.8",
            "Accept": (
                "text/html,application/xhtml+xml,"
                "application/xml;q=0.9,*/*;q=0.8"
            ),
        }

    def rotate_user_agent(self):
        self.headers = self._make_headers()

    @abstractmethod
    def scrape(self, progress_callback=None):
        """Scrape and return a list of project dicts. Must NOT fall back to
        hardcoded/fake data — return [] on failure and let the caller log it."""

    @property
    def safety_max_pages(self) -> int:
        return _SAFETY_MAX_PAGES

    # ── Selenium driver (used by GEF / OECD) ────────────────────────────
    def setup_driver(self, headless=True):
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options
        from selenium.webdriver.chrome.service import Service

        options = Options()
        options.add_argument("--start-maximized")
        options.add_argument("--disable-infobars")
        options.add_argument("--disable-extensions")
        options.add_argument("--disable-notifications")
        options.add_argument("--disable-popup-blocking")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)
        options.add_argument(f"user-agent={self.headers['User-Agent']}")

        if headless:
            options.add_argument("--headless=new")

        chrome_bin = getattr(settings, "CHROME_BINARY_PATH", None)
        if chrome_bin:
            options.binary_location = chrome_bin

        chromedriver_path = getattr(settings, "CHROMEDRIVER_PATH", None)
        try:
            if chromedriver_path:
                service = Service(chromedriver_path)
            else:
                from webdriver_manager.chrome import ChromeDriverManager
                service = Service(ChromeDriverManager().install())
        except Exception as e:
            logger.error("Failed to start Chrome driver: %s", e)
            self.driver = None
            raise

        self.driver = webdriver.Chrome(service=service, options=options)
        self.driver.implicitly_wait(15)
        self.driver.execute_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )
        return self.driver

    def cleanup_driver(self):
        if self.driver:
            try:
                self.driver.quit()
            except Exception:
                pass
            self.driver = None

    # ── Mauritania filtering ────────────────────────────────────────────
    def keep_if_mauritania(self, *texts: str) -> bool:
        return is_mauritania_project(*texts)

    def extract_city(self, *texts: str) -> str:
        return extract_mauritania_city(*texts)

    # ── Financing / deadline filtering ──────────────────────────────────
    def has_financed_amount_and_active_deadline(self, project: dict) -> bool:
        import datetime

        deadline = project.get("deadline")
        if deadline:
            if isinstance(deadline, str):
                try:
                    deadline_date = datetime.date.fromisoformat(deadline[:10])
                except (ValueError, TypeError):
                    deadline_date = None
            elif isinstance(deadline, datetime.datetime):
                deadline_date = deadline.date()
            elif isinstance(deadline, datetime.date):
                deadline_date = deadline
            else:
                deadline_date = None

            if deadline_date and deadline_date < datetime.date.today():
                return False

        return True

    # ── Hashing / scoring ──────────────────────────────────────────────
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

    # ── Parsing helpers ────────────────────────────────────────────────
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
        if match:
            return match.group(0)
        match2 = re.search(r"(\d{1,2})[/-](\d{1,2})[/-](\d{4})", str(value))
        if match2:
            d, m, y = match2.group(1), match2.group(2), match2.group(3)
            return f"{y}-{int(m):02d}-{int(d):02d}"
        return None

    def clean_text(self, text):
        if not text:
            return ""
        import html as _html
        text = str(text)
        text = _html.unescape(text)
        return " ".join(text.split()).strip()

    # ── Classification ─────────────────────────────────────────────────
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
        """Classify funding type from text description."""
        text_lower = (text or "").lower()
        
        # FIXED: Proper indentation and logic for funding type detection
        if "blended" in text_lower:
            return "blended"
        if "loan" in text_lower:
            return "loan"
        if "concessional" in text_lower:
            return "concessional"
        if "grant" in text_lower:
            return "grant"
        return "grant"  # default fallback

    def sleep(self):
        jitter = self.delay * random.uniform(0.7, 1.3)
        time.sleep(jitter)
        self.rotate_user_agent()