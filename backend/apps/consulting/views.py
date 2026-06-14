from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.exceptions import NotFoundError
from common.pagination import StandardPagination
from common.permissions import IsAdmin

from . import selectors, services
from .serializers import ConsultingCreateSerializer, ConsultingRequestSerializer, ConsultingRespondSerializer


class ClientConsultingListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: ConsultingRequestSerializer(many=True)}, tags=["Consulting"])
    def get(self, request):
        reqs = selectors.get_user_requests(user=request.user)
        return Response(ConsultingRequestSerializer(reqs, many=True).data)

    @extend_schema(
        request=ConsultingCreateSerializer, responses={201: ConsultingRequestSerializer}, tags=["Consulting"]
    )
    def post(self, request):
        serializer = ConsultingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        req = services.create_request(user=request.user, **serializer.validated_data)
        return Response(ConsultingRequestSerializer(req).data, status=status.HTTP_201_CREATED)


class ClientConsultingDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: ConsultingRequestSerializer}, tags=["Consulting"])
    def get(self, request, pk):
        req = selectors.get_request_by_id(request_id=pk)
        if req.user != request.user:
            raise NotFoundError()
        return Response(ConsultingRequestSerializer(req).data)


class AdminConsultingListView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(responses={200: ConsultingRequestSerializer(many=True)}, tags=["Consulting"])
    def get(self, request):
        reqs = selectors.get_all_requests(
            status=request.query_params.get("status"),
            priority=request.query_params.get("priority"),
        )
        paginator = StandardPagination()
        page = paginator.paginate_queryset(reqs, request)
        return paginator.get_paginated_response(ConsultingRequestSerializer(page, many=True).data)


class AdminConsultingRespondView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(request=ConsultingRespondSerializer, tags=["Consulting"])
    def post(self, request, pk):
        serializer = ConsultingRespondSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        req = services.respond_to_request(
            request_id=pk,
            admin_user=request.user,
            response=serializer.validated_data["response"],
            action=serializer.validated_data["action"],
        )
        return Response(ConsultingRequestSerializer(req).data)