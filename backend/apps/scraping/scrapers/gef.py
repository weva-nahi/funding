"""GEF scraper — Global Environment Facility project database.

The projects table is fully server-rendered, so no browser automation is
needed. Filtered to Mauritania national projects via the site's facet
(project_country_national:105). The facet does the heavy lifting, but we
defensively re-check is_mauritania_project() in case the facet ever returns
stray non-Mauritania rows (some funder sites leak regional/multi-country
projects into a single-country facet).

Runs until the source returns an empty page — no max_pages cap. Only
projects with BOTH a financed grant amount AND an active (non-expired)
deadline are kept, per product requirements; GEF doesn't expose hard
application deadlines for most projects, so the deadline check effectively
only screens out the (rare) rows that do specify one and it has passed.

On 403 responses the scraper rotates the User-Agent and retries once before
giving up on that page, since GEF uses lightweight bot detection.
"""

import logging
import time

import requests
from bs4 import BeautifulSoup

from .base import BaseScraper

logger = logging.getLogger(__name__)


class GEFScraper(BaseScraper):
    SOURCE_NAME = "GEF"
    BASE_URL = "https://www.thegef.org/projects-operations/database"
    DETAIL_BASE = "https://www.thegef.org"
    COUNTRY_FACET_ID = 105  # Mauritania facet on thegef.org

    def _get_page(self, url, params):
        """GET with one UA-rotation retry on 403."""
        for attempt in range(2):
            try:
                resp = requests.get(url, params=params, headers=self.headers, timeout=40)
                if resp.status_code == 403 and attempt == 0:
                    logger.info("GEF: received 403, rotating User-Agent and retrying.")
                    self.rotate_user_agent()
                    time.sleep(3)
                    continue
                resp.raise_for_status()
                return resp
            except requests.HTTPError as exc:
                if attempt == 0 and getattr(exc.response, "status_code", None) == 403:
                    logger.info("GEF: 403 on attempt %s, rotating UA.", attempt + 1)
                    self.rotate_user_agent()
                    time.sleep(3)
                    continue
                raise
        return None

    def scrape(self, progress_callback=None):
        projects = []
        page = 0
        while page < self.safety_max_pages:
            params = {"f[0]": f"project_country_national:{self.COUNTRY_FACET_ID}"}
            if page > 0:
                params["page"] = page

            try:
                resp = self._get_page(self.BASE_URL, params)
                if resp is None:
                    logger.warning("GEF: giving up on page %s after 403 retries.", page)
                    break

                soup = BeautifulSoup(resp.content, "html.parser")
                table = soup.select_one("table.views-view-table")
                if not table:
                    logger.info(f"GEF: no results table on page {page}, stopping.")
                    break

                rows = table.select("tbody tr")
                if not rows:
                    break

                page_kept = 0
                for row in rows:
                    cells = row.find_all("td")
                    if len(cells) < 9:
                        continue

                    title_cell = cells[0]
                    link_tag = title_cell.find("a")
                    title = (
                        link_tag.get_text(strip=True)
                        if link_tag
                        else title_cell.get_text(strip=True)
                    )
                    if not title:
                        continue

                    href = link_tag.get("href", "") if link_tag else ""
                    if href and not href.startswith("http"):
                        href = f"{self.DETAIL_BASE}{href}"

                    gef_id = cells[1].get_text(strip=True)
                    countries = cells[2].get_text(strip=True)
                    focal_area = cells[3].get_text(strip=True)
                    project_type = cells[4].get_text(strip=True)
                    agencies = cells[5].get_text(strip=True)
                    grant = self.parse_amount(cells[6].get_text(strip=True))
                    cofinancing = self.parse_amount(cells[7].get_text(strip=True))
                    status = cells[8].get_text(strip=True)

                    # Defensive re-check — facet should already guarantee this.
                    if not self.keep_if_mauritania(countries, title):
                        continue

                    project = {
                        "title": title,
                        "url": href,
                        "source": "GEF",
                        "description": (
                            f"Focal area: {focal_area or 'N/A'}. "
                            f"Type: {project_type or 'N/A'}. "
                            f"Agency: {agencies or 'N/A'}. "
                            f"Status: {status or 'N/A'}."
                        ),
                        "country": "Mauritania",
                        "city": self.extract_city(title, focal_area),
                        "amount": grant,
                        "currency": "USD",
                        "metadata": {
                            "gef_id": gef_id,
                            "focal_area": focal_area,
                            "project_type": project_type,
                            "agencies": agencies,
                            "cofinancing": cofinancing,
                            "status": status,
                        },
                    }
                    project["sector"] = self.classify_sector(f"{focal_area} {title}")
                    project["funding_type"] = self.classify_funding_type(f"{title} {focal_area}")
                    project["hash"] = self.generate_hash(title, href, gef_id)
                    project["completeness_score"] = self.calculate_completeness_score(project)

                    if not self.has_financed_amount_and_active_deadline(project):
                        continue

                    projects.append(project)
                    page_kept += 1

                if progress_callback:
                    progress_callback(page + 1, None, len(projects))
                self.sleep()
                page += 1

            except Exception as e:  # noqa: BLE001
                logger.error(f"GEF scraping error page {page}: {e}")
                break

        return projects