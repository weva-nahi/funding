from .models import ApplicationDocument


def get_documents_for_application(*, application_id: int):
    return ApplicationDocument.objects.filter(application_id=application_id).order_by("-created_at")


def get_document_by_id(*, document_id: int) -> ApplicationDocument:
    return ApplicationDocument.objects.select_related("application", "application__user").get(id=document_id)
