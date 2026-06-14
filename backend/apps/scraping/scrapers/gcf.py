"""GCF scraper — Green Climate Fund approved projects.

The projects list is server-rendered (Drupal). Each project is a
``div.card-project``; the project code lives in ``h5.card-title`` and the
full (untruncated) title is in the ``title`` attribute of the
``.card-project__title`` paragraph (the visible text is CSS-clamped).
Pagination is ``?page=N`` (0-indexed; page 0 = base URL).
"""

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
            url = self.BASE_URL if page == 0 else f"{self.BASE_URL}?page={page}"
            try:
                resp = requests.get(url, headers=self.headers, timeout=30)
                resp.raise_for_status()
                soup = BeautifulSoup(resp.content, "html.parser")
                cards = soup.select("div.card-project")
                if not cards:
                    logger.info(f"GCF: no cards on page {page}, stopping.")
                    break

                for card in cards:
                    code_el = card.select_one("h5.card-title")
                    code = code_el.get_text(strip=True) if code_el else ""

                    title_el = card.select_one(".card-project__title p")
                    title = ""
                    if title_el:
                        # Full title is in the `title` attribute; visible text is clamped.
                        title = (
                            title_el.get("title") or title_el.get_text(strip=True)
                        ).strip()
                    title = title or code
                    if not title:
                        continue

                    link_el = (
                        card.select_one("a.stretched-link")
                        or card.select_one("a[href]")
                    )
                    href = link_el.get("href", "") if link_el else ""
                    if href and not href.startswith("http"):
                        href = f"https://www.greenclimate.fund{href}"

                    country_el = card.select_one(".card-project__countries")
                    country = (
                        country_el.get_text(" ", strip=True) if country_el else ""
                    )

                    theme_el = card.select_one(".card-project__target .badge")
                    theme = theme_el.get_text(strip=True) if theme_el else ""

                    project = {
                        "title": title,
                        "url": href,
                        "source": "GCF",
                        "description": " — ".join(
                            [p for p in (code, theme) if p]
                        ),
                        "country": country,
                        "currency": "USD",
                        "metadata": {"code": code, "theme": theme},
                    }
                    project["sector"] = self.classify_sector(f"{title} {theme}")
                    project["funding_type"] = self.classify_funding_type(
                        f"{title} {theme}"
                    )
                    project["hash"] = self.generate_hash(title, href, code)
                    project["completeness_score"] = self.calculate_completeness_score(
                        project
                    )
                    projects.append(project)

                if progress_callback:
                    progress_callback(page + 1, max_pages, len(projects))
                self.sleep()

            except Exception as e:  # noqa: BLE001
                logger.error(f"GCF scraping error page {page}: {e}")
                break

        return projects