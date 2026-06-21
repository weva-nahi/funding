"""Common validators for file upload and data integrity."""

import magic
from django.conf import settings
from PIL import Image

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

    if mime.startswith("image/"):
        validate_image_dimensions(file_obj)

    return mime


def validate_image_dimensions(file_obj):
    """Reject image uploads whose declared pixel grid is implausibly large.

    PIL's Image.open() only reads the file header (it does not decode pixel
    data), so this is a cheap, safe way to detect decompression-bomb style
    uploads — a small file that claims an enormous width/height and would
    otherwise cause downstream processing (resize, EXIF strip, thumbnailing)
    to attempt to allocate gigabytes of memory.
    """
    pos = file_obj.tell() if hasattr(file_obj, "tell") else 0
    try:
        img = Image.open(file_obj)
        width, height = img.size
    except Exception as exc:  # noqa: BLE001
        raise InvalidFileError("The uploaded file is not a valid image.") from exc
    finally:
        if hasattr(file_obj, "seek"):
            file_obj.seek(pos)

    max_dim = getattr(settings, "MAX_IMAGE_DIMENSION_PX", 8000)
    max_pixels = getattr(settings, "MAX_IMAGE_PIXELS", 25_000_000)

    if width > max_dim or height > max_dim:
        raise InvalidFileError(
            f"Image dimensions ({width}x{height}px) exceed the maximum allowed "
            f"size of {max_dim}x{max_dim}px."
        )
    if width * height > max_pixels:
        raise InvalidFileError(
            f"Image has too many pixels ({width * height:,}). Maximum allowed "
            f"is {max_pixels:,} pixels."
        )


def validate_file_size(file_obj):
    """Validate file size against maximum."""
    size = getattr(file_obj, "size", None)
    if size is None:
        return
    if size > settings.MAX_FILE_SIZE_BYTES:
        raise InvalidFileError(
            f"File size {size / (1024 * 1024):.1f}MB exceeds maximum of {settings.MAX_FILE_SIZE_MB}MB."
        )