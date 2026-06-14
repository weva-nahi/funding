from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.pagination import StandardPagination

from . import selectors, services
from .serializers import NotificationSerializer


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: NotificationSerializer(many=True)}, tags=["Notifications"])
    def get(self, request):
        category = request.query_params.get("category")
        is_read = request.query_params.get("is_read")
        if is_read is not None:
            is_read = is_read.lower() == "true"
        notifications = selectors.get_user_notifications(user=request.user, category=category, is_read=is_read)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(notifications, request)
        return paginator.get_paginated_response(NotificationSerializer(page, many=True).data)


class UnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Notifications"])
    def get(self, request):
        count = selectors.get_unread_count(user=request.user)
        return Response({"unread_count": count})


class MarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Notifications"])
    def post(self, request, pk):
        services.mark_as_read(notification_id=pk, user=request.user)
        return Response({"success": True})


class MarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Notifications"])
    def post(self, request):
        services.mark_all_as_read(user=request.user)
        return Response({"success": True})


class ArchiveView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Notifications"])
    def post(self, request, pk):
        services.archive_notification(notification_id=pk, user=request.user)
        return Response({"success": True})