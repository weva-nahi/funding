"""AFD scraper — Agence Française de Développement."""

import logging

import requests
from bs4 import BeautifulSoup

from .base import BaseScraper

logger = logging.getLogger(__name__)


class AFDScraper(BaseScraper):
    SOURCE_NAME = "AFD"
    BASE_URL = "https://www.afd.fr/en/page-thematique-axe/climate"

    def scrape(self, max_pages=5, progress_callback=None):
        projects = []
        try:
            resp = requests.get(self.BASE_URL, timeout=30)
            soup = BeautifulSoup(resp.content, "html.parser")
            items = soup.select("article, .node--type-project, .views-row")
            for item in items[: max_pages * 10]:
                title_el = item.select_one("h2, h3, .field--name-title")
                if not title_el:
                    continue
                title = title_el.get_text(strip=True)
                link = item.select_one("a")
                url = link.get("href", "") if link else ""
                if url and not url.startswith("http"):
                    url = f"https://www.afd.fr{url}"
                project = {"title": title, "url": url, "source": "AFD", "description": item.get_text(strip=True)[:500]}
                project["sector"] = self.classify_sector(project["description"])
                project["hash"] = self.generate_hash(title, url, "")
                project["completeness_score"] = self.calculate_completeness_score(project)
                projects.append(project)
            if progress_callback:
                progress_callback(1, 1, len(projects))
        except Exception as e:
            logger.error(f"AFD scraping error: {e}")
        return projects
