"""Tests for the shortlist stage."""
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

    def test_cannot_shortlist_already_approved(self, pending_application, admin_user):
        app = approve_application(application=pending_application, admin_user=admin_user)
        with pytest.raises(ApplicationError):
            shortlist_application(application=app, admin_user=admin_user)

    def test_approve_from_shortlisted(self, pending_application, admin_user):
        app = shortlist_application(application=pending_application, admin_user=admin_user)
        app = approve_application(application=app, admin_user=admin_user, comment="Selected.")
        assert app.status == "approved"

    def test_reject_from_shortlisted(self, pending_application, admin_user):
        app = shortlist_application(application=pending_application, admin_user=admin_user)
        app = reject_application(
            application=app,
            admin_user=admin_user,
            reason="Another candidate was selected for this opportunity.",
        )
        assert app.status == "rejected"

    def test_shortlist_sends_notification(self, pending_application, admin_user):
        from apps.notifications.models import Notification
        shortlist_application(application=pending_application, admin_user=admin_user)
        assert Notification.objects.filter(
            user=pending_application.user, notification_type="application_status"
        ).exists()


@pytest.mark.django_db
class TestBulkShortlist:
    def test_bulk_shortlist_skips_invalid(self, pending_application, admin_user):
        result = bulk_shortlist(application_ids=[pending_application.id, 999999], admin_user=admin_user)
        assert result["shortlisted"] == 1
        assert result["skipped"] == 1
