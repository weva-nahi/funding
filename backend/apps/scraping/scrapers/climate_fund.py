"""Climate Funds Update scraper.

NOTE: ``/data-dashboard/`` renders its data through embedded Tableau
visualizations (iframes), not as HTML cards or tables — there is nothing
to scrape from the DOM. The underlying data is published once a year as an
Excel workbook (the link and year change annually), and it consists of
aggregate fund-level statistics (pledges, deposits, approvals) — not
individual funding opportunities that a company can apply to.

This source does not fit the per-opportunity model. The scraper is a safe
no-op. If you want CFU fund-level data ingested, use the existing Excel
import flow rather than this scraper.
"""

import logging

from .base import BaseScraper

logger = logging.getLogger(__name__)


class ClimateFundScraper(BaseScraper):
    SOURCE_NAME = "CLIMATE_FUND"
    BASE_URL = "https://climatefundsupdate.org/data-dashboard/"

    def scrape(self, progress_callback=None):
        logger.warning(
            "Climate Funds Update: dashboard is a Tableau embed with no "
            "scrapable per-opportunity data. Skipping. Use an Excel import "
            "flow for CFU fund-level statistics instead."
        )
        if progress_callback:
            progress_callback(1, None, 0)
        return []