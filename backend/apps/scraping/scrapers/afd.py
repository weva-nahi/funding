"""AFD scraper — Agence Française de Développement funded projects.

AFD uses the French government DSFR design system. Project cards are
``div.fr-card``; title/link are in ``.fr-card__title a.fr-card__link``, and
details (country, amount, period) are in ``.fr-card__detail`` paragraphs
whose icon class identifies the field. Amount formatting is inconsistent
(e.g. "€ 7 000 000" vs "€ 16,000,000"), so all non-digits are stripped.

AFD's project list isn't pre-filterable by country via URL params on this
listing, so every card's extracted country text is checked with
is_mauritania_project() and non-Mauritania cards are skipped. Runs until
the source returns an empty page.
"""

import logging
import re

import requests
from bs4 import BeautifulSoup

from .base import BaseScraper

logger = logging.getLogger(__name__)


class AFDScraper(BaseScraper):
    SOURCE_NAME = "AFD"
    BASE_URL = "https://www.afd.fr/en/projects/list"

    def scrape(self, progress_callback=None):
        projects = []
        page = 0
        while page < self.safety_max_pages:
            url = self.BASE_URL if page == 0 else f"{self.BASE_URL}?page={page}"
            try:
                resp = requests.get(url, headers=self.headers, timeout=30)
                resp.raise_for_status()
                soup = BeautifulSoup(resp.content, "html.parser")

                cards = soup.select("div.fr-card")
                if not cards:
                    logger.info(f"AFD: no cards on page {page}, stopping.")
                    break

                page_count = 0
                for card in cards:
                    title_link = card.select_one(
                        ".fr-card__title a.fr-card__link"
                    ) or card.select_one(".fr-card__title a")
                    if not title_link:
                        continue

                    title = title_link.get_text(strip=True)
                    href = title_link.get("href", "")
                    if href and not href.startswith("http"):
                        href = f"https://www.afd.fr{href}"

                    if "/projects/" not in href and "/projet" not in href:
                        continue
                    if not title:
                        continue

                    tags = [
                        t.get_text(strip=True)
                        for t in card.select(".fr-tags-group .fr-tag")
                    ]
                    tags = [t for t in tags if t]

                    status_el = card.select_one(".fr-badge")
                    status = status_el.get_text(strip=True) if status_el else ""

                    country, amount, period = "", None, ""
                    for detail in card.select(".fr-card__detail"):
                        text = detail.get_text(" ", strip=True)
                        cls = " ".join(detail.get("class", []))
                        if "map-pin" in cls:
                            country = text
                        elif "money-euro" in cls or "financing amount" in text.lower():
                            amount = self.parse_amount(text)
                        elif re.search(r"\d{4}\s*-\s*\d{4}", text):
                            period = text

                    # Mauritania-only filter.
                    if not self.keep_if_mauritania(country, title, " ".join(tags)):
                        page_count += 1  # still counts as a "real" card seen
                        continue

                    project = {
                        "title": title,
                        "url": href,
                        "source": "AFD",
                        "description": ", ".join(tags)
                        + (f" ({status})" if status else ""),
                        "country": "Mauritania",
                        "city": self.extract_city(title, country, " ".join(tags)),
                        "amount": amount,
                        "currency": "EUR",
                        "metadata": {
                            "tags": tags,
                            "status": status,
                            "period": period,
                            "raw_country": country,
                        },
                    }
                    project["sector"] = self.classify_sector(
                        f"{title} {' '.join(tags)}"
                    )
                    project["funding_type"] = self.classify_funding_type(
                        f"{title} {' '.join(tags)}"
                    )
                    project["hash"] = self.generate_hash(title, href, amount or "")
                    project["completeness_score"] = self.calculate_completeness_score(
                        project
                    )

                    if not self.has_financed_amount_and_active_deadline(project):
                        page_count += 1
                        continue

                    projects.append(project)
                    page_count += 1

                if progress_callback:
                    progress_callback(page + 1, None, len(projects))
                if page_count == 0:
                    break
                self.sleep()
                page += 1

            except Exception as e:  # noqa: BLE001
                logger.error(f"AFD scraping error page {page}: {e}")
                break

        return projects