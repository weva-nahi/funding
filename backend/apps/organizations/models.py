"""Organization models."""

from django.db import models

from common.mixins import TimestampMixin


class Organization(TimestampMixin):
    """Mauritanian business entity."""

    SIZE_CHOICES = [
        ("micro", "Micro (1-10)"),
        ("small", "Small (11-50)"),
        ("medium", "Medium (51-250)"),
        ("large", "Large (250+)"),
    ]

    user = models.OneToOneField("authentication.User", on_delete=models.CASCADE, related_name="organization")
    name = models.CharField(max_length=255)
    registration_number = models.CharField(max_length=100, blank=True, unique=True, null=True)
    industry = models.CharField(max_length=100, blank=True)
    size = models.CharField(max_length=20, choices=SIZE_CHOICES, blank=True)
    location = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    website = models.URLField(blank=True)

    class Meta:
        db_table = "organizations"

    def __str__(self):
        return self.name
