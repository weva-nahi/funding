"""Document services."""

from django.core.files.base import ContentFile

from common.exceptions import InvalidFileError
from common.utils.files import strip_exif_and_resize
from common.utils.hashing import generate_file_hash
from common.validators import validate_file_size, validate_file_type

from .models import ApplicationDocument


def upload_document(*, application, file_obj) -> ApplicationDocument:
    validate_file_size(file_obj)
    mime_type = validate_file_type(file_obj)
    file_hash = generate_file_hash(file_obj)

    if ApplicationDocument.objects.filter(application=application, hash=file_hash).exists():
        raise InvalidFileError("This file has already been uploaded.")

    if mime_type.startswith("image/"):
        processed = strip_exif_and_resize(file_obj)
        file_obj = ContentFile(processed.read(), name=file_obj.name)

    doc = ApplicationDocument.objects.create(
        application=application,
        file=file_obj,
        original_filename=file_obj.name,
        file_type=mime_type,
        file_size=file_obj.size,
        hash=file_hash,
        validation_status="valid",
    )
    return doc


def delete_document(*, document_id: int, user) -> None:
    doc = ApplicationDocument.objects.select_related("application").get(id=document_id)
    if doc.application.user != user:
        raise InvalidFileError("You don't have permission to delete this document.")
    if doc.application.status not in ("draft",):
        raise InvalidFileError("Documents can only be deleted from draft applications.")
    doc.file.delete(save=False)
    doc.delete()
