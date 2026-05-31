from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.pagination import StandardPagination
from common.permissions import IsAdmin

from . import selectors, services
from .serializers import FundingOpportunityListSerializer, FundingOpportunitySerializer, OpportunityCreateSerializer


class PublicOpportunityListView(APIView):
    permission_classes = [AllowAny]
    pagination_class = StandardPagination

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
        )
        paginator = StandardPagination()
        page = paginator.paginate_queryset(opportunities, request)
        serializer = FundingOpportunityListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class OpportunityDetailView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(responses={200: FundingOpportunitySerializer}, tags=["Opportunities"])
    def get(self, request, pk):
        opportunity = selectors.get_opportunity_by_id(opportunity_id=pk)
        return Response(FundingOpportunitySerializer(opportunity).data)


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
        serializer = FundingOpportunityListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        request=OpportunityCreateSerializer, responses={201: FundingOpportunitySerializer}, tags=["Opportunities"]
    )
    def post(self, request):
        serializer = OpportunityCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        opportunity = services.create_opportunity(**serializer.validated_data)
        return Response(
            FundingOpportunitySerializer(opportunity).data,
            status=status.HTTP_201_CREATED,
        )


class AdminOpportunityDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(responses={200: FundingOpportunitySerializer}, tags=["Opportunities"])
    def get(self, request, pk):
        opportunity = selectors.get_opportunity_by_id(opportunity_id=pk)
        return Response(FundingOpportunitySerializer(opportunity).data)

    @extend_schema(
        request=OpportunityCreateSerializer, responses={200: FundingOpportunitySerializer}, tags=["Opportunities"]
    )
    def patch(self, request, pk):
        opportunity = selectors.get_opportunity_by_id(opportunity_id=pk)
        opportunity = services.update_opportunity(opportunity=opportunity, **request.data)
        return Response(FundingOpportunitySerializer(opportunity).data)

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
        services.publish_opportunity(opportunity=opportunity)
        return Response({"success": True, "message": "Opportunity published."})


class ArchiveOpportunityView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(tags=["Opportunities"])
    def post(self, request, pk):
        opportunity = selectors.get_opportunity_by_id(opportunity_id=pk)
        services.archive_opportunity(opportunity=opportunity)
        return Response({"success": True, "message": "Opportunity archived."})
