from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.pagination import LargePagination
from common.permissions import IsAdmin

from . import selectors
from .serializers import AuditLogDetailSerializer, AuditLogSerializer


class AuditLogListView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(responses={200: AuditLogSerializer(many=True)}, tags=["Audit"])
    def get(self, request):
        logs = selectors.get_audit_logs(
            user_id=request.query_params.get("user_id"),
            action=request.query_params.get("action"),
            model_name=request.query_params.get("model"),
            date_from=request.query_params.get("date_from"),
            date_to=request.query_params.get("date_to"),
        )
        paginator = LargePagination()
        page = paginator.paginate_queryset(logs, request)
        return paginator.get_paginated_response(AuditLogSerializer(page, many=True).data)


class AuditLogDetailView(APIView):
    """Backs the click-to-expand detail panel — returns the full record
    including the before/after diff and request metadata that the list
    view intentionally omits for pagination performance."""

    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(responses={200: AuditLogDetailSerializer}, tags=["Audit"])
    def get(self, request, pk):
        log = selectors.get_audit_log_by_id(log_id=pk)
        return Response(AuditLogDetailSerializer(log).data)