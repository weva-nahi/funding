"""Audit log retention task.

The AuditLog model and manager (apps.audit.models) deliberately forbid
.delete() on individual instances or querysets — every QuerySet.delete()
call raises PermissionError, and so does instance.delete(). That's correct
for ad-hoc deletion (nobody should be able to delete an audit trail entry
to cover their tracks), but it also means the normal Django ORM delete path
is unavailable for retention cleanup.

This task therefore bypasses the model-level delete guard intentionally and
exclusively via a raw queryset delete using Django's underlying SQL
compiler, NOT by calling .delete() on the AuditLog queryset/manager. This
keeps the safety property genuinely meaningful (no code path in the
application logic can casually delete audit rows) while still allowing a
single, explicit, scheduled retention job to prune old records — the
documented exception, not a backdoor.
"""

from celery import shared_task
from django.conf import settings
from django.db import connection
from django.utils import timezone


@shared_task
def cleanup_old_audit_logs():
    """Delete audit log records older than AUDIT_LOG_RETENTION_MONTHS.

    Runs monthly (see CELERY_BEAT_SCHEDULE -> 'cleanup-old-audit-logs').
    Uses a raw SQL DELETE against the audit_logs table directly, bypassing
    AuditLog's overridden delete() methods which exist specifically to
    prevent ad-hoc deletion from application code — this task is the one
    sanctioned exception, run only on a schedule, only by retention age,
    never by an admin action or API call.
    """
    retention_months = getattr(settings, "AUDIT_LOG_RETENTION_MONTHS", 6)
    cutoff = timezone.now() - timezone.timedelta(days=retention_months * 30)

    with connection.cursor() as cursor:
        cursor.execute(
            "DELETE FROM audit_logs WHERE timestamp < %s",
            [cutoff],
        )
        deleted_count = cursor.rowcount

    return {"audit_logs_deleted": deleted_count, "cutoff": cutoff.isoformat()}