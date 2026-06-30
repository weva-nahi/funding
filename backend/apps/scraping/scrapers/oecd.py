"""OECD scraper — Selenium-based search portal, paginated by click."""

import logging

from selenium.common.exceptions import (
    ElementClickInterceptedException,
    NoSuchElementException,
    TimeoutException,
)
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from .base import BaseScraper

logger = logging.getLogger(__name__)


class OECDScraper(BaseScraper):
    SOURCE_NAME = "OECD"
    BASE_URL = (
        "https://www.oecd.org/en/search.html"
        "?orderBy=mostRelevant&page=0&facetTags=oecd-countries%3Amrt"
    )

    def scrape(self, progress_callback=None):
        projects = []
        try:
            self.setup_driver(headless=True)
            self.driver.get(self.BASE_URL)

            try:
                WebDriverWait(self.driver, 20).until(
                    EC.presence_of_all_elements_located(
                        (By.CSS_SELECTOR, "article.search-result-list-item")
                    )
                )
            except TimeoutException:
                logger.error("OECD: no results loaded.")
                return []

            page_num = 0
            while page_num < self.safety_max_pages:
                page_projects = self._extract_from_page()
                if not page_projects:
                    break
                projects.extend(page_projects)

                if progress_callback:
                    progress_callback(page_num + 1, None, len(projects))

                if not self._navigate_to_next_page():
                    break

                page_num += 1
                self.sleep()

        except Exception as e:
            logger.error("OECD scraping error: %s", e)
        finally:
            self.cleanup_driver()

        logger.info("OECD: scraped %s projects.", len(projects))
        return projects

    def _extract_from_page(self):
        articles = self.driver.find_elements(By.CSS_SELECTOR, "article.search-result-list-item")
        projects = []
        for article in articles:
            try:
                title_elem = article.find_element(
                    By.CSS_SELECTOR, "div.search-result-list-item__title a"
                )
            except NoSuchElementException:
                continue

            title = self.clean_text(title_elem.text)
            if not title or len(title) < 5:
                continue
            link = title_elem.get_attribute("href")

            try:
                tag = self.clean_text(
                    article.find_element(By.CSS_SELECTOR, "span.search-result-list-item__tag").text
                )
            except NoSuchElementException:
                tag = "Document OECD"

            try:
                description = self.clean_text(
                    article.find_element(By.CSS_SELECTOR, "p.search-result-list-item__snippet").text
                )
            except NoSuchElementException:
                description = ""

            project = {
                "title": title,
                "url": link,
                "source": "OECD",
                "description": description or f"OECD document: {title}",
                "country": "Mauritania",
                "city": self.extract_city(title, description),
                "amount": None,
                "currency": "USD",
                "funding_type": self.classify_funding_type(f"{title} {description}"),
                "sector": self.classify_sector(f"{title} {description}"),
                "metadata": {"tag": tag},
            }
            project["hash"] = self.generate_hash(title, link or "", "")
            project["completeness_score"] = self.calculate_completeness_score(project)

            if self.has_financed_amount_and_active_deadline(project):
                projects.append(project)

        return projects

    def _navigate_to_next_page(self):
        try:
            next_btn = self.driver.find_element(
                By.CSS_SELECTOR, "li.cmp-pagination__next a[aria-disabled='false']"
            )
            self.driver.execute_script("arguments[0].scrollIntoView(true);", next_btn)
            next_btn.click()
            WebDriverWait(self.driver, 20).until(
                EC.presence_of_all_elements_located(
                    (By.CSS_SELECTOR, "article.search-result-list-item")
                )
            )
            return True
        except (NoSuchElementException, ElementClickInterceptedException, TimeoutException):
            return False