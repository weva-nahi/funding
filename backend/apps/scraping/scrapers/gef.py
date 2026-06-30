"""GEF scraper — Global Environment Facility.

Scrapes the live GEF project database (Selenium, since results render via
JS and pagination is click-based), filtered server-side to Mauritania via
the country facet (f[0]=project_country_national:105). No fallback data —
if the scrape fails, returns [].
"""

import logging

from bs4 import BeautifulSoup
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


class GEFScraper(BaseScraper):
    SOURCE_NAME = "GEF"
    BASE_URL = (
        "https://www.thegef.org/projects-operations/database"
        "?f%5B0%5D=project_country_national%3A105"
    )

    def scrape(self, progress_callback=None):
        projects = []
        try:
            self.setup_driver(headless=True)
            self.driver.get(self.BASE_URL)

            try:
                WebDriverWait(self.driver, 30).until(
                    EC.presence_of_element_located(
                        (By.CSS_SELECTOR, "table.views-table, .view-content")
                    )
                )
            except TimeoutException:
                logger.error("GEF: table did not load in time.")
                return []

            page_num = 1
            while page_num <= self.safety_max_pages:
                page_projects = self._extract_projects_from_page()
                if not page_projects:
                    logger.info("GEF: no rows found on page %s, stopping.", page_num)
                    break

                for basic in page_projects:
                    enriched = self._enrich_project_details(basic)
                    if self.has_financed_amount_and_active_deadline(enriched):
                        projects.append(enriched)

                if progress_callback:
                    progress_callback(page_num, None, len(projects))

                if not self._navigate_to_next_page():
                    break

                page_num += 1
                self.sleep()

        except Exception as e:
            logger.error("GEF scraping error: %s", e)
        finally:
            self.cleanup_driver()

        logger.info("GEF: scraped %s projects.", len(projects))
        return projects

    def _extract_projects_from_page(self):
        soup = BeautifulSoup(self.driver.page_source, "html.parser")
        table = soup.find("table", class_="views-table")
        if not table:
            return []
        tbody = table.find("tbody")
        if not tbody:
            return []

        projects = []
        for row in tbody.find_all("tr"):
            cells = row.find_all("td")
            if len(cells) < 9:
                continue

            title_cell = cells[0]
            title_link = title_cell.find("a")
            titre = self.clean_text(
                title_link.get_text() if title_link else title_cell.get_text()
            )
            if not titre or len(titre) < 5:
                continue

            lien_projet = ""
            if title_link and title_link.get("href"):
                from urllib.parse import urljoin
                lien_projet = urljoin("https://www.thegef.org", title_link["href"])

            country_text = self.clean_text(cells[2].get_text())
            focal_area = self.clean_text(cells[3].get_text())
            amount = self.parse_amount(self.clean_text(cells[7].get_text()))

            project = {
                "title": titre,
                "url": lien_projet,
                "source": "GEF",
                "description": f"GEF project in {focal_area}. Country: {country_text}.",
                "country": "Mauritania",
                "city": self.extract_city(titre, focal_area),
                "amount": amount,
                "currency": "USD",
                "funding_type": self.classify_funding_type(f"{titre} {focal_area}"),
                "sector": self.classify_sector(f"{focal_area} {titre}"),
                "metadata": {
                    "gef_project_id": self.clean_text(cells[1].get_text()),
                    "focal_area": focal_area,
                    "statut": self.clean_text(cells[8].get_text()),
                },
            }
            projects.append(project)

        return projects

    def _enrich_project_details(self, project):
        if not project.get("url"):
            project["hash"] = self.generate_hash(project["title"], "", project.get("amount") or "")
            project["completeness_score"] = self.calculate_completeness_score(project)
            return project

        try:
            self.driver.execute_script("window.open('');")
            self.driver.switch_to.window(self.driver.window_handles[-1])
            self.driver.get(project["url"])
            WebDriverWait(self.driver, 15).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, ".field, .project-details"))
            )
            soup = BeautifulSoup(self.driver.page_source, "html.parser")

            for selector in (
                ".field--name-body .field__item",
                ".field--name-field-summary .field__item",
                ".project-summary",
            ):
                desc_elem = soup.select_one(selector)
                if desc_elem:
                    text = self.clean_text(desc_elem.get_text())
                    if text:
                        project["description"] = text
                        break

            doc_section = soup.find("div", class_="field--name-field-document-url")
            if doc_section:
                doc_urls = [a["href"] for a in doc_section.find_all("a", href=True)]
                if doc_urls:
                    project["metadata"]["document_url"] = doc_urls[0]

            self.driver.close()
            self.driver.switch_to.window(self.driver.window_handles[0])
        except Exception as e:
            logger.warning("GEF: detail enrich failed for %s: %s", project.get("url"), e)
            try:
                if len(self.driver.window_handles) > 1:
                    self.driver.close()
                    self.driver.switch_to.window(self.driver.window_handles[0])
            except Exception:
                pass

        project["hash"] = self.generate_hash(project["title"], project["url"], project.get("amount") or "")
        project["completeness_score"] = self.calculate_completeness_score(project)
        return project

    def _navigate_to_next_page(self):
        next_selectors = [
            "//a[contains(@title, 'Go to next page')]",
            "//a[contains(@rel, 'next')]",
            "//a[contains(@aria-label, 'Next')]",
            "//li[contains(@class,'page-item')]/a[contains(text(),'\u203a\u203a')]",
        ]
        for selector in next_selectors:
            try:
                next_link = self.driver.find_element(By.XPATH, selector)
                if next_link.is_displayed() and next_link.is_enabled():
                    self.driver.execute_script(
                        "arguments[0].scrollIntoView({block: 'center'});", next_link
                    )
                    self.driver.execute_script("arguments[0].click();", next_link)
                    WebDriverWait(self.driver, 15).until(
                        EC.presence_of_element_located(
                            (By.CSS_SELECTOR, "table.views-table tbody tr")
                        )
                    )
                    return True
            except (NoSuchElementException, ElementClickInterceptedException, TimeoutException):
                continue
            except Exception:
                continue
        return False