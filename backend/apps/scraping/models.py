"""Scraping models."""

from django.conf import settings
from django.db import models

from common.mixins import TimestampMixin


class ScrapingJob(TimestampMixin):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("running", "Running"),
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("cancelled", "Cancelled"),
    ]

    source = models.CharField(max_length=100)
    pages_scraped = models.IntegerField(default=0)
    projects_found = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    error_log = models.TextField(blank=True)
    triggered_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)

    class Meta:
        db_table = "scraping_jobs"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.source} — {self.status}"


class ScrapingAlert(TimestampMixin):
    PRIORITY_CHOICES = [
        ("urgent", "Urgent"),
        ("high", "High"),
        ("medium", "Medium"),
        ("low", "Low"),
    ]
    STATUS_CHOICES = [
        ("new", "New"),
        ("published", "Published"),
        ("archived", "Archived"),
        ("ignored", "Ignored"),
    ]

    opportunity = models.ForeignKey("opportunities.FundingOpportunity", on_delete=models.CASCADE, related_name="alerts")
    job = models.ForeignKey(ScrapingJob, on_delete=models.CASCADE, related_name="alerts")
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="medium")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="new")

    class Meta:
        db_table = "scraping_alerts"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Alert #{self.id} ({self.priority}/{self.status})"