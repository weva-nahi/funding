from django.conf import settings
from django.http import FileResponse
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.applications.selectors import get_application_by_id
from common.exceptions import InvalidFileError, PermissionDeniedError

from . import selectors, services
from .serializers import DocumentSerializer, DocumentUploadSerializer


class DocumentUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]
    throttle_scope = "upload"
    throttle_classes = [ScopedRateThrottle]

    @extend_schema(request=DocumentUploadSerializer, responses={201: DocumentSerializer}, tags=["Documents"])
    def post(self, request):
        file_obj = request.FILES.get("file")
        if not file_obj:
            raise InvalidFileError("No file provided.")

        # Validate application_id BEFORE hitting the ORM. A missing or blank
        # value previously reached Application.objects.get(id='') and raised a
        # ValueError ("Field 'id' expected a number but got ''") → HTTP 500.
        raw_application_id = request.data.get("application_id")
        try:
            application_id = int(raw_application_id)
        except (TypeError, ValueError):
            raise InvalidFileError("A valid numeric 'application_id' is required.")

        application = get_application_by_id(application_id=application_id)
        if application.user != request.user and request.user.role != "admin":
            raise PermissionDeniedError()

        doc = services.upload_document(application=application, file_obj=file_obj)
        return Response(DocumentSerializer(doc).data, status=status.HTTP_201_CREATED)


class DocumentListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: DocumentSerializer(many=True)}, tags=["Documents"])
    def get(self, request, application_id):
        application = get_application_by_id(application_id=application_id)
        if application.user != request.user and request.user.role != "admin":
            raise PermissionDeniedError()
        docs = selectors.get_documents_for_application(application_id=application_id)
        return Response(DocumentSerializer(docs, many=True).data)


class DocumentDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Documents"])
    def delete(self, request, pk):
        services.delete_document(document_id=pk, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class DocumentSignedUrlView(APIView):
    """Issue a short-lived signed token; the file is never served via a raw URL."""

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Documents"])
    def get(self, request, pk):
        doc = selectors.get_document_by_id(document_id=pk)
        if doc.application.user != request.user and request.user.role != "admin":
            raise PermissionDeniedError()
        token = services.generate_signed_token(document_id=doc.id)
        return Response(
            {
                "url": f"/api/v1/documents/download/{token}/",
                "expires_in": settings.SIGNED_URL_EXPIRY_SECONDS,
            }
        )


class DocumentDownloadView(APIView):
    """Stream the file only when presented with a valid, unexpired signed token."""

    permission_classes = [AllowAny]

    @extend_schema(tags=["Documents"])
    def get(self, request, token):
        doc = services.resolve_signed_token(token=token)
        return FileResponse(doc.file.open(), as_attachment=True, filename=doc.original_filename)