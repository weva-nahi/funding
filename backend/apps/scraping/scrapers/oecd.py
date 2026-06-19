"""OECD scraper — OECD global search, filtered to Mauritania."""

import logging

from bs4 import BeautifulSoup
from django.conf import settings

from .base import BaseScraper

logger = logging.getLogger(__name__)


class OECDScraper(BaseScraper):
    SOURCE_NAME = "OECD"
    BASE_URL = "https://www.oecd.org/en/search.html"
    COUNTRY_FACET = "oecd-countries:mrt"

    def _setup_driver(self):
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options
        from selenium.webdriver.chrome.service import Service

        options = Options()
        options.add_argument("--headless=new")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument(f"--user-agent={self.headers['User-Agent']}")
        options.binary_location = getattr(
            settings, "CHROME_BINARY_PATH", "/usr/bin/chromium"
        )
        service = Service(
            getattr(settings, "CHROMEDRIVER_PATH", "/usr/bin/chromedriver")
        )
        return webdriver.Chrome(service=service, options=options)

    def scrape(self, max_pages=5, progress_callback=None):
        try:
            from selenium.webdriver.common.by import By
            from selenium.webdriver.support import expected_conditions as EC
            from selenium.webdriver.support.ui import WebDriverWait
        except Exception as e:  # noqa: BLE001
            logger.error(f"OECD scraper: Selenium unavailable ({e}). Skipping.")
            if progress_callback:
                progress_callback(1, 1, 0)
            return []

        projects = []
        driver = None
        try:
            driver = self._setup_driver()
            for page in range(max_pages):
                params = f"?orderBy=mostRelevant&page={page}"
                if self.COUNTRY_FACET:
                    params += f"&facetTags={self.COUNTRY_FACET}"
                url = f"{self.BASE_URL}{params}"

                try:
                    driver.get(url)
                    # Increased from 20s to 45s — OECD can be slow.
                    WebDriverWait(driver, 45).until(
                        EC.presence_of_element_located(
                            (By.CSS_SELECTOR, "article.search-result-list-item")
                        )
                    )
                except Exception:  # noqa: BLE001
                    logger.info(
                        f"OECD: no results rendered on page {page}, stopping."
                    )
                    break

                soup = BeautifulSoup(driver.page_source, "html.parser")
                items = soup.select("article.search-result-list-item")
                if not items:
                    break

                for item in items:
                    link = item.select_one(".search-result-list-item__title a")
                    if not link:
                        continue
                    title = link.get_text(strip=True)
                    href = link.get("href", "")
                    if not title or not href:
                        continue
                    if not href.startswith("http"):
                        href = f"https://www.oecd.org{href}"

                    content_type = ""
                    date_text = ""
                    meta = item.select_one(".search-result-list-item__meta")
                    if meta:
                        tag = meta.select_one(".search-result-list-item__tag")
                        content_type = tag.get_text(strip=True) if tag else ""
                        date_el = meta.select_one(".search-result-list-item__date")
                        date_text = date_el.get_text(strip=True) if date_el else ""

                    snippet_el = item.select_one(".search-result-list-item__snippet")
                    snippet = (
                        snippet_el.get_text(" ", strip=True) if snippet_el else ""
                    )

                    project = {
                        "title": title,
                        "url": href,
                        "source": "OECD",
                        "description": snippet[:1500],
                        "country": "Mauritania" if self.COUNTRY_FACET else "",
                        "currency": "USD",
                        "metadata": {
                            "content_type": content_type,
                            "date": date_text,
                        },
                    }
                    project["sector"] = self.classify_sector(f"{title} {snippet}")
                    project["funding_type"] = self.classify_funding_type(f"{title} {snippet}")
                    project["hash"] = self.generate_hash(title, href, "")
                    project["completeness_score"] = self.calculate_completeness_score(project)
                    projects.append(project)

                if progress_callback:
                    progress_callback(page + 1, max_pages, len(projects))
                self.sleep()

        except Exception as e:  # noqa: BLE001
            logger.error(f"OECD scraping error: {e}")
        finally:
            if driver:
                try:
                    driver.quit()
                except Exception:  # noqa: BLE001
                    pass

        return projects