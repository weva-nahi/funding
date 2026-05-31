"""Document models for application file attachments."""

from django.db import models

from common.mixins import TimestampMixin


class ApplicationDocument(TimestampMixin):
    """File attached to a funding application."""

    VALIDATION_CHOICES = [
        ("pending", "Pending"),
        ("valid", "Valid"),
        ("invalid", "Invalid"),
    ]

    application = models.ForeignKey("applications.Application", on_delete=models.CASCADE, related_name="documents")
    file = models.FileField(upload_to="documents/")
    original_filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=100, blank=True)
    file_size = models.IntegerField(default=0)
    hash = models.CharField(max_length=64, db_index=True)
    validation_status = models.CharField(max_length=20, choices=VALIDATION_CHOICES, default="pending")

    class Meta:
        db_table = "application_documents"

    def __str__(self):
        return self.original_filename
