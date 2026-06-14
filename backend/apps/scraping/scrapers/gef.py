"""GEF scraper — Global Environment Facility project database.

The projects table is fully server-rendered, so no browser automation is
needed. Filtered to Mauritania national projects by default via the site's
facet (project_country_national:105).
"""

import logging

import requests
from bs4 import BeautifulSoup

from .base import BaseScraper

logger = logging.getLogger(__name__)


class GEFScraper(BaseScraper):
    SOURCE_NAME = "GEF"
    BASE_URL = "https://www.thegef.org/projects-operations/database"
    DETAIL_BASE = "https://www.thegef.org"
    # Mauritania national-projects facet id. Set to None to scrape all projects.
    COUNTRY_FACET_ID = 105

    def scrape(self, max_pages=5, progress_callback=None):
        projects = []
        for page in range(max_pages):
            params = {}
            if self.COUNTRY_FACET_ID is not None:
                params["f[0]"] = f"project_country_national:{self.COUNTRY_FACET_ID}"
            if page > 0:
                params["page"] = page

            try:
                resp = requests.get(
                    self.BASE_URL, params=params, headers=self.headers, timeout=40
                )
                resp.raise_for_status()
                soup = BeautifulSoup(resp.content, "html.parser")

                table = soup.select_one("table.views-view-table")
                if not table:
                    logger.info(f"GEF: no results table on page {page}, stopping.")
                    break

                rows = table.select("tbody tr")
                if not rows:
                    break

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
                        "country": countries,
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
                    project["funding_type"] = self.classify_funding_type(
                        f"{title} {focal_area}"
                    )
                    project["hash"] = self.generate_hash(title, href, gef_id)
                    project["completeness_score"] = self.calculate_completeness_score(project)
                    projects.append(project)

                if progress_callback:
                    progress_callback(page + 1, max_pages, len(projects))
                self.sleep()

            except Exception as e:  # noqa: BLE001
                logger.error(f"GEF scraping error page {page}: {e}")
                break

        return projects