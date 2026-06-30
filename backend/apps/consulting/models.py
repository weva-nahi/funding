"""Consulting models — simplified to pure conversation."""

from django.conf import settings
from django.db import models

from common.mixins import TimestampMixin


class ConsultingRequest(TimestampMixin):
    """A client consulting request with a simple chat thread."""

    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
    ]

    # Simplified status: just pending (waiting for admin reply) or active (in conversation)
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("active", "Active"),
        ("closed", "Closed"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="consulting_requests")
    description = models.TextField()  # Initial message
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="medium")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    class Meta:
        db_table = "consulting_requests"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Consulting #{self.id} — {self.user.email}"


class ConsultingMessage(TimestampMixin):
    """Chat message in a consulting thread."""

    request = models.ForeignKey(ConsultingRequest, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="consulting_messages")
    content = models.TextField(blank=True)
    attachment = models.FileField(upload_to="consulting_attachments/", null=True, blank=True)
    attachment_name = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "consulting_messages"
        ordering = ["created_at"]

    def __str__(self):
        return f"Message on Consulting #{self.request_id} from {self.sender.email}"