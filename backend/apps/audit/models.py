"""Audit log models — immutable, non-deletable."""

from django.conf import settings
from django.db import models


class AuditLogQuerySet(models.QuerySet):
    def delete(self, *args, **kwargs):
        raise PermissionError("Audit logs cannot be deleted.")


class AuditLogManager(models.Manager):
    def get_queryset(self):
        return AuditLogQuerySet(self.model, using=self._db)


class AuditLog(models.Model):
    """Immutable audit trail entry."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="audit_logs")
    action = models.CharField(max_length=50, db_index=True)
    model_name = models.CharField(max_length=100, db_index=True)
    record_id = models.IntegerField(null=True)
    data_before = models.JSONField(default=dict, blank=True)
    data_after = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    ip_address = models.GenericIPAddressField(null=True)
    user_agent = models.TextField(blank=True)

    objects = AuditLogManager()

    class Meta:
        db_table = "audit_logs"
        ordering = ["-timestamp"]
        managed = True

    def __str__(self):
        return f"{self.action} on {self.model_name} #{self.record_id}"

    def delete(self, *args, **kwargs):
        raise PermissionError("Audit logs cannot be deleted.")

    def save(self, *args, **kwargs):
        if self.pk:
            raise PermissionError("Audit logs cannot be modified.")
        super().save(*args, **kwargs)