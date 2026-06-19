"""Funding Opportunity models."""

from django.conf import settings
from django.db import models

from common.mixins import TimestampMixin


class FundingOpportunity(TimestampMixin):
    """A climate funding opportunity from an international source."""

    SOURCE_CHOICES = [
        ("GEF", "Global Environment Facility"),
        ("GCF", "Green Climate Fund"),
        ("OECD", "OECD"),
        ("CLIMATE_FUND", "Climate Fund"),
        ("WORLD_BANK", "World Bank"),
        ("AFD", "Agence Française de Développement"),
        ("EU", "European Union"),
    ]

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("published", "Published"),
        ("archived", "Archived"),
    ]

    FUNDING_TYPE_CHOICES = [
        ("grant", "Grant"),
        ("loan", "Loan"),
        ("concessional", "Concessional"),
        ("blended", "Blended"),
    ]

    title = models.CharField(max_length=500, db_index=True)
    source = models.CharField(max_length=50, choices=SOURCE_CHOICES, db_index=True)
    description = models.TextField(blank=True)
    country = models.CharField(max_length=100, blank=True, db_index=True)
    amount = models.DecimalField(max_digits=20, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=10, default="USD")
    deadline = models.DateField(null=True, blank=True, db_index=True)
    eligibility_criteria = models.TextField(blank=True)
    required_documents = models.TextField(blank=True)
    funding_type = models.CharField(max_length=20, choices=FUNDING_TYPE_CHOICES, blank=True, db_index=True)
    sector = models.CharField(max_length=100, blank=True, db_index=True)
    completeness_score = models.IntegerField(default=0)
    hash = models.CharField(max_length=64, unique=True, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    url = models.URLField(max_length=1000, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(
        "authentication.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="created_opportunities"
    )
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "funding_opportunities"
        ordering = ["-created_at"]
        verbose_name_plural = "Funding Opportunities"

    def __str__(self):
        return self.title

    @property
    def is_expired(self):
        from common.utils.dates import is_deadline_passed

        return is_deadline_passed(self.deadline)


class SavedOpportunity(TimestampMixin):
    """A user's bookmarked opportunity ('Sauvegarder pour plus tard')."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="saved_opportunities",
    )
    opportunity = models.ForeignKey(
        FundingOpportunity,
        on_delete=models.CASCADE,
        related_name="saves",
    )

    class Meta:
        db_table = "saved_opportunities"
        unique_together = ["user", "opportunity"]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user_id} saved {self.opportunity_id}"