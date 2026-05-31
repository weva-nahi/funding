"""GEF scraper — Global Environment Facility."""

import logging

from bs4 import BeautifulSoup
from django.conf import settings
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from .base import BaseScraper

logger = logging.getLogger(__name__)


class GEFScraper(BaseScraper):
    SOURCE_NAME = "GEF"
    BASE_URL = "https://www.thegef.org/projects-operations/database"

    def _setup_driver(self):
        options = Options()
        options.add_argument("--headless")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.binary_location = getattr(settings, "CHROME_BINARY_PATH", "/usr/bin/chromium")
        service = Service(getattr(settings, "CHROMEDRIVER_PATH", "/usr/bin/chromedriver"))
        return webdriver.Chrome(service=service, options=options)

    def scrape(self, max_pages=5, progress_callback=None):
        driver = self._setup_driver()
        projects = []

        try:
            driver.get(self.BASE_URL)
            WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, "table")))

            for page in range(max_pages):
                soup = BeautifulSoup(driver.page_source, "html.parser")
                rows = soup.select("table tbody tr")

                for row in rows:
                    cells = row.find_all("td")
                    if len(cells) < 3:
                        continue

                    title = cells[0].get_text(strip=True)
                    link_tag = cells[0].find("a")
                    url = f"https://www.thegef.org{link_tag['href']}" if link_tag and link_tag.get("href") else ""

                    project = {
                        "title": title,
                        "url": url,
                        "source": "GEF",
                        "description": cells[1].get_text(strip=True) if len(cells) > 1 else "",
                        "country": cells[2].get_text(strip=True) if len(cells) > 2 else "",
                    }

                    project["sector"] = self.classify_sector(project["description"])
                    project["funding_type"] = self.classify_funding_type(project["description"])
                    project["hash"] = self.generate_hash(title, url, "")
                    project["completeness_score"] = self.calculate_completeness_score(project)
                    projects.append(project)

                if progress_callback:
                    progress_callback(page + 1, max_pages, len(projects))

                # Try next page
                try:
                    next_btn = driver.find_element(By.CSS_SELECTOR, "a.page-link.next")
                    next_btn.click()
                    self.sleep()
                except Exception:
                    break

        except Exception as e:
            logger.error(f"GEF scraping error: {e}")
        finally:
            driver.quit()

        return projects
