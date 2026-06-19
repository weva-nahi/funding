from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.pagination import StandardPagination
from common.permissions import IsAdmin

from . import selectors, services
from .serializers import (
    BulkPublishSerializer,
    ExcelImportSerializer,
    FundingOpportunityListSerializer,
    FundingOpportunitySerializer,
    OpportunityCreateSerializer,
    OpportunityUpdateSerializer,
)


class PublicOpportunityListView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(responses={200: FundingOpportunityListSerializer(many=True)}, tags=["Opportunities"])
    def get(self, request):
        opportunities = selectors.get_published_opportunities(
            search=request.query_params.get("search"),
            source=request.query_params.get("source"),
            country=request.query_params.get("country"),
            amount_min=request.query_params.get("amount_min"),
            amount_max=request.query_params.get("amount_max"),
            funding_type=request.query_params.get("funding_type"),
            sector=request.query_params.get("sector"),
            min_completeness=request.query_params.get("min_completeness"),
            has_deadline=request.query_params.get("has_deadline"),
        )
        paginator = StandardPagination()
        page = paginator.paginate_queryset(opportunities, request)

        saved_ids = None
        if request.user and request.user.is_authenticated:
            saved_ids = selectors.get_saved_opportunity_ids(user=request.user)

        serializer = FundingOpportunityListSerializer(
            page, many=True, context={"request": request, "saved_ids": saved_ids}
        )
        return paginator.get_paginated_response(serializer.data)


class OpportunityDetailView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(responses={200: FundingOpportunitySerializer}, tags=["Opportunities"])
    def get(self, request, pk):
        opportunity = selectors.get_opportunity_by_id(opportunity_id=pk)
        return Response(
            FundingOpportunitySerializer(opportunity, context={"request": request}).data
        )


# ─── Save-for-later ───────────────────────────────────────────────────────────

class SavedOpportunityListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: FundingOpportunityListSerializer(many=True)}, tags=["Opportunities"])
    def get(self, request):
        opportunities = selectors.get_saved_opportunities(user=request.user)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(opportunities, request)
        saved_ids = selectors.get_saved_opportunity_ids(user=request.user)
        serializer = FundingOpportunityListSerializer(
            page, many=True, context={"request": request, "saved_ids": saved_ids}
        )
        return paginator.get_paginated_response(serializer.data)


class SaveOpportunityView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Opportunities"])
    def post(self, request, pk):
        opportunity = selectors.get_opportunity_by_id(opportunity_id=pk)
        services.save_opportunity(user=request.user, opportunity=opportunity)
        return Response({"success": True, "saved": True}, status=status.HTTP_201_CREATED)

    @extend_schema(tags=["Opportunities"])
    def delete(self, request, pk):
        services.unsave_opportunity(user=request.user, opportunity_id=pk)
        return Response({"success": True, "saved": False}, status=status.HTTP_200_OK)


class AdminOpportunityListView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(responses={200: FundingOpportunityListSerializer(many=True)}, tags=["Opportunities"])
    def get(self, request):
        opportunities = selectors.get_all_opportunities(
            status_filter=request.query_params.get("status"),
            search=request.query_params.get("search"),
        )
        paginator = StandardPagination()
        page = paginator.paginate_queryset(opportunities, request)
        return paginator.get_paginated_response(
            FundingOpportunityListSerializer(page, many=True, context={"request": request}).data
        )

    @extend_schema(request=OpportunityCreateSerializer, responses={201: FundingOpportunitySerializer}, tags=["Opportunities"])
    def post(self, request):
        serializer = OpportunityCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        opportunity = services.create_opportunity(created_by=request.user, **serializer.validated_data)
        return Response(
            FundingOpportunitySerializer(opportunity, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class AdminOpportunityDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(responses={200: FundingOpportunitySerializer}, tags=["Opportunities"])
    def get(self, request, pk):
        opportunity = selectors.get_opportunity_by_id(opportunity_id=pk)
        return Response(
            FundingOpportunitySerializer(opportunity, context={"request": request}).data
        )

    @extend_schema(request=OpportunityUpdateSerializer, responses={200: FundingOpportunitySerializer}, tags=["Opportunities"])
    def patch(self, request, pk):
        opportunity = selectors.get_opportunity_by_id(opportunity_id=pk)
        serializer = OpportunityUpdateSerializer(opportunity, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        opportunity = services.update_opportunity(opportunity=opportunity, **serializer.validated_data)
        return Response(
            FundingOpportunitySerializer(opportunity, context={"request": request}).data
        )

    @extend_schema(tags=["Opportunities"])
    def delete(self, request, pk):
        opportunity = selectors.get_opportunity_by_id(opportunity_id=pk)
        opportunity.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PublishOpportunityView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(tags=["Opportunities"])
    def post(self, request, pk):
        opportunity = selectors.get_opportunity_by_id(opportunity_id=pk)
        services.publish_opportunity(opportunity=opportunity, user=request.user)
        return Response({"success": True, "message": "Opportunity published."})


class BulkPublishView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(request=BulkPublishSerializer, tags=["Opportunities"])
    def post(self, request):
        serializer = BulkPublishSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = services.bulk_publish_opportunities(
            ids=serializer.validated_data["ids"], user=request.user
        )
        return Response({"success": True, **result})


class ArchiveOpportunityView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(tags=["Opportunities"])
    def post(self, request, pk):
        opportunity = selectors.get_opportunity_by_id(opportunity_id=pk)
        services.archive_opportunity(opportunity=opportunity)
        return Response({"success": True, "message": "Opportunity archived."})


class ExcelImportView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    parser_classes = [MultiPartParser]

    @extend_schema(request=ExcelImportSerializer, tags=["Opportunities"])
    def post(self, request):
        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response({"error": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)
        result = services.import_opportunities_from_xlsx(file_obj=file_obj, created_by=request.user)
        return Response(result, status=status.HTTP_201_CREATED)