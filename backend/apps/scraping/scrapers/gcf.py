"""GCF scraper — Green Climate Fund approved projects.

The projects list is server-rendered (Drupal). Each project is a
``div.card-project``; the project code lives in ``h5.card-title`` and the
full (untruncated) title is in the ``title`` attribute of the
``.card-project__title`` paragraph (the visible text is CSS-clamped).
Pagination is ``?page=N`` (0-indexed; page 0 = base URL).

GCF has no Mauritania-only facet on this listing page, so every project's
country list is checked against is_mauritania_project() and non-Mauritania
projects are skipped. Runs until the source returns an empty page.
"""

import logging

import requests
from bs4 import BeautifulSoup

from .base import BaseScraper

logger = logging.getLogger(__name__)


class GCFScraper(BaseScraper):
    SOURCE_NAME = "GCF"
    BASE_URL = "https://www.greenclimate.fund/projects"

    def scrape(self, progress_callback=None):
        projects = []
        page = 0
        while page < self.safety_max_pages:
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

                    # Mauritania-only filter — GCF lists projects from every
                    # country on this page, no facet to pre-filter with.
                    if not self.keep_if_mauritania(country, title):
                        continue

                    theme_el = card.select_one(".card-project__target .badge")
                    theme = theme_el.get_text(strip=True) if theme_el else ""

                    project = {
                        "title": title,
                        "url": href,
                        "source": "GCF",
                        "description": " — ".join(
                            [p for p in (code, theme) if p]
                        ),
                        "country": "Mauritania",
                        "city": self.extract_city(title, theme),
                        "currency": "USD",
                        "metadata": {"code": code, "theme": theme, "raw_country": country},
                    }
                    project["sector"] = self.classify_sector(f"{title} {theme}")
                    project["funding_type"] = self.classify_funding_type(
                        f"{title} {theme}"
                    )
                    project["hash"] = self.generate_hash(title, href, code)
                    project["completeness_score"] = self.calculate_completeness_score(
                        project
                    )

                    if not self.has_financed_amount_and_active_deadline(project):
                        continue

                    projects.append(project)

                if progress_callback:
                    progress_callback(page + 1, None, len(projects))
                self.sleep()
                page += 1

            except Exception as e:  # noqa: BLE001
                logger.error(f"GCF scraping error page {page}: {e}")
                break

        return projects