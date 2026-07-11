"""Tests for consulting services — adapted to the pure-conversation model."""

import pytest

from apps.consulting.services import add_message, close_request, create_request
from apps.consulting.models import ConsultingRequest, ConsultingMessage


@pytest.mark.django_db
class TestConsultingFlow:
    def test_create_request(self, client_user):
        req = create_request(
            user=client_user,
            description="I need help with GEF application.",
            priority="high",
        )
        assert req.pk is not None
        assert req.status == "pending"
        assert req.priority == "high"

    def test_add_client_message(self, client_user):
        req = create_request(
            user=client_user,
            description="Initial question.",
            priority="medium",
        )
        msg = add_message(request_id=req.id, sender=client_user, content="Follow-up detail.")
        assert msg.pk is not None
        assert msg.content == "Follow-up detail."
        assert msg.sender == client_user

    def test_admin_reply_activates_request(self, client_user, admin_user):
        req = create_request(
            user=client_user,
            description="I need help with GEF application.",
            priority="medium",
        )
        assert req.status == "pending"

        add_message(
            request_id=req.id,
            sender=admin_user,
            content="We can assist you with the GEF application process.",
        )
        req.refresh_from_db()
        assert req.status == "active"

    def test_client_message_does_not_change_status(self, client_user):
        req = create_request(
            user=client_user,
            description="Help needed.",
            priority="low",
        )
        add_message(request_id=req.id, sender=client_user, content="More details here.")
        req.refresh_from_db()
        # Client message on a pending request keeps it pending
        assert req.status == "pending"

    def test_close_request(self, client_user, admin_user):
        req = create_request(
            user=client_user,
            description="Issue to close.",
            priority="low",
        )
        add_message(request_id=req.id, sender=admin_user, content="Resolved.")
        closed = close_request(request_id=req.id)
        assert closed.status == "closed"

    def test_messages_ordered_chronologically(self, client_user, admin_user):
        req = create_request(
            user=client_user,
            description="Chat test.",
            priority="medium",
        )
        add_message(request_id=req.id, sender=client_user, content="First")
        add_message(request_id=req.id, sender=admin_user, content="Second")
        add_message(request_id=req.id, sender=client_user, content="Third")

        messages = list(req.messages.all())
        assert [m.content for m in messages] == ["First", "Second", "Third"]

    def test_multiple_messages_allowed(self, client_user, admin_user):
        req = create_request(
            user=client_user,
            description="Ongoing discussion.",
            priority="high",
        )
        add_message(request_id=req.id, sender=admin_user, content="Reply 1")
        add_message(request_id=req.id, sender=admin_user, content="Reply 2")
        # No exception — multiple messages from same sender are allowed
        assert req.messages.count() == 2

    def test_client_message_notifies_all_admins(self, client_user, admin_user):
        from apps.notifications.models import Notification

        req = create_request(user=client_user, description="Need help.", priority="medium")
        add_message(request_id=req.id, sender=client_user, content="Any update?")
        assert Notification.objects.filter(
            user=admin_user, notification_type="new_message", category="messaging"
        ).exists()

    def test_admin_message_notifies_client(self, client_user, admin_user):
        from apps.notifications.models import Notification

        req = create_request(user=client_user, description="Need help.", priority="medium")
        add_message(request_id=req.id, sender=admin_user, content="We can help.")
        assert Notification.objects.filter(
            user=client_user, notification_type="new_message", category="messaging"
        ).exists()

    def test_create_request_notifies_all_admins(self, client_user, admin_user):
        from apps.notifications.models import Notification

        create_request(user=client_user, description="I need help with GEF application.", priority="medium")
        assert Notification.objects.filter(
            user=admin_user, notification_type="new_message", category="messaging"
        ).exists()