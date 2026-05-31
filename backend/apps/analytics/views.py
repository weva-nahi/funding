from django.http import HttpResponse
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsAdmin

from . import selectors


class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(tags=["Analytics"])
    def get(self, request):
        return Response(selectors.get_dashboard_stats())


class ActivityChartView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(tags=["Analytics"])
    def get(self, request):
        days = int(request.query_params.get("days", 14))
        data = list(selectors.get_activity_chart(days=days))
        for item in data:
            item["day"] = item["day"].strftime("%Y-%m-%d")
        return Response(data)


class StatusDistributionView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(tags=["Analytics"])
    def get(self, request):
        return Response(list(selectors.get_status_distribution()))


class ApprovalRateView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(tags=["Analytics"])
    def get(self, request):
        months = int(request.query_params.get("months", 6))
        data = list(selectors.get_approval_rate_by_month(months=months))
        for item in data:
            item["month"] = item["month"].strftime("%Y-%m")
        return Response(data)


class TopSourcesView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(tags=["Analytics"])
    def get(self, request):
        return Response(list(selectors.get_top_sources()))


class ClientActivityView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(tags=["Analytics"])
    def get(self, request):
        return Response(list(selectors.get_client_activity()))


class AvgProcessingTimeView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(tags=["Analytics"])
    def get(self, request):
        return Response(selectors.get_avg_processing_time())


class ExportCSVView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(tags=["Analytics"])
    def get(self, request):
        csv_content = selectors.export_analytics_csv()
        response = HttpResponse(csv_content, content_type="text/csv")
        response["Content-Disposition"] = "attachment; filename=analytics.csv"
        return response
