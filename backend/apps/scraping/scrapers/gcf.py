"""GCF scraper — Green Climate Fund."""

import logging

import requests
from bs4 import BeautifulSoup

from .base import BaseScraper

logger = logging.getLogger(__name__)


class GCFScraper(BaseScraper):
    SOURCE_NAME = "GCF"
    BASE_URL = "https://www.greenclimate.fund/projects"

    def scrape(self, max_pages=5, progress_callback=None):
        projects = []
        for page in range(max_pages):
            try:
                resp = requests.get(f"{self.BASE_URL}?page={page}", timeout=30)
                soup = BeautifulSoup(resp.content, "html.parser")
                cards = soup.select(".project-card, .views-row, table tbody tr")

                for card in cards:
                    title_el = card.select_one("h3, .title, td:first-child a")
                    if not title_el:
                        continue
                    title = title_el.get_text(strip=True)
                    url = title_el.get("href", "") if title_el.name == "a" else ""
                    if url and not url.startswith("http"):
                        url = f"https://www.greenclimate.fund{url}"

                    project = {
                        "title": title,
                        "url": url,
                        "source": "GCF",
                        "description": card.get_text(strip=True)[:500],
                    }
                    project["sector"] = self.classify_sector(project["description"])
                    project["funding_type"] = self.classify_funding_type(project["description"])
                    project["hash"] = self.generate_hash(title, url, "")
                    project["completeness_score"] = self.calculate_completeness_score(project)
                    projects.append(project)

                if progress_callback:
                    progress_callback(page + 1, max_pages, len(projects))
                self.sleep()
            except Exception as e:
                logger.error(f"GCF scraping error page {page}: {e}")
        return projects
