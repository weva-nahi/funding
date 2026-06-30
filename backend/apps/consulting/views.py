from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.exceptions import NotFoundError
from common.pagination import StandardPagination
from common.permissions import IsAdmin

from . import services
from .models import ConsultingRequest
from .serializers import (
    ConsultingCreateSerializer,
    ConsultingListSerializer,
    ConsultingMessageCreateSerializer,
    ConsultingMessageSerializer,
    ConsultingRequestSerializer,
)


class ClientConsultingListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: ConsultingListSerializer(many=True)}, tags=["Consulting"])
    def get(self, request):
        reqs = ConsultingRequest.objects.filter(user=request.user).prefetch_related("messages__sender").order_by("-created_at")
        paginator = StandardPagination()
        page = paginator.paginate_queryset(reqs, request)
        return paginator.get_paginated_response(ConsultingListSerializer(page, many=True).data)

    @extend_schema(request=ConsultingCreateSerializer, responses={201: ConsultingRequestSerializer}, tags=["Consulting"])
    def post(self, request):
        serializer = ConsultingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        req = services.create_request(user=request.user, **serializer.validated_data)
        return Response(ConsultingRequestSerializer(req).data, status=status.HTTP_201_CREATED)


class ClientConsultingDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: ConsultingRequestSerializer}, tags=["Consulting"])
    def get(self, request, pk):
        try:
            req = ConsultingRequest.objects.prefetch_related("messages__sender").get(id=pk, user=request.user)
        except ConsultingRequest.DoesNotExist:
            raise NotFoundError()
        return Response(ConsultingRequestSerializer(req).data)


class ConsultingMessageView(APIView):
    """Add a message to a consulting thread."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @extend_schema(responses={200: ConsultingMessageSerializer(many=True)}, tags=["Consulting"])
    def get(self, request, pk):
        try:
            req = ConsultingRequest.objects.prefetch_related("messages__sender").get(id=pk)
        except ConsultingRequest.DoesNotExist:
            raise NotFoundError()
        if request.user.role != "admin" and req.user != request.user:
            raise NotFoundError()
        messages = req.messages.all()
        return Response(ConsultingMessageSerializer(messages, many=True).data)

    @extend_schema(request=ConsultingMessageCreateSerializer, tags=["Consulting"])
    def post(self, request, pk):
        try:
            req = ConsultingRequest.objects.get(id=pk)
        except ConsultingRequest.DoesNotExist:
            raise NotFoundError()

        if request.user.role != "admin" and req.user != request.user:
            raise NotFoundError()

        content = request.data.get("content", "")
        attachment = request.FILES.get("attachment")
        msg = services.add_message(
            request_id=pk,
            sender=request.user,
            content=content,
            attachment=attachment,
        )
        return Response(ConsultingMessageSerializer(msg).data, status=status.HTTP_201_CREATED)


class AdminConsultingListView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(responses={200: ConsultingListSerializer(many=True)}, tags=["Consulting"])
    def get(self, request):
        reqs = ConsultingRequest.objects.prefetch_related("messages__sender").all().order_by("-created_at")
        if request.query_params.get("status"):
            reqs = reqs.filter(status=request.query_params.get("status"))
        paginator = StandardPagination()
        page = paginator.paginate_queryset(reqs, request)
        return paginator.get_paginated_response(ConsultingListSerializer(page, many=True).data)


class AdminConsultingDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(responses={200: ConsultingRequestSerializer}, tags=["Consulting"])
    def get(self, request, pk):
        try:
            req = ConsultingRequest.objects.prefetch_related("messages__sender").get(id=pk)
        except ConsultingRequest.DoesNotExist:
            raise NotFoundError()
        return Response(ConsultingRequestSerializer(req).data)