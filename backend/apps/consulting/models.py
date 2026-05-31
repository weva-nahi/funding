"""Consulting request models."""

from django.conf import settings
from django.db import models

from common.mixins import TimestampMixin


class ConsultingRequest(TimestampMixin):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("in_progress", "In Progress"),
        ("resolved", "Resolved"),
        ("rejected", "Rejected"),
    ]
    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="consulting_requests")
    description = models.TextField()
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="medium")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    admin_response = models.TextField(blank=True)
    responded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="consulting_responses"
    )
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "consulting_requests"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Consulting #{self.id} — {self.user.email}"
