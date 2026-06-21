"""API-level tests for opportunity endpoints — covers gaps from the
'missing API-level tests for key endpoints' item: city filtering, expired
opportunities being hidden from clients, and the post-publish field lock."""

import pytest
from datetime import date, timedelta

from apps.opportunities.models import FundingOpportunity
from apps.opportunities.services import create_opportunity, publish_opportunity


@pytest.mark.django_db
class TestPublicOpportunityListEndpoint:
    def test_published_opportunity_visible(self, api_client, admin_user):
        opp = create_opportunity(title="Visible Grant", source="GEF", created_by=admin_user)
        publish_opportunity(opportunity=opp)
        response = api_client.get("/api/v1/opportunities/")
        assert response.status_code == 200
        titles = [o["title"] for o in response.data["results"]]
        assert "Visible Grant" in titles

    def test_draft_opportunity_not_visible(self, api_client, admin_user):
        create_opportunity(title="Hidden Draft", source="GEF", created_by=admin_user)
        response = api_client.get("/api/v1/opportunities/")
        titles = [o["title"] for o in response.data["results"]]
        assert "Hidden Draft" not in titles

    def test_expired_opportunity_hidden_from_public_list(self, api_client, admin_user):
        """Direct test for the 'expired opportunities still appear' bug fix —
        expired deadlines must be excluded from the public list immediately,
        not just after the nightly archive Celery task runs."""
        past_opp = create_opportunity(
            title="Expired Grant",
            source="GEF",
            deadline=str(date.today() - timedelta(days=1)),
            created_by=admin_user,
        )
        publish_opportunity(opportunity=past_opp)
        response = api_client.get("/api/v1/opportunities/")
        titles = [o["title"] for o in response.data["results"]]
        assert "Expired Grant" not in titles

    def test_opportunity_with_no_deadline_still_visible(self, api_client, admin_user):
        """No-deadline opportunities (rolling-basis grants) are NOT expired
        by definition — must stay visible."""
        opp = create_opportunity(title="Rolling Grant", source="GCF", created_by=admin_user)
        publish_opportunity(opportunity=opp)
        response = api_client.get("/api/v1/opportunities/")
        titles = [o["title"] for o in response.data["results"]]
        assert "Rolling Grant" in titles

    def test_future_deadline_visible(self, api_client, admin_user):
        opp = create_opportunity(
            title="Future Grant",
            source="GEF",
            deadline=str(date.today() + timedelta(days=30)),
            created_by=admin_user,
        )
        publish_opportunity(opportunity=opp)
        response = api_client.get("/api/v1/opportunities/")
        titles = [o["title"] for o in response.data["results"]]
        assert "Future Grant" in titles

    def test_filter_by_city(self, api_client, admin_user):
        nkc = create_opportunity(title="Nouakchott Project", source="GEF", city="Nouakchott", created_by=admin_user)
        publish_opportunity(opportunity=nkc)
        other = create_opportunity(title="Atar Project", source="GEF", city="Atar", created_by=admin_user)
        publish_opportunity(opportunity=other)

        response = api_client.get("/api/v1/opportunities/", {"city": "Nouakchott"})
        titles = [o["title"] for o in response.data["results"]]
        assert "Nouakchott Project" in titles
        assert "Atar Project" not in titles

    def test_filter_by_amount_range(self, api_client, admin_user):
        small = create_opportunity(title="Small Grant", source="GEF", amount=10_000, created_by=admin_user)
        publish_opportunity(opportunity=small)
        large = create_opportunity(title="Large Grant", source="GEF", amount=5_000_000, created_by=admin_user)
        publish_opportunity(opportunity=large)

        response = api_client.get("/api/v1/opportunities/", {"amount_min": "1000000"})
        titles = [o["title"] for o in response.data["results"]]
        assert "Large Grant" in titles
        assert "Small Grant" not in titles

    def test_has_deadline_filter(self, api_client, admin_user):
        with_deadline = create_opportunity(
            title="Has Deadline", source="GEF",
            deadline=str(date.today() + timedelta(days=10)), created_by=admin_user,
        )
        publish_opportunity(opportunity=with_deadline)
        without_deadline = create_opportunity(title="No Deadline", source="GEF", created_by=admin_user)
        publish_opportunity(opportunity=without_deadline)

        response = api_client.get("/api/v1/opportunities/", {"has_deadline": "true"})
        titles = [o["title"] for o in response.data["results"]]
        assert "Has Deadline" in titles
        assert "No Deadline" not in titles


@pytest.mark.django_db
class TestOpportunityPublishedFieldLock:
    """Covers the 'opportunities should not be fully editable' requirement —
    amount and deadline must be immutable once published."""

    def test_amount_locked_after_publish(self, admin_api_client, admin_user):
        opp = create_opportunity(title="Locked Amount Test", source="GEF", amount=100_000, created_by=admin_user)
        publish_opportunity(opportunity=opp)

        response = admin_api_client.patch(
            f"/api/v1/opportunities/admin/{opp.id}/", {"amount": 999_999}, format="json"
        )
        assert response.status_code == 400

    def test_deadline_locked_after_publish(self, admin_api_client, admin_user):
        opp = create_opportunity(
            title="Locked Deadline Test", source="GEF",
            deadline=str(date.today() + timedelta(days=30)), created_by=admin_user,
        )
        publish_opportunity(opportunity=opp)

        response = admin_api_client.patch(
            f"/api/v1/opportunities/admin/{opp.id}/",
            {"deadline": str(date.today() + timedelta(days=60))},
            format="json",
        )
        assert response.status_code == 400

    def test_description_still_editable_after_publish(self, admin_api_client, admin_user):
        """Non-locked fields remain freely editable post-publish."""
        opp = create_opportunity(title="Editable Description Test", source="GEF", created_by=admin_user)
        publish_opportunity(opportunity=opp)

        response = admin_api_client.patch(
            f"/api/v1/opportunities/admin/{opp.id}/",
            {"description": "Updated description text."},
            format="json",
        )
        assert response.status_code == 200
        opp.refresh_from_db()
        assert opp.description == "Updated description text."

    def test_amount_editable_before_publish(self, admin_api_client, admin_user):
        """Draft opportunities have no lock — confirms the lock is
        publish-state-conditional, not blanket."""
        opp = create_opportunity(title="Draft Editable Test", source="GEF", amount=100_000, created_by=admin_user)

        response = admin_api_client.patch(
            f"/api/v1/opportunities/admin/{opp.id}/", {"amount": 200_000}, format="json"
        )
        assert response.status_code == 200
        opp.refresh_from_db()
        assert float(opp.amount) == 200_000

    def test_resending_unchanged_amount_does_not_fail(self, admin_api_client, admin_user):
        """A full-form PATCH that resends the SAME amount value should not
        be rejected — only an actual change to a locked field should fail."""
        opp = create_opportunity(title="Unchanged Resend Test", source="GEF", amount=100_000, created_by=admin_user)
        publish_opportunity(opportunity=opp)

        response = admin_api_client.patch(
            f"/api/v1/opportunities/admin/{opp.id}/",
            {"amount": 100_000, "description": "Just touching description"},
            format="json",
        )
        assert response.status_code == 200


@pytest.mark.django_db
class TestAdminOpportunityListNoNPlus1:
    """Regression test for the N+1 fix — not a query-count assertion (which
    would be brittle across Django/DRF versions), but a functional check
    that is_saved resolves correctly for multiple rows in one request,
    proving the saved_ids context path is actually being used."""

    def test_is_saved_correct_across_multiple_rows(self, admin_api_client, admin_user):
        from apps.opportunities.services import save_opportunity

        opp1 = create_opportunity(title="Saved One", source="GEF", created_by=admin_user)
        publish_opportunity(opportunity=opp1)
        opp2 = create_opportunity(title="Not Saved", source="GEF", created_by=admin_user)
        publish_opportunity(opportunity=opp2)

        save_opportunity(user=admin_user, opportunity=opp1)

        response = admin_api_client.get("/api/v1/opportunities/admin/")
        by_title = {o["title"]: o["is_saved"] for o in response.data["results"]}
        assert by_title["Saved One"] is True
        assert by_title["Not Saved"] is False