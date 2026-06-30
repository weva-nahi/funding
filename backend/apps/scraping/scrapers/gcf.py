"""GCF scraper — Green Climate Fund.

Plain HTTP (requests + BeautifulSoup) — the country page is server-rendered
HTML, no JS required. Pagination via ?page=N. No fallback data.
"""

import logging
import re
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

from .base import BaseScraper

logger = logging.getLogger(__name__)


class GCFScraper(BaseScraper):
    SOURCE_NAME = "GCF"
    BASE_DOMAIN = "https://www.greenclimate.fund"
    COUNTRY_URL = "https://www.greenclimate.fund/countries/mauritania"

    def __init__(self, delay=1.5):
        super().__init__(delay=delay)
        self.session = requests.Session()
        self.session.headers.update(self.headers)

    def scrape(self, progress_callback=None):
        projects = []
        try:
            listings = self._get_all_pages_projects()
            if not listings:
                logger.warning("GCF: no project listings found.")
                return []

            for i, basic in enumerate(listings):
                details = self._extract_project_details(basic["url"]) if basic.get("url") else {}
                project = {**basic, **details}

                project["hash"] = self.generate_hash(
                    project["title"], project.get("url", ""), project.get("amount") or ""
                )
                project["completeness_score"] = self.calculate_completeness_score(project)

                if self.has_financed_amount_and_active_deadline(project):
                    projects.append(project)

                if progress_callback:
                    progress_callback(1, None, len(projects))

                self.sleep()

        except Exception as e:
            logger.error("GCF scraping error: %s", e)

        logger.info("GCF: scraped %s projects.", len(projects))
        return projects

    def _get_page(self, url):
        try:
            resp = self.session.get(url, timeout=30)
            resp.raise_for_status()
            return BeautifulSoup(resp.content, "html.parser")
        except requests.RequestException as e:
            logger.warning("GCF: request failed for %s: %s", url, e)
            return None

    def _get_all_pages_projects(self):
        all_projects = []
        page = 0
        while page < self.safety_max_pages:
            url = self.COUNTRY_URL if page == 0 else f"{self.COUNTRY_URL}?page={page}"
            soup = self._get_page(url)
            if not soup:
                break

            page_projects = self._extract_from_table(soup)
            if not page_projects:
                break
            all_projects.extend(page_projects)

            pagination = soup.find("ul", class_="pager")
            if pagination:
                next_link = pagination.find("a", title=re.compile(r"Go to next page", re.I))
                if not next_link:
                    break
            else:
                break

            page += 1

        return all_projects

    def _extract_from_table(self, soup):
        projects = []
        table = (
            soup.find("table", class_="table")
            or soup.find("table", class_=["views-table", "sticky-enabled"])
            or soup.find("table")
        )
        if not table:
            return projects

        tbody = table.find("tbody")
        rows = tbody.find_all("tr") if tbody else table.find_all("tr")[1:]

        for row in rows:
            cells = row.find_all("td")
            if len(cells) < 2:
                continue

            title_cell = cells[0]
            link_elem = title_cell.find("a")
            if not link_elem:
                continue

            title = self.clean_text(link_elem.get_text())
            if not title or len(title) < 5:
                continue

            url = urljoin(self.BASE_DOMAIN, link_elem.get("href", ""))
            doc_type = self.clean_text(cells[1].get_text()) if len(cells) > 1 else ""

            organisation = ""
            for badge in title_cell.find_all("span", class_="badge"):
                badge_text = self.clean_text(badge.get_text())
                if badge_text and not badge_text.startswith("FP"):
                    organisation = badge_text
                    break

            projects.append({
                "title": title,
                "url": url,
                "source": "GCF",
                "description": f"GCF funded project: {title}",
                "country": "Mauritania",
                "city": self.extract_city(title),
                "amount": None,
                "currency": "USD",
                "funding_type": self.classify_funding_type(f"{title} {doc_type}"),
                "sector": self.classify_sector(title),
                "metadata": {"document_type": doc_type, "organisation": organisation},
            })

        return projects

    def _extract_project_details(self, url):
        soup = self._get_page(url)
        if not soup:
            return {}

        details = {}

        download_link = soup.find("a", class_="btn-primary", href=True)
        if download_link and download_link["href"].endswith(".pdf"):
            details.setdefault("metadata", {})["document_url"] = download_link["href"]
        else:
            pdf_links = soup.find_all("a", href=re.compile(r"\.pdf$"))
            if pdf_links:
                details.setdefault("metadata", {})["document_url"] = pdf_links[0]["href"]

        desc_elem = soup.find("div", class_="field-name-body")
        if desc_elem:
            p = desc_elem.find("p")
            text = self.clean_text(p.get_text() if p else desc_elem.get_text())
            if text:
                details["description"] = text

        for section in soup.find_all("div", class_="col-md-6"):
            label_elem = section.find("span", class_="node-label")
            strong_elem = section.find("strong")
            if not label_elem or not strong_elem:
                continue
            label = self.clean_text(label_elem.get_text()).lower()
            value = self.clean_text(strong_elem.get_text())
            if "type" in label:
                details["funding_type"] = self.classify_funding_type(value)
            elif "funding" in label or "amount" in label:
                details["amount"] = self.parse_amount(value)

        return details