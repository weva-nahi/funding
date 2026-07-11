"""Tests for application services."""

import pytest

from apps.applications.models import Application
from apps.applications.services import (
    add_message,
    approve_application,
    create_application,
    reject_application,
    shortlist_application,
)
from common.exceptions import ApplicationError


@pytest.mark.django_db
class TestCreateApplication:
    def test_creates_pending_application(self, client_user, published_opportunity):
        app = create_application(user=client_user, opportunity=published_opportunity)
        assert app.pk is not None
        assert app.status == 'pending'
        assert app.version == 1

    def test_blocks_duplicate_application(self, client_user, published_opportunity):
        create_application(user=client_user, opportunity=published_opportunity)
        with pytest.raises(ApplicationError, match='already have'):
            create_application(user=client_user, opportunity=published_opportunity)

    def test_blocks_expired_opportunity(self, db, client_user, admin_user):
        from datetime import date, timedelta
        from apps.opportunities.services import create_opportunity, publish_opportunity

        past_opp = create_opportunity(
            title='Expired',
            source='GEF',
            deadline=str(date.today() - timedelta(days=1)),
            created_by=admin_user,
        )
        publish_opportunity(opportunity=past_opp)
        with pytest.raises(ApplicationError, match='deadline'):
            create_application(user=client_user, opportunity=past_opp)

    def test_creates_status_history_entry(self, client_user, published_opportunity):
        app = create_application(user=client_user, opportunity=published_opportunity)
        history = app.status_history.all()
        statuses = [h.to_status for h in history]
        assert 'pending' in statuses


@pytest.mark.django_db
class TestReviewApplications:
    def test_approve_from_pending(self, pending_application, admin_user):
        app = approve_application(
            application=pending_application, admin_user=admin_user, comment='Excellent dossier.'
        )
        assert app.status == 'approved'
        assert app.admin_comment == 'Excellent dossier.'

    def test_approve_from_shortlisted(self, pending_application, admin_user):
        app = shortlist_application(application=pending_application, admin_user=admin_user)
        app = approve_application(application=app, admin_user=admin_user)
        assert app.status == 'approved'

    def test_reject_from_pending(self, pending_application, admin_user):
        app = reject_application(
            application=pending_application,
            admin_user=admin_user,
            reason='The application does not meet the eligibility criteria for this fund.',
        )
        assert app.status == 'rejected'

    def test_reject_from_shortlisted(self, pending_application, admin_user):
        app = shortlist_application(application=pending_application, admin_user=admin_user)
        app = reject_application(
            application=app,
            admin_user=admin_user,
            reason='Another candidate was selected for this opportunity.',
        )
        assert app.status == 'rejected'

    def test_shortlist_from_pending(self, pending_application, admin_user):
        app = shortlist_application(application=pending_application, admin_user=admin_user)
        assert app.status == 'shortlisted'

    def test_cannot_approve_already_rejected(self, pending_application, admin_user):
        app = reject_application(
            application=pending_application,
            admin_user=admin_user,
            reason='Does not meet criteria for this funding opportunity.',
        )
        with pytest.raises(ApplicationError):
            approve_application(application=app, admin_user=admin_user)

    def test_cannot_shortlist_approved(self, pending_application, admin_user):
        app = approve_application(application=pending_application, admin_user=admin_user)
        with pytest.raises(ApplicationError):
            shortlist_application(application=app, admin_user=admin_user)

    def test_records_status_history_on_approve(self, pending_application, admin_user):
        approve_application(application=pending_application, admin_user=admin_user)
        history = pending_application.status_history.all()
        statuses = [h.to_status for h in history]
        assert 'approved' in statuses

    def test_approve_sends_notification(self, pending_application, admin_user):
        from apps.notifications.models import Notification
        approve_application(application=pending_application, admin_user=admin_user)
        assert Notification.objects.filter(
            user=pending_application.user, notification_type='application_status'
        ).exists()

    def test_reject_sends_notification(self, pending_application, admin_user):
        from apps.notifications.models import Notification
        reject_application(
            application=pending_application,
            admin_user=admin_user,
            reason='Does not meet criteria for this funding opportunity.',
        )
        assert Notification.objects.filter(
            user=pending_application.user, notification_type='application_status'
        ).exists()


@pytest.mark.django_db
class TestAddMessage:
    def test_client_message_notifies_all_admins(self, pending_application, client_user, admin_user):
        from apps.notifications.models import Notification
        add_message(application=pending_application, sender=client_user, content='Hello, question here.')
        assert Notification.objects.filter(
            user=admin_user, notification_type='new_message', category='messaging'
        ).exists()

    def test_admin_message_notifies_client(self, pending_application, admin_user):
        from apps.notifications.models import Notification
        add_message(application=pending_application, sender=admin_user, content='We are reviewing it.')
        assert Notification.objects.filter(
            user=pending_application.user, notification_type='new_message', category='messaging'
        ).exists()
