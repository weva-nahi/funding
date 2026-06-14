"""Tests for opportunity services."""

import io
import pytest

from apps.opportunities.models import FundingOpportunity
from apps.opportunities.services import (
    archive_opportunity,
    create_opportunity,
    import_opportunities_from_xlsx,
    publish_opportunity,
    update_opportunity,
)
from common.exceptions import InvalidFileError


@pytest.mark.django_db
class TestCreateOpportunity:
    def test_basic_creation(self, admin_user):
        opp = create_opportunity(
            title="Test Grant",
            source="GEF",
            description="A great opportunity",
            created_by=admin_user,
        )
        assert opp.pk is not None
        assert opp.title == "Test Grant"
        assert opp.status == "draft"
        assert opp.source == "GEF"
        assert opp.hash  # auto-generated

    def test_completeness_score_computed(self, admin_user):
        full = create_opportunity(
            title="Full Grant",
            source="GCF",
            description="Full details",
            country="Mauritania",
            amount=1_000_000,
            deadline="2025-12-31",
            funding_type="grant",
            sector="energy",
            url="https://example.com",
            eligibility_criteria="Must be registered",
            created_by=admin_user,
        )
        assert full.completeness_score == 100

    def test_partial_completeness_lower_than_full(self, admin_user):
        minimal = create_opportunity(
            title="Minimal", source="GEF", created_by=admin_user
        )
        full = create_opportunity(
            title="Full",
            source="GCF",
            description="d",
            country="MR",
            amount=1,
            deadline="2025-12-31",
            funding_type="grant",
            sector="energy",
            url="https://x.com",
            eligibility_criteria="x",
            created_by=admin_user,
        )
        assert full.completeness_score > minimal.completeness_score

    def test_source_normalization(self, admin_user):
        opp = create_opportunity(
            title="World Bank Grant",
            source="WORLD BANK",
            created_by=admin_user,
        )
        assert opp.source == "WORLD_BANK"

    def test_unknown_source_defaults_to_oecd(self, admin_user):
        opp = create_opportunity(
            title="Unknown Source",
            source="RANDOM_FUND",
            created_by=admin_user,
        )
        assert opp.source == "OECD"


@pytest.mark.django_db
class TestPublishAndArchive:
    def test_publish_sets_status_and_timestamp(self, admin_user):
        opp = create_opportunity(
            title="To Publish", source="GCF", created_by=admin_user
        )
        assert opp.status == "draft"
        assert opp.published_at is None

        published = publish_opportunity(opportunity=opp, user=admin_user)

        assert published.status == "published"
        assert published.published_at is not None

    def test_archive_sets_status(self, admin_user):
        opp = create_opportunity(
            title="To Archive", source="GEF", created_by=admin_user
        )
        publish_opportunity(opportunity=opp)
        archived = archive_opportunity(opportunity=opp)
        assert archived.status == "archived"


@pytest.mark.django_db
class TestExcelImport:
    def _make_xlsx(self, rows: list) -> io.BytesIO:
        from openpyxl import Workbook

        wb = Workbook()
        ws = wb.active
        for row in rows:
            ws.append(row)
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        return buf

    def test_import_creates_opportunities(self, admin_user):
        xlsx = self._make_xlsx(
            [
                ["title", "source", "description", "country", "funding_type"],
                ["Solar Initiative", "GCF", "Solar panels", "Mauritania", "grant"],
                ["Water Project", "GEF", "Clean water", "Mauritania", "grant"],
            ]
        )
        result = import_opportunities_from_xlsx(file_obj=xlsx, created_by=admin_user)
        assert result["created"] == 2
        assert result["skipped"] == 0

    def test_import_skips_duplicates(self, admin_user):
        xlsx = self._make_xlsx([["title", "source"], ["Dup Title", "GEF"]])
        import_opportunities_from_xlsx(file_obj=xlsx, created_by=admin_user)
        xlsx.seek(0)
        result = import_opportunities_from_xlsx(file_obj=xlsx, created_by=admin_user)
        assert result["skipped"] == 1
        assert result["created"] == 0

    def test_import_skips_rows_without_title(self, admin_user):
        xlsx = self._make_xlsx([["title", "source"], ["", "GEF"], [None, "GCF"]])
        result = import_opportunities_from_xlsx(file_obj=xlsx, created_by=admin_user)
        assert result["created"] == 0
        assert result["skipped"] == 2

    def test_import_missing_title_column_raises(self, admin_user):
        xlsx = self._make_xlsx([["source", "description"], ["GEF", "No title"]])
        with pytest.raises(InvalidFileError, match="title"):
            import_opportunities_from_xlsx(file_obj=xlsx, created_by=admin_user)

    def test_import_handles_date_objects(self, admin_user):
        """
        openpyxl returns datetime.date for date-formatted Excel cells.
        Without conversion this crashes Django's DateField save.
        """
        import datetime
        from openpyxl import Workbook

        wb = Workbook()
        ws = wb.active
        ws.append(["title", "source", "deadline"])
        ws.append(["Date Test", "GEF", datetime.date(2025, 6, 30)])
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)

        result = import_opportunities_from_xlsx(file_obj=buf, created_by=admin_user)
        assert result["created"] == 1
        opp = FundingOpportunity.objects.get(title="Date Test")
        assert str(opp.deadline) == "2025-06-30"

    def test_import_normalizes_source(self, admin_user):
        xlsx = self._make_xlsx(
            [["title", "source"], ["WB Grant", "WORLD BANK"]]
        )
        import_opportunities_from_xlsx(file_obj=xlsx, created_by=admin_user)
        opp = FundingOpportunity.objects.get(title="WB Grant")
        assert opp.source == "WORLD_BANK"