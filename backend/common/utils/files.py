"""File processing utilities."""

import io

from django.conf import settings
from PIL import Image

from common.exceptions import InvalidFileError


def _validate_image_dimensions(img: Image.Image) -> None:
    """Reject images whose pixel grid is implausibly large for an upload.

    This MUST run before any operation that decodes full pixel data
    (getdata(), thumbnail(), etc.). PIL's Image.open() is lazy — it only
    reads the header — so checking img.size here is cheap and safe even for
    a malicious file. Without this check, a tiny (sub-1MB) crafted PNG/JPEG
    can decode into tens of thousands of pixels per side, and the
    getdata()/putdata() calls below would attempt to allocate gigabytes of
    RAM, taking down the worker process (a classic "decompression bomb").
    """
    width, height = img.size
    max_dim = getattr(settings, "MAX_IMAGE_DIMENSION_PX", 8000)
    max_pixels = getattr(settings, "MAX_IMAGE_PIXELS", 25_000_000)

    if width > max_dim or height > max_dim:
        raise InvalidFileError(
            f"Image dimensions ({width}x{height}px) exceed the maximum allowed "
            f"size of {max_dim}x{max_dim}px."
        )

    total_pixels = width * height
    if total_pixels > max_pixels:
        raise InvalidFileError(
            f"Image has too many pixels ({total_pixels:,}). Maximum allowed is "
            f"{max_pixels:,} pixels."
        )


def strip_exif_and_resize(file_obj, max_size=(800, 800)):
    """Strip EXIF metadata and resize image.

    Validates dimensions BEFORE decoding full pixel data to guard against
    decompression-bomb uploads (see _validate_image_dimensions).
    """
    img = Image.open(file_obj)

    # Cheap header-only check — must happen before getdata()/putdata().
    _validate_image_dimensions(img)

    # Remove EXIF by creating a new image without metadata
    data = list(img.getdata())
    clean_img = Image.new(img.mode, img.size)
    clean_img.putdata(data)

    # Resize if larger than max_size
    clean_img.thumbnail(max_size, Image.Resampling.LANCZOS)

    output = io.BytesIO()
    fmt = "PNG" if img.format == "PNG" else "JPEG"
    clean_img.save(output, format=fmt, quality=85)
    output.seek(0)

    return output


def get_upload_path(instance, filename):
    """Generate organized upload path: tenant/type/record_id/filename."""
    if hasattr(instance, "application"):
        user_id = instance.application.user_id
        return f"documents/{user_id}/{instance.application_id}/{filename}"
    if hasattr(instance, "user"):
        return f"avatars/{instance.user_id}/{filename}"
    return f"uploads/{filename}"