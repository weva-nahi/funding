"""Common validators for file upload and data integrity."""

import magic
from django.conf import settings

from .exceptions import InvalidFileError


def validate_file_type(file_obj):
    """Validate file type using magic bytes, not file extension."""
    pos = file_obj.tell() if hasattr(file_obj, "tell") else 0
    chunk = file_obj.read(2048)
    if hasattr(file_obj, "seek"):
        file_obj.seek(pos)
    mime = magic.from_buffer(chunk, mime=True)

    if mime not in settings.ALLOWED_FILE_TYPES:
        raise InvalidFileError(
            f"File type '{mime}' is not allowed. Allowed types: {', '.join(settings.ALLOWED_FILE_TYPES)}"
        )
    return mime


def validate_file_size(file_obj):
    """Validate file size against maximum."""
    size = getattr(file_obj, "size", None)
    if size is None:
        return
    if size > settings.MAX_FILE_SIZE_BYTES:
        raise InvalidFileError(
            f"File size {size / (1024 * 1024):.1f}MB exceeds maximum of {settings.MAX_FILE_SIZE_MB}MB."
        )