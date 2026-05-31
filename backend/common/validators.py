"""Common validators for file upload and data integrity."""

import magic
from django.conf import settings

from .exceptions import InvalidFileError


def validate_file_type(file_obj):
    """Validate file type using magic bytes, not file extension."""
    mime = magic.from_buffer(file_obj.read(2048), mime=True)
    file_obj.seek(0)

    if mime not in settings.ALLOWED_FILE_TYPES:
        raise InvalidFileError(
            f"File type '{mime}' is not allowed. " f"Allowed types: {', '.join(settings.ALLOWED_FILE_TYPES)}"
        )
    return mime


def validate_file_size(file_obj):
    """Validate file size against maximum."""
    if file_obj.size > settings.MAX_FILE_SIZE_BYTES:
        raise InvalidFileError(
            f"File size {file_obj.size / (1024*1024):.1f}MB exceeds " f"maximum of {settings.MAX_FILE_SIZE_MB}MB."
        )
