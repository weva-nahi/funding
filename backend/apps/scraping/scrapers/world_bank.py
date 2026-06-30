"""World Bank scraper — official JSON API, Mauritania only (countrycode MR)."""

import logging
import time

import requests

from .base import BaseScraper

logger = logging.getLogger(__name__)


class WorldBankScraper(BaseScraper):
    SOURCE_NAME = "WORLD_BANK"
    API_URL = "https://search.worldbank.org/api/v3/projects"
    DETAIL_URL = "https://projects.worldbank.org/en/projects-operations/project-detail/{pid}"
    ROWS_PER_PAGE = 30
    COUNTRY_CODE = "MR"

    def scrape(self, progress_callback=None):
        projects = []
        page = 0

        while page < self.safety_max_pages:
            offset = page * self.ROWS_PER_PAGE
            params = {
                "format": "json",
                "fl": (
                    "id,project_name,totalamt,closingdate,countrycode,"
                    "countryshortname,pdo,project_abstract,boardapprovaldate,url,sector1,lendinginstr"
                ),
                "rows": self.ROWS_PER_PAGE,
                "os": offset,
                "countrycode_exact": self.COUNTRY_CODE,
            }

            payload = self._get_with_retry(params)
            if payload is None:
                break

            rows = payload.get("projects") or {}
            if not rows:
                logger.info("World Bank: no more results on page %s.", page)
                break

            for pid, item in rows.items():
                title = (item.get("project_name") or "").strip()
                if not title:
                    continue

                url = item.get("url") or self.DETAIL_URL.format(pid=pid)
                amount = self.parse_amount(item.get("totalamt"))
                description = (item.get("pdo") or item.get("project_abstract") or "").strip()[:2000]
                country = (item.get("countryshortname") or "Mauritania").strip()
                sector1 = item.get("sector1", {})
                sector_name = sector1.get("Name", "") if isinstance(sector1, dict) else str(sector1)
                lending_instr = item.get("lendinginstr", "")

                if not self.keep_if_mauritania(country, title):
                    continue

                closing_date = self.parse_date(item.get("closingdate"))
                funding_type = "grant"
                if lending_instr:
                    li_lower = lending_instr.lower()
                    if "investment" in li_lower or "loan" in li_lower:
                        funding_type = "concessional"
                    elif "grant" in li_lower:
                        funding_type = "grant"

                project = {
                    "title": title,
                    "url": url,
                    "source": "WORLD_BANK",
                    "description": description or f"World Bank project in Mauritania: {title}",
                    "country": "Mauritania",
                    "city": self.extract_city(title, description),
                    "amount": amount,
                    "currency": "USD",
                    "deadline": closing_date,
                    "sector": self.classify_sector(f"{title} {description} {sector_name}"),
                    "funding_type": funding_type,
                    "eligibility_criteria": "Contact World Bank for eligibility details.",
                    "metadata": {
                        "project_id": pid,
                        "closing_date": closing_date,
                        "board_approval_date": self.parse_date(item.get("boardapprovaldate")),
                        "sector": sector_name,
                        "lending_instrument": lending_instr,
                    },
                }
                project["hash"] = self.generate_hash(title, url, pid)
                project["completeness_score"] = self.calculate_completeness_score(project)

                if self.has_financed_amount_and_active_deadline(project):
                    projects.append(project)

            if progress_callback:
                progress_callback(page + 1, None, len(projects))

            total = int(payload.get("total", 0) or 0)
            if offset + self.ROWS_PER_PAGE >= total:
                logger.info("World Bank: reached end at page %s.", page)
                break

            self.sleep()
            page += 1

        logger.info("World Bank scraping done: %s projects.", len(projects))
        return projects

    def _get_with_retry(self, params, attempts=3):
        delay = 2
        for attempt in range(1, attempts + 1):
            try:
                resp = requests.get(self.API_URL, params=params, headers=self.headers, timeout=30)
                resp.raise_for_status()
                return resp.json()
            except Exception as exc:
                logger.warning("World Bank API attempt %s/%s failed: %s", attempt, attempts, exc)
                if attempt == attempts:
                    logger.error("World Bank API giving up after %s attempts.", attempts)
                    return None
                time.sleep(delay)
                delay *= 2
        return None