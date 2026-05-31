"""Audit log services — write only (create)."""

from .models import AuditLog


def create_audit_log(
    *, user=None, action, model_name, record_id=None, data_before=None, data_after=None, ip_address=None, user_agent=""
):
    return AuditLog.objects.create(
        user=user,
        action=action,
        model_name=model_name,
        record_id=record_id,
        data_before=data_before or {},
        data_after=data_after or {},
        ip_address=ip_address,
        user_agent=user_agent,
    )
