"""Application models for funding candidatures."""

from django.conf import settings
from django.db import models

from common.mixins import TimestampMixin


class Application(TimestampMixin):
    """A client's application to a funding opportunity."""

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("shortlisted", "Shortlisted"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="applications")
    opportunity = models.ForeignKey(
        "opportunities.FundingOpportunity", on_delete=models.CASCADE, related_name="applications"
    )
    motivation_letter = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    admin_comment = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)
    version = models.IntegerField(default=1)

    class Meta:
        db_table = "applications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"], name="app_status_created_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "opportunity"],
                name="uniq_active_application_per_user_opportunity",
            ),
        ]

    def __str__(self):
        return f"{self.user.email} → {self.opportunity.title}"


class ApplicationStatusHistory(TimestampMixin):
    """Track status changes."""

    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name="status_history")
    from_status = models.CharField(max_length=20, blank=True)
    to_status = models.CharField(max_length=20)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    comment = models.TextField(blank=True)

    class Meta:
        db_table = "application_status_history"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.application_id}: {self.from_status or '∅'} → {self.to_status}"


class ApplicationMessage(TimestampMixin):
    """Chat message between client and admin on an application."""

    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="application_messages")
    content = models.TextField(blank=True)
    attachment = models.FileField(upload_to="application_messages/", null=True, blank=True)
    attachment_name = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "application_messages"
        ordering = ["created_at"]

    def __str__(self):
        return f"Message on App #{self.application_id} from {self.sender.email}"