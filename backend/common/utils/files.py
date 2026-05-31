"""File processing utilities."""

import io

from PIL import Image


def strip_exif_and_resize(file_obj, max_size=(800, 800)):
    """Strip EXIF metadata and resize image."""
    img = Image.open(file_obj)

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
