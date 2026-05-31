"""Reusable model mixins."""

from django.db import models


class TimestampMixin(models.Model):
    """Adds created_at and updated_at timestamps."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
