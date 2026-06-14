"""EU scraper — EU International Partnerships funding opportunities.

NOTE: The previously configured URL
``/funding-and-technical-assistance/funding-opportunities_en`` now returns
HTTP 404 (the page was moved or removed). EU calls for proposals largely
live on the central EU Funding and Tenders Portal, which is a JavaScript
single-page app and is not scrapable with plain requests + BeautifulSoup.

Until a stable source URL is confirmed and its HTML structure is inspected,
this scraper logs the situation and returns no results instead of producing
garbage data.
"""

import logging

import requests

from .base import BaseScraper

logger = logging.getLogger(__name__)


class EUGlobalGatewayScraper(BaseScraper):
    SOURCE_NAME = "EU"
    BASE_URL = (
        "https://international-partnerships.ec.europa.eu/"
        "funding-and-technical-assistance/funding-opportunities_en"
    )

    def scrape(self, max_pages=5, progress_callback=None):
        try:
            resp = requests.get(self.BASE_URL, headers=self.headers, timeout=30)
            if resp.status_code == 404:
                logger.warning(
                    "EU scraper: source URL returns 404 (page moved/removed). "
                    "A new source URL must be configured before this scraper "
                    "can return results."
                )
            else:
                logger.warning(
                    "EU scraper: source reachable (status %s) but no confirmed "
                    "HTML structure to parse yet. Skipping.",
                    resp.status_code,
                )
        except Exception as e:  # noqa: BLE001
            logger.error(f"EU scraper error: {e}")

        if progress_callback:
            progress_callback(1, 1, 0)
        return []