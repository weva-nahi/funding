from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from common.pagination import LargePagination
from common.permissions import IsAdmin

from . import selectors
from .serializers import AuditLogSerializer


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
