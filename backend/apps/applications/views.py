from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.opportunities.selectors import get_opportunity_by_id
from common.exceptions import NotFoundError
from common.pagination import StandardPagination
from common.permissions import IsAdmin

from . import selectors, services
from .serializers import (
    ApplicationCreateSerializer,
    ApplicationDetailSerializer,
    ApplicationListSerializer,
    ApplicationReviewSerializer,
    ApplicationUpdateSerializer,
    BulkShortlistSerializer,
)


class ClientApplicationListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: ApplicationListSerializer(many=True)}, tags=["Applications"])
    def get(self, request):
        apps = selectors.get_user_applications(
            user=request.user,
            status_filter=request.query_params.get("status"),
        )
        paginator = StandardPagination()
        page = paginator.paginate_queryset(apps, request)
        return paginator.get_paginated_response(ApplicationListSerializer(page, many=True).data)

    @extend_schema(
        request=ApplicationCreateSerializer, responses={201: ApplicationDetailSerializer}, tags=["Applications"]
    )
    def post(self, request):
        serializer = ApplicationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        opportunity = get_opportunity_by_id(opportunity_id=serializer.validated_data["opportunity_id"])
        app = services.create_draft(user=request.user, opportunity=opportunity)
        return Response(ApplicationDetailSerializer(app).data, status=status.HTTP_201_CREATED)


class ClientApplicationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: ApplicationDetailSerializer}, tags=["Applications"])
    def get(self, request, pk):
        app = selectors.get_application_by_id(application_id=pk)
        if app.user != request.user and request.user.role != "admin":
            raise NotFoundError()
        return Response(ApplicationDetailSerializer(app).data)

    @extend_schema(request=ApplicationUpdateSerializer, tags=["Applications"])
    def patch(self, request, pk):
        app = selectors.get_application_by_id(application_id=pk)
        if app.user != request.user:
            raise NotFoundError()
        serializer = ApplicationUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        app = services.update_draft(application=app, **serializer.validated_data)
        return Response(ApplicationDetailSerializer(app).data)


class SubmitApplicationView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Applications"])
    def post(self, request, pk):
        app = selectors.get_application_by_id(application_id=pk)
        if app.user != request.user:
            raise NotFoundError()
        app = services.submit_application(application=app, user=request.user)
        return Response(ApplicationDetailSerializer(app).data)


class WithdrawApplicationView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Applications"])
    def post(self, request, pk):
        app = selectors.get_application_by_id(application_id=pk)
        if app.user != request.user:
            raise NotFoundError()
        app = services.withdraw_application(application=app, user=request.user)
        return Response(ApplicationDetailSerializer(app).data)


# ─── Admin Views ───


class AdminApplicationListView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(responses={200: ApplicationListSerializer(many=True)}, tags=["Applications"])
    def get(self, request):
        apps = selectors.get_all_applications(
            status_filter=request.query_params.get("status"),
            search=request.query_params.get("search"),
        )
        paginator = StandardPagination()
        page = paginator.paginate_queryset(apps, request)
        return paginator.get_paginated_response(ApplicationListSerializer(page, many=True).data)


class AdminShortlistView(APIView):
    """Dedicated view of the shortlist pool — separates 'still deciding'
    from the raw pending queue so admins have a clear working set when
    comparing finalists before picking a winner."""

    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(responses={200: ApplicationListSerializer(many=True)}, tags=["Applications"])
    def get(self, request):
        apps = selectors.get_shortlisted_applications(
            opportunity_id=request.query_params.get("opportunity_id"),
        )
        paginator = StandardPagination()
        page = paginator.paginate_queryset(apps, request)
        return paginator.get_paginated_response(ApplicationListSerializer(page, many=True).data)


class BulkShortlistView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(request=BulkShortlistSerializer, tags=["Applications"])
    def post(self, request):
        serializer = BulkShortlistSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = services.bulk_shortlist(
            application_ids=serializer.validated_data["ids"], admin_user=request.user
        )
        return Response({"success": True, **result})


class AdminApplicationDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(responses={200: ApplicationDetailSerializer}, tags=["Applications"])
    def get(self, request, pk):
        app = selectors.get_application_by_id(application_id=pk)
        return Response(ApplicationDetailSerializer(app).data)


class ReviewApplicationView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(request=ApplicationReviewSerializer, tags=["Applications"])
    def post(self, request, pk):
        serializer = ApplicationReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        app = selectors.get_application_by_id(application_id=pk)
        action = serializer.validated_data["action"]

        if action == "approve":
            app = services.approve_application(
                application=app,
                admin_user=request.user,
                comment=serializer.validated_data.get("comment", ""),
            )
        elif action == "reject":
            app = services.reject_application(
                application=app,
                admin_user=request.user,
                reason=serializer.validated_data.get("reason", ""),
            )
        elif action == "in_review":
            app = services.set_in_review(application=app, admin_user=request.user)
        elif action == "shortlist":
            app = services.shortlist_application(
                application=app,
                admin_user=request.user,
                comment=serializer.validated_data.get("comment", ""),
            )

        return Response(ApplicationDetailSerializer(app).data)


class BulkReviewView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(tags=["Applications"])
    def post(self, request):
        ids = request.data.get("ids", [])
        action = request.data.get("action")
        comment = request.data.get("comment", "")
        reason = request.data.get("reason", "")

        results = []
        for app_id in ids:
            try:
                app = selectors.get_application_by_id(application_id=app_id)
                if action == "approve":
                    services.approve_application(application=app, admin_user=request.user, comment=comment)
                elif action == "reject":
                    services.reject_application(application=app, admin_user=request.user, reason=reason)
                results.append({"id": app_id, "success": True})
            except Exception as e:  # noqa: BLE001
                results.append({"id": app_id, "success": False, "error": str(e)})

        return Response({"results": results})