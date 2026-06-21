"""Tests for audit log endpoints and the retention cleanup task."""

import pytest
from django.utils import timezone
from datetime import timedelta

from apps.audit.models import AuditLog
from apps.audit.services import create_audit_log
from apps.audit.tasks import cleanup_old_audit_logs


@pytest.mark.django_db
class TestAuditLogDetailEndpoint:
    def test_detail_endpoint_returns_full_record(self, admin_api_client):
        log = create_audit_log(
            action="UPDATE",
            model_name="opportunity",
            record_id=42,
            data_before={"amount": 100},
            data_after={"amount": 200},
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0 Test",
        )
        response = admin_api_client.get(f"/api/v1/audit/logs/{log.id}/")
        assert response.status_code == 200
        assert response.data["data_before"] == {"amount": 100}
        assert response.data["data_after"] == {"amount": 200}
        assert response.data["user_agent"] == "Mozilla/5.0 Test"

    def test_detail_endpoint_requires_admin(self, auth_api_client):
        log = create_audit_log(action="CREATE", model_name="opportunity", record_id=1)
        response = auth_api_client.get(f"/api/v1/audit/logs/{log.id}/")
        assert response.status_code == 403

    def test_list_endpoint_excludes_heavy_fields(self, admin_api_client):
        """The list view intentionally omits data_before/data_after/user_agent
        for pagination performance — only the detail view returns them."""
        create_audit_log(
            action="CREATE", model_name="opportunity", record_id=1,
            data_before={"x": 1}, data_after={"x": 2},
        )
        response = admin_api_client.get("/api/v1/audit/logs/")
        assert response.status_code == 200
        assert "data_before" not in response.data["results"][0]
        assert "data_after" not in response.data["results"][0]


@pytest.mark.django_db
class TestAuditLogRetentionTask:
    def test_old_logs_deleted(self):
        old_log = create_audit_log(action="CREATE", model_name="test", record_id=1)
        AuditLog.objects.filter(id=old_log.id).update(
            timestamp=timezone.now() - timedelta(days=250)
        )

        recent_log = create_audit_log(action="CREATE", model_name="test", record_id=2)

        result = cleanup_old_audit_logs()

        assert not AuditLog.objects.filter(id=old_log.id).exists()
        assert AuditLog.objects.filter(id=recent_log.id).exists()
        assert result["audit_logs_deleted"] >= 1

    def test_recent_logs_not_deleted(self):
        log = create_audit_log(action="CREATE", model_name="test", record_id=1)
        cleanup_old_audit_logs()
        assert AuditLog.objects.filter(id=log.id).exists()