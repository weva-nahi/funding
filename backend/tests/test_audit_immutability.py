"""Tests that audit logs are truly immutable."""

import pytest

from apps.audit.models import AuditLog
from apps.audit.services import create_audit_log


@pytest.mark.django_db
class TestAuditLogImmutability:
    def test_create_audit_log(self):
        log = create_audit_log(
            action="CREATE",
            model_name="opportunity",
            record_id=1,
            data_after={"title": "Test"},
        )
        assert log.pk is not None
        assert log.action == "CREATE"

    def test_cannot_delete_via_queryset(self):
        create_audit_log(action="DELETE", model_name="opportunity", record_id=2)
        with pytest.raises(PermissionError):
            AuditLog.objects.all().delete()

    def test_cannot_delete_instance(self):
        log = create_audit_log(action="UPDATE", model_name="application", record_id=3)
        with pytest.raises(PermissionError):
            log.delete()

    def test_cannot_modify_instance(self):
        log = create_audit_log(action="CREATE", model_name="user", record_id=4)
        log.action = "HACKED"
        with pytest.raises(PermissionError):
            log.save()