"""Document services."""

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner

from common.exceptions import InvalidFileError, NotFoundError, PermissionDeniedError
from common.utils.files import strip_exif_and_resize
from common.utils.hashing import generate_file_hash
from common.validators import validate_file_size, validate_file_type

from .models import ApplicationDocument

_signer = TimestampSigner(salt="document-download")


def upload_document(*, application, file_obj) -> ApplicationDocument:
    validate_file_size(file_obj)
    mime_type = validate_file_type(file_obj)
    file_hash = generate_file_hash(file_obj)

    if ApplicationDocument.objects.filter(application=application, hash=file_hash).exists():
        raise InvalidFileError("This file has already been uploaded.")

    name = file_obj.name
    if mime_type.startswith("image/"):
        processed = strip_exif_and_resize(file_obj)
        file_obj = ContentFile(processed.read(), name=name)

    doc = ApplicationDocument.objects.create(
        application=application,
        file=file_obj,
        original_filename=name,
        file_type=mime_type,
        file_size=getattr(file_obj, "size", 0) or 0,
        hash=file_hash,
        validation_status="valid",
    )
    return doc


def delete_document(*, document_id: int, user) -> None:
    doc = ApplicationDocument.objects.select_related("application").get(id=document_id)
    if doc.application.user != user:
        raise PermissionDeniedError("You don't have permission to delete this document.")
    if doc.application.status not in ("draft",):
        raise InvalidFileError("Documents can only be deleted from draft applications.")
    doc.file.delete(save=False)
    doc.delete()


def generate_signed_token(*, document_id: int) -> str:
    """One-hour signed token authorizing a single document download."""
    return _signer.sign(str(document_id))


def resolve_signed_token(*, token: str) -> ApplicationDocument:
    try:
        raw = _signer.unsign(token, max_age=settings.SIGNED_URL_EXPIRY_SECONDS)
    except SignatureExpired:
        raise PermissionDeniedError("This download link has expired.")
    except BadSignature:
        raise PermissionDeniedError("Invalid download link.")
    try:
        return ApplicationDocument.objects.select_related("application", "application__user").get(id=int(raw))
    except ApplicationDocument.DoesNotExist:
        raise NotFoundError("Document not found.")