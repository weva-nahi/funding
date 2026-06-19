"""Tests for notification preference checking."""

import pytest

from apps.notifications.models import Notification
from apps.notifications.services import create_notification


@pytest.mark.django_db
class TestCreateNotification:
    def test_creates_notification_by_default(self, client_user):
        n = create_notification(
            user=client_user,
            message="Test notification",
            notification_type="application_status",
        )
        assert n is not None
        assert n.pk is not None
        assert Notification.objects.filter(user=client_user).count() == 1

    def test_skips_when_preference_off(self, client_user):
        client_user.profile.notify_application_status = False
        client_user.profile.save()
        result = create_notification(
            user=client_user,
            message="You should not see this",
            notification_type="application_status",
        )
        assert result is None
        assert Notification.objects.filter(user=client_user).count() == 0

    def test_system_notification_always_created(self, client_user):
        # notify_system_announcements defaults to True and system notifications
        # always create when the pref is not turned off.
        n = create_notification(
            user=client_user,
            message="System announcement",
            notification_type="system",
        )
        assert n is not None

    def test_system_notification_skipped_when_pref_off(self, client_user):
        client_user.profile.notify_system_announcements = False
        client_user.profile.save()
        result = create_notification(
            user=client_user,
            message="System announcement",
            notification_type="system",
        )
        assert result is None

    def test_scraping_complete_always_created(self, admin_user):
        # scraping_complete has no preference flag; it always goes through.
        n = create_notification(
            user=admin_user,
            message="Scraping done",
            notification_type="scraping_complete",
        )
        assert n is not None