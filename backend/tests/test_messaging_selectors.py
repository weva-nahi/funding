"""Tests for the messaging app's cross-app aggregation selectors."""

import pytest

from apps.applications.services import add_message as add_application_message
from apps.consulting.services import add_message as add_consulting_message
from apps.consulting.services import create_request
from apps.messaging.selectors import (
    get_admin_contact_list,
    get_merged_thread,
    get_unread_message_count,
)


@pytest.mark.django_db
class TestGetMergedThread:
    def test_merges_and_sorts_both_sources(self, client_user, admin_user, pending_application):
        req = create_request(user=client_user, description="Question.", priority="medium")

        add_application_message(application=pending_application, sender=client_user, content="App msg 1")
        add_consulting_message(request_id=req.id, sender=admin_user, content="Consulting reply")
        add_application_message(application=pending_application, sender=admin_user, content="App msg 2")

        thread = get_merged_thread(user=client_user)

        assert [m["content"] for m in thread] == ["Question.", "App msg 1", "Consulting reply", "App msg 2"]
        assert [m["source"] for m in thread] == ["consulting", "application", "consulting", "application"]
        assert thread[1]["application_id"] == pending_application.id
        assert thread[2]["consulting_request_id"] == req.id

    def test_empty_for_client_with_no_threads(self, client_user):
        assert get_merged_thread(user=client_user) == []

    def test_consulting_request_description_appears_before_any_reply(self, client_user):
        req = create_request(user=client_user, description="I need help.", priority="medium")

        thread = get_merged_thread(user=client_user)

        assert len(thread) == 1
        assert thread[0]["content"] == "I need help."
        assert thread[0]["source"] == "consulting"
        assert thread[0]["consulting_request_id"] == req.id
        assert thread[0]["sender_role"] == "client"
        assert thread[0]["id"] == -req.id


@pytest.mark.django_db
class TestGetAdminContactList:
    def test_lists_client_with_messages_from_either_source(self, client_user, admin_user, pending_application):
        add_application_message(application=pending_application, sender=client_user, content="Hi")

        contacts = get_admin_contact_list(admin_user=admin_user)

        assert len(contacts) == 1
        assert contacts[0]["user_id"] == client_user.id
        assert contacts[0]["last_message_preview"] == "Hi"

    def test_excludes_clients_with_no_messages(self, client_user, admin_user, pending_application):
        # pending_application exists but has no messages yet
        contacts = get_admin_contact_list(admin_user=admin_user)
        assert contacts == []

    def test_lists_client_who_only_created_a_consulting_request(self, client_user, admin_user):
        # No ConsultingMessage yet — only the request's opening description
        create_request(user=client_user, description="I need help with GEF.", priority="medium")

        contacts = get_admin_contact_list(admin_user=admin_user)

        assert len(contacts) == 1
        assert contacts[0]["user_id"] == client_user.id
        assert contacts[0]["last_message_preview"] == "I need help with GEF."

    def test_search_filters_by_email(self, client_user, admin_user, pending_application):
        add_application_message(application=pending_application, sender=client_user, content="Hi")

        assert len(get_admin_contact_list(admin_user=admin_user, search=client_user.email[:4])) == 1
        assert get_admin_contact_list(admin_user=admin_user, search="no-such-client") == []


@pytest.mark.django_db
class TestGetUnreadMessageCount:
    def test_counts_new_message_notifications(self, client_user, admin_user, pending_application):
        assert get_unread_message_count(user=admin_user) == 0
        add_application_message(application=pending_application, sender=client_user, content="Hi")
        assert get_unread_message_count(user=admin_user) == 1
