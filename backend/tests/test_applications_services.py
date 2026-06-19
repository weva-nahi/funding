"""Tests for application services."""

import pytest

from apps.applications.models import Application
from apps.applications.services import (
    approve_application,
    create_draft,
    reject_application,
    set_in_review,
    submit_application,
    withdraw_application,
)
from common.exceptions import ApplicationError


@pytest.mark.django_db
class TestCreateDraft:
    def test_creates_draft(self, client_user, published_opportunity):
        app = create_draft(user=client_user, opportunity=published_opportunity)
        assert app.pk is not None
        assert app.status == "draft"
        assert app.version == 1

    def test_blocks_duplicate_active(self, client_user, published_opportunity):
        create_draft(user=client_user, opportunity=published_opportunity)
        with pytest.raises(ApplicationError, match="active application"):
            create_draft(user=client_user, opportunity=published_opportunity)

    def test_allows_reapply_after_withdrawal(self, client_user, published_opportunity):
        app = create_draft(user=client_user, opportunity=published_opportunity)
        withdraw_application(application=app, user=client_user)
        # Must succeed — withdrawn row doesn't block a new application.
        new_app = create_draft(user=client_user, opportunity=published_opportunity)
        assert new_app.pk != app.pk

    def test_blocks_expired_opportunity(self, db, client_user, admin_user):
        from datetime import date, timedelta
        from apps.opportunities.services import create_opportunity, publish_opportunity

        past_opp = create_opportunity(
            title="Expired", source="GEF", deadline=str(date.today() - timedelta(days=1)),
            created_by=admin_user,
        )
        publish_opportunity(opportunity=past_opp)
        with pytest.raises(ApplicationError, match="deadline"):
            create_draft(user=client_user, opportunity=past_opp)


@pytest.mark.django_db
class TestSubmitApplication:
    def test_submit_with_letter(self, draft_application, client_user):
        draft_application.motivation_letter = "We are an excellent fit for this grant opportunity."
        draft_application.save()
        app = submit_application(application=draft_application, user=client_user)
        assert app.status == "pending"
        assert app.version == 2

    def test_submit_without_letter_or_documents_raises(self, draft_application, client_user):
        with pytest.raises(ApplicationError, match="motivation letter"):
            submit_application(application=draft_application, user=client_user)

    def test_submit_already_pending_raises(self, pending_application, client_user):
        with pytest.raises(ApplicationError):
            submit_application(application=pending_application, user=client_user)


@pytest.mark.django_db
class TestReviewApplications:
    def test_approve(self, pending_application, admin_user):
        app = approve_application(
            application=pending_application, admin_user=admin_user, comment="Excellent dossier."
        )
        assert app.status == "approved"
        assert app.admin_comment == "Excellent dossier."

    def test_reject_requires_min_length(self, pending_application, admin_user):
        with pytest.raises(ApplicationError, match="20 characters"):
            reject_application(application=pending_application, admin_user=admin_user, reason="Short")

    def test_reject_valid(self, pending_application, admin_user):
        app = reject_application(
            application=pending_application,
            admin_user=admin_user,
            reason="The application does not meet the eligibility criteria for this fund.",
        )
        assert app.status == "rejected"

    def test_set_in_review(self, pending_application, admin_user):
        app = set_in_review(application=pending_application, admin_user=admin_user)
        assert app.status == "in_review"

    def test_approve_from_in_review(self, pending_application, admin_user):
        app = set_in_review(application=pending_application, admin_user=admin_user)
        app = approve_application(application=app, admin_user=admin_user)
        assert app.status == "approved"

    def test_cannot_approve_draft(self, draft_application, admin_user):
        with pytest.raises(ApplicationError):
            approve_application(application=draft_application, admin_user=admin_user)

    def test_cannot_reject_approved(self, pending_application, admin_user):
        app = approve_application(application=pending_application, admin_user=admin_user)
        with pytest.raises(ApplicationError):
            reject_application(
                application=app,
                admin_user=admin_user,
                reason="This reason is long enough to satisfy the minimum length check.",
            )

    def test_records_status_history(self, pending_application, admin_user):
        approve_application(application=pending_application, admin_user=admin_user)
        history = pending_application.status_history.all()
        statuses = [h.to_status for h in history]
        assert "approved" in statuses


@pytest.mark.django_db
class TestWithdrawApplication:
    def test_withdraw_draft(self, draft_application, client_user):
        app = withdraw_application(application=draft_application, user=client_user)
        assert app.status == "withdrawn"

    def test_cannot_withdraw_approved(self, pending_application, admin_user, client_user):
        app = approve_application(application=pending_application, admin_user=admin_user)
        with pytest.raises(ApplicationError):
            withdraw_application(application=app, user=client_user)