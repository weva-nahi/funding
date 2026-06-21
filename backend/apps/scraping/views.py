from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.pagination import StandardPagination
from common.permissions import IsAdmin

from . import selectors, services
from .serializers import (
    ScrapingAlertSerializer,
    ScrapingJobSerializer,
    StartAllScrapingSerializer,
    StartScrapingSerializer,
)
from .tasks import run_all_scraping_jobs, run_scraping_job


class StartScrapingView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(request=StartScrapingSerializer, tags=["Scraping"])
    def post(self, request):
        serializer = StartScrapingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        task = run_scraping_job.delay(
            source=serializer.validated_data["source"],
            user_id=request.user.id,
        )
        return Response({"task_id": task.id, "message": "Scraping started."}, status=status.HTTP_202_ACCEPTED)


class StartAllScrapingView(APIView):
    """Admin clicks one button, every configured source starts scraping."""

    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(request=StartAllScrapingSerializer, tags=["Scraping"])
    def post(self, request):
        task = run_all_scraping_jobs.delay(user_id=request.user.id)
        return Response(
            {
                "task_id": task.id,
                "message": f"Scraping started for all {len(services.ALL_SOURCES)} sources.",
                "sources": services.ALL_SOURCES,
            },
            status=status.HTTP_202_ACCEPTED,
        )


class CancelScrapingView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(tags=["Scraping"])
    def post(self, request, job_id):
        job = selectors.get_job_by_id(job_id=job_id)
        if job.status == "running":
            job.status = "cancelled"
            job.save(update_fields=["status"])
        return Response({"success": True})


class ScrapingJobListView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(responses={200: ScrapingJobSerializer(many=True)}, tags=["Scraping"])
    def get(self, request):
        jobs = selectors.get_all_jobs(source=request.query_params.get("source"))
        paginator = StandardPagination()
        page = paginator.paginate_queryset(jobs, request)
        return paginator.get_paginated_response(ScrapingJobSerializer(page, many=True).data)


class ScrapingAlertListView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(responses={200: ScrapingAlertSerializer(many=True)}, tags=["Scraping"])
    def get(self, request):
        alerts = selectors.get_alerts(
            priority=request.query_params.get("priority"),
            status=request.query_params.get("status", "new"),
        )
        paginator = StandardPagination()
        page = paginator.paginate_queryset(alerts, request)
        return paginator.get_paginated_response(ScrapingAlertSerializer(page, many=True).data)


class AlertActionView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(tags=["Scraping"])
    def post(self, request, alert_id):
        action = request.data.get("action")
        if action == "publish":
            services.publish_alert(alert_id=alert_id)
        elif action == "archive":
            services.archive_alert(alert_id=alert_id)
        elif action == "ignore":
            services.ignore_alert(alert_id=alert_id)
        return Response({"success": True})


class BulkAlertActionView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(tags=["Scraping"])
    def post(self, request):
        ids = request.data.get("ids", [])
        action = request.data.get("action")
        for alert_id in ids:
            try:
                if action == "publish":
                    services.publish_alert(alert_id=alert_id)
                elif action == "archive":
                    services.archive_alert(alert_id=alert_id)
                elif action == "ignore":
                    services.ignore_alert(alert_id=alert_id)
            except Exception:
                continue
        return Response({"success": True})