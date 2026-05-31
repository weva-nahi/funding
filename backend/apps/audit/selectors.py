"""Audit log selectors."""

from .models import AuditLog


def get_audit_logs(*, user_id=None, action=None, model_name=None, date_from=None, date_to=None):
    qs = AuditLog.objects.select_related("user").all()
    if user_id:
        qs = qs.filter(user_id=user_id)
    if action:
        qs = qs.filter(action=action)
    if model_name:
        qs = qs.filter(model_name=model_name)
    if date_from:
        qs = qs.filter(timestamp__gte=date_from)
    if date_to:
        qs = qs.filter(timestamp__lte=date_to)
    return qs.order_by("-timestamp")
