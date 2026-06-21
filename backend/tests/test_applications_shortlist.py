"""Tests for the shortlist stage in the application review workflow."""

import pytest

from apps.applications.services import (
    approve_application,
    bulk_shortlist,
    reject_application,
    shortlist_application,
)
from common.exceptions import ApplicationError


@pytest.mark.django_db
class TestShortlistWorkflow:
    def test_shortlist_from_pending(self, pending_application, admin_user):
        app = shortlist_application(application=pending_application, admin_user=admin_user)
        assert app.status == "shortlisted"

    def test_shortlist_from_in_review(self, pending_application, admin_user):
        from apps.applications.services import set_in_review

        app = set_in_review(application=pending_application, admin_user=admin_user)
        app = shortlist_application(application=app, admin_user=admin_user)
        assert app.status == "shortlisted"

    def test_cannot_shortlist_draft(self, draft_application, admin_user):
        with pytest.raises(ApplicationError, match="pending or in-review"):
            shortlist_application(application=draft_application, admin_user=admin_user)

    def test_cannot_shortlist_already_approved(self, pending_application, admin_user):
        app = approve_application(application=pending_application, admin_user=admin_user)
        with pytest.raises(ApplicationError):
            shortlist_application(application=app, admin_user=admin_user)

    def test_approve_from_shortlisted(self, pending_application, admin_user):
        app = shortlist_application(application=pending_application, admin_user=admin_user)
        app = approve_application(application=app, admin_user=admin_user, comment="Selected as winner.")
        assert app.status == "approved"

    def test_reject_from_shortlisted(self, pending_application, admin_user):
        app = shortlist_application(application=pending_application, admin_user=admin_user)
        app = reject_application(
            application=app,
            admin_user=admin_user,
            reason="Another candidate was selected for this opportunity.",
        )
        assert app.status == "rejected"

    def test_shortlist_records_status_history(self, pending_application, admin_user):
        app = shortlist_application(application=pending_application, admin_user=admin_user)
        history = app.status_history.all()
        statuses = [h.to_status for h in history]
        assert "shortlisted" in statuses

    def test_shortlist_sends_notification(self, pending_application, admin_user):
        from apps.notifications.models import Notification

        shortlist_application(application=pending_application, admin_user=admin_user)
        assert Notification.objects.filter(
            user=pending_application.user, notification_type="application_status"
        ).exists()


@pytest.mark.django_db
class TestBulkShortlist:
    def test_bulk_shortlist_multiple(self, client_user, admin_user, published_opportunity):
        from apps.applications.models import Application
        from apps.opportunities.services import create_opportunity, publish_opportunity
        from apps.authentication.models import User, Profile

        # Second client + opportunity to get two independent pending applications
        user2 = User.objects.create_user(email="client2@richat.mr", password="Pass1234!", is_email_verified=True)
        Profile.objects.create(user=user2)

        app1 = Application.objects.create(user=client_user, opportunity=published_opportunity, status="pending")
        app2 = Application.objects.create(user=user2, opportunity=published_opportunity, status="pending")

        result = bulk_shortlist(application_ids=[app1.id, app2.id], admin_user=admin_user)
        assert result["shortlisted"] == 2
        assert result["skipped"] == 0

        app1.refresh_from_db()
        app2.refresh_from_db()
        assert app1.status == "shortlisted"
        assert app2.status == "shortlisted"

    def test_bulk_shortlist_skips_invalid(self, pending_application, admin_user):
        result = bulk_shortlist(application_ids=[pending_application.id, 999999], admin_user=admin_user)
        assert result["shortlisted"] == 1
        assert result["skipped"] == 1