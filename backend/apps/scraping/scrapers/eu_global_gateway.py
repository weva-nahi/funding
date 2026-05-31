"""EU Global Gateway scraper."""

import logging

import requests
from bs4 import BeautifulSoup

from .base import BaseScraper

logger = logging.getLogger(__name__)


class EUGlobalGatewayScraper(BaseScraper):
    SOURCE_NAME = "EU"
    BASE_URL = (
        "https://international-partnerships.ec.europa.eu/funding-and-technical-assistance/funding-opportunities_en"
    )

    def scrape(self, max_pages=5, progress_callback=None):
        projects = []
        try:
            resp = requests.get(self.BASE_URL, timeout=30)
            soup = BeautifulSoup(resp.content, "html.parser")
            items = soup.select("article, .views-row, .listing__item")
            for item in items[: max_pages * 10]:
                title_el = item.select_one("h2, h3, .title")
                if not title_el:
                    continue
                title = title_el.get_text(strip=True)
                link = item.select_one("a")
                url = link.get("href", "") if link else ""
                if url and not url.startswith("http"):
                    url = f"https://international-partnerships.ec.europa.eu{url}"
                project = {"title": title, "url": url, "source": "EU", "description": item.get_text(strip=True)[:500]}
                project["sector"] = self.classify_sector(project["description"])
                project["hash"] = self.generate_hash(title, url, "")
                project["completeness_score"] = self.calculate_completeness_score(project)
                projects.append(project)
            if progress_callback:
                progress_callback(1, 1, len(projects))
        except Exception as e:
            logger.error(f"EU Global Gateway scraping error: {e}")
        return projects
