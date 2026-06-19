"""World Bank scraper — uses the official Projects JSON API.

The projects list page is JavaScript-rendered (that is why the original HTML
scraper returned nothing). The public JSON API at
search.worldbank.org/api/v3/projects accepts ``countrycode_exact=MR`` to
return only Mauritania projects, which is lighter and more reliable than
any HTML scrape would be.
"""

import logging

import requests

from .base import BaseScraper

logger = logging.getLogger(__name__)


class WorldBankScraper(BaseScraper):
    SOURCE_NAME = "WORLD_BANK"
    API_URL = "https://search.worldbank.org/api/v3/projects"
    DETAIL_URL = (
        "https://projects.worldbank.org/en/projects-operations/project-detail/{pid}"
    )
    ROWS_PER_PAGE = 30
    COUNTRY_CODE = "MR"  # Mauritania. Set to None to fetch all countries.

    def scrape(self, max_pages=5, progress_callback=None):
        projects = []
        for page in range(max_pages):
            offset = page * self.ROWS_PER_PAGE
            params = {
                "format": "json",
                "fl": (
                    "id,project_name,totalamt,closingdate,countrycode,"
                    "countryshortname,pdo,project_abstract,boardapprovaldate,url"
                ),
                "rows": self.ROWS_PER_PAGE,
                "os": offset,
            }
            if self.COUNTRY_CODE:
                params["countrycode_exact"] = self.COUNTRY_CODE

            payload = self._get_with_retry(params)
            if payload is None:
                break

            rows = payload.get("projects") or {}
            if not rows:
                break

            for pid, item in rows.items():
                title = (item.get("project_name") or "").strip()
                if not title:
                    continue

                url = item.get("url") or self.DETAIL_URL.format(pid=pid)
                amount = self.parse_amount(item.get("totalamt"))
                description = (
                    item.get("pdo") or item.get("project_abstract") or ""
                ).strip()[:1500]
                country = (item.get("countryshortname") or "Mauritania").strip()

                # Map the closing date into the real `deadline` field so
                # classify_priority() works (it reads opportunity.deadline).
                closing_date = self.parse_date(item.get("closingdate"))

                project = {
                    "title": title,
                    "url": url,
                    "source": "WORLD_BANK",
                    "description": description,
                    "country": country,
                    "amount": amount,
                    "currency": "USD",
                    "deadline": closing_date,
                    "metadata": {
                        "project_id": pid,
                        "closing_date": closing_date,
                        "board_approval_date": self.parse_date(
                            item.get("boardapprovaldate")
                        ),
                    },
                }
                project["sector"] = self.classify_sector(f"{title} {description}")
                project["funding_type"] = self.classify_funding_type(description)
                project["hash"] = self.generate_hash(title, url, pid)
                project["completeness_score"] = self.calculate_completeness_score(
                    project
                )
                projects.append(project)

            if progress_callback:
                progress_callback(page + 1, max_pages, len(projects))

            total = int(payload.get("total", 0) or 0)
            if offset + self.ROWS_PER_PAGE >= total:
                break
            self.sleep()

        return projects

    def _get_with_retry(self, params, attempts=3):
        """GET the API with simple exponential backoff (2s, 4s, 8s).

        The World Bank API returns intermittent 500s; retrying transparently
        smooths those over instead of aborting the whole page.
        """
        import time

        delay = 2
        for attempt in range(1, attempts + 1):
            try:
                resp = requests.get(
                    self.API_URL, params=params, headers=self.headers, timeout=30
                )
                resp.raise_for_status()
                return resp.json()
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "World Bank API attempt %s/%s failed: %s", attempt, attempts, exc
                )
                if attempt == attempts:
                    logger.error("World Bank API giving up after %s attempts.", attempts)
                    return None
                time.sleep(delay)
                delay *= 2
        return None