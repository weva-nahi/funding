from django.http import FileResponse
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.applications.selectors import get_application_by_id

from . import selectors, services
from .serializers import DocumentSerializer, DocumentUploadSerializer


class DocumentUploadView(APIView):
    parser_classes = [MultiPartParser]

    @extend_schema(request=DocumentUploadSerializer, responses={201: DocumentSerializer}, tags=["Documents"])
    def post(self, request):
        application_id = request.data.get("application_id")
        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response({"error": "No file provided."}, status=400)

        application = get_application_by_id(application_id=application_id)
        if application.user != request.user and request.user.role != "admin":
            return Response({"error": "Permission denied."}, status=403)

        doc = services.upload_document(application=application, file_obj=file_obj)
        return Response(DocumentSerializer(doc).data, status=status.HTTP_201_CREATED)


class DocumentListView(APIView):
    @extend_schema(responses={200: DocumentSerializer(many=True)}, tags=["Documents"])
    def get(self, request, application_id):
        docs = selectors.get_documents_for_application(application_id=application_id)
        return Response(DocumentSerializer(docs, many=True).data)


class DocumentDeleteView(APIView):
    @extend_schema(tags=["Documents"])
    def delete(self, request, pk):
        services.delete_document(document_id=pk, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class DocumentDownloadView(APIView):
    @extend_schema(tags=["Documents"])
    def get(self, request, pk):
        doc = selectors.get_document_by_id(document_id=pk)
        if doc.application.user != request.user and request.user.role != "admin":
            return Response({"error": "Permission denied."}, status=403)
        return FileResponse(doc.file.open(), as_attachment=True, filename=doc.original_filename)
