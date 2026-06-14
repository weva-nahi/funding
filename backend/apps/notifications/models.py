"""Notification models."""

from django.conf import settings
from django.db import models

from common.mixins import TimestampMixin


class Notification(TimestampMixin):
    """Persistent notification for a user."""

    TYPE_CHOICES = [
        ("application_status", "Application Status"),
        ("consulting_response", "Consulting Response"),
        ("new_opportunity", "New Opportunity"),
        ("scraping_complete", "Scraping Complete"),
        ("system", "System Announcement"),
        ("deadline_reminder", "Deadline Reminder"),
    ]

    CATEGORY_CHOICES = [
        ("application", "Application"),
        ("consulting", "Consulting"),
        ("opportunity", "Opportunity"),
        ("scraping", "Scraping"),
        ("system", "System"),
    ]

    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("urgent", "Urgent"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    message = models.TextField()
    notification_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="system")
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="medium")
    is_read = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    link = models.CharField(max_length=500, blank=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_read", "is_archived"], name="notif_user_read_arch_idx"),
        ]

    def __str__(self):
        return f"{self.notification_type}: {self.message[:50]}"