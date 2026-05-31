"""Climate Fund scraper."""

import logging

import requests
from bs4 import BeautifulSoup

from .base import BaseScraper

logger = logging.getLogger(__name__)


class ClimateFundScraper(BaseScraper):
    SOURCE_NAME = "CLIMATE_FUND"
    BASE_URL = "https://climatefundsupdate.org/data-dashboard/"

    def scrape(self, max_pages=5, progress_callback=None):
        projects = []
        try:
            resp = requests.get(self.BASE_URL, timeout=30)
            soup = BeautifulSoup(resp.content, "html.parser")
            items = soup.select("table tbody tr, .project-item, article")
            for item in items[: max_pages * 10]:
                title_el = item.select_one("td:first-child, h3, .title")
                if not title_el:
                    continue
                title = title_el.get_text(strip=True)
                link = item.select_one("a")
                url = link.get("href", "") if link else ""
                project = {
                    "title": title,
                    "url": url,
                    "source": "CLIMATE_FUND",
                    "description": item.get_text(strip=True)[:500],
                }
                project["sector"] = self.classify_sector(project["description"])
                project["hash"] = self.generate_hash(title, url, "")
                project["completeness_score"] = self.calculate_completeness_score(project)
                projects.append(project)
            if progress_callback:
                progress_callback(1, 1, len(projects))
        except Exception as e:
            logger.error(f"Climate Fund scraping error: {e}")
        return projects
