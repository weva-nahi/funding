"""Tests for consulting services."""

import pytest

from apps.consulting.services import create_request, respond_to_request
from common.exceptions import ApplicationError


@pytest.mark.django_db
class TestConsultingFlow:
    def test_create_request(self, client_user):
        req = create_request(user=client_user, description="I need help with GEF application.", priority="high")
        assert req.pk is not None
        assert req.status == "pending"
        assert req.priority == "high"

    def test_resolve_request(self, client_user, admin_user):
        req = create_request(user=client_user, description="I need help with GEF application.", priority="medium")
        resolved = respond_to_request(
            request_id=req.id,
            admin_user=admin_user,
            response="We have reviewed your request and can assist you with the GEF application process.",
            action="resolve",
        )
        assert resolved.status == "resolved"
        assert resolved.admin_response != ""
        assert resolved.responded_at is not None

    def test_reject_request(self, client_user, admin_user):
        req = create_request(user=client_user, description="Help needed.", priority="low")
        rejected = respond_to_request(
            request_id=req.id,
            admin_user=admin_user,
            response="This falls outside our current scope of services.",
            action="reject",
        )
        assert rejected.status == "rejected"

    def test_mark_in_progress(self, client_user, admin_user):
        req = create_request(user=client_user, description="Complex request needing investigation.", priority="high")
        in_prog = respond_to_request(
            request_id=req.id,
            admin_user=admin_user,
            response="Under investigation.",
            action="in_progress",
        )
        assert in_prog.status == "in_progress"
        # responded_at should NOT be set for in_progress (only for final resolutions)
        assert in_prog.responded_at is None

    def test_cannot_respond_twice(self, client_user, admin_user):
        req = create_request(user=client_user, description="Simple question.", priority="low")
        respond_to_request(
            request_id=req.id,
            admin_user=admin_user,
            response="Here is the answer to your question.",
            action="resolve",
        )
        with pytest.raises(ApplicationError, match="already been handled"):
            respond_to_request(
                request_id=req.id,
                admin_user=admin_user,
                response="Another response attempt.",
                action="resolve",
            )