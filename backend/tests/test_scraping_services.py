"""Tests for scraping services."""

import pytest

from apps.opportunities.models import FundingOpportunity
from apps.scraping.models import ScrapingJob
from apps.scraping.services import classify_priority, save_projects


@pytest.mark.django_db
class TestSaveProjects:
    def _make_job(self):
        return ScrapingJob.objects.create(source="world_bank", status="running")

    def test_creates_new_opportunities(self):
        job = self._make_job()
        projects = [
            {
                "title": "Solar Energy Project Mauritania",
                "url": "https://example.com/p1",
                "source": "WORLD_BANK",
                "description": "Solar panels for rural communities.",
                "country": "Mauritania",
                "amount": 5000000,
                "currency": "USD",
                "deadline": None,
                "funding_type": "grant",
                "sector": "energy",
                "completeness_score": 70,
                "hash": "abc123unique",
                "metadata": {},
            }
        ]
        result = save_projects(projects=projects, job=job)
        assert result["created"] == 1
        assert result["duplicates"] == 0
        assert FundingOpportunity.objects.filter(hash="abc123unique").exists()

    def test_skips_duplicates(self):
        job = self._make_job()
        projects = [
            {
                "title": "Dup Project",
                "url": "https://example.com/dup",
                "source": "GEF",
                "description": "",
                "country": "",
                "amount": None,
                "currency": "USD",
                "deadline": None,
                "funding_type": "grant",
                "sector": "",
                "completeness_score": 10,
                "hash": "dup_hash_xyz",
                "metadata": {},
            }
        ]
        save_projects(projects=projects, job=job)
        result = save_projects(projects=projects, job=job)
        assert result["duplicates"] == 1
        assert result["created"] == 0

    def test_scraped_items_are_draft(self):
        job = self._make_job()
        save_projects(projects=[{
            "title": "Draft Test",
            "url": "https://example.com/draft",
            "source": "GCF",
            "description": "",
            "country": "",
            "amount": None,
            "currency": "USD",
            "deadline": None,
            "funding_type": "grant",
            "sector": "",
            "completeness_score": 5,
            "hash": "draft_hash_001",
            "metadata": {},
        }], job=job)
        opp = FundingOpportunity.objects.get(hash="draft_hash_001")
        assert opp.status == "draft"


@pytest.mark.django_db
class TestClassifyPriority:
    def test_urgent_when_deadline_within_7_days(self, db):
        from datetime import date, timedelta
        from apps.opportunities.models import FundingOpportunity
        from apps.opportunities.services import create_opportunity

        opp = create_opportunity(
            title="Urgent Opp",
            source="GCF",
            deadline=str(date.today() + timedelta(days=3)),
            amount=2000000,
        )
        assert classify_priority(opp) == "urgent"

    def test_low_when_no_deadline(self, db):
        from apps.opportunities.services import create_opportunity

        opp = create_opportunity(title="No Deadline Opp", source="GEF")
        assert classify_priority(opp) == "low"

    def test_high_when_within_30_days(self, db):
        from datetime import date, timedelta
        from apps.opportunities.services import create_opportunity

        opp = create_opportunity(
            title="High Priority Opp",
            source="AFD",
            deadline=str(date.today() + timedelta(days=20)),
        )
        assert classify_priority(opp) == "high"