"""World Bank scraper."""

import logging

import requests
from bs4 import BeautifulSoup

from .base import BaseScraper

logger = logging.getLogger(__name__)


class WorldBankScraper(BaseScraper):
    SOURCE_NAME = "WORLD_BANK"
    BASE_URL = "https://projects.worldbank.org/en/projects-operations/projects-list"

    def scrape(self, max_pages=5, progress_callback=None):
        projects = []
        for page in range(max_pages):
            try:
                resp = requests.get(f"{self.BASE_URL}?os={page * 25}", timeout=30)
                soup = BeautifulSoup(resp.content, "html.parser")
                items = soup.select(".project-card, .views-row, table tbody tr")
                for item in items:
                    title_el = item.select_one("h3, .title, td:first-child a")
                    if not title_el:
                        continue
                    title = title_el.get_text(strip=True)
                    link = item.select_one("a")
                    url = link.get("href", "") if link else ""
                    if url and not url.startswith("http"):
                        url = f"https://projects.worldbank.org{url}"
                    project = {
                        "title": title,
                        "url": url,
                        "source": "WORLD_BANK",
                        "description": item.get_text(strip=True)[:500],
                    }
                    project["sector"] = self.classify_sector(project["description"])
                    project["hash"] = self.generate_hash(title, url, "")
                    project["completeness_score"] = self.calculate_completeness_score(project)
                    projects.append(project)
                if progress_callback:
                    progress_callback(page + 1, max_pages, len(projects))
                self.sleep()
            except Exception as e:
                logger.error(f"World Bank scraping error page {page}: {e}")
        return projects
