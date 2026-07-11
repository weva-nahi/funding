"""Messaging views — unified inbox aggregation across applications + consulting."""

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.models import User
from common.exceptions import NotFoundError
from common.permissions import IsAdmin

from . import selectors
from .serializers import ContactSerializer, UnifiedMessageSerializer


class ClientMergedThreadView(APIView):
    """The current client's own merged conversation with the Richat team."""

    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: UnifiedMessageSerializer(many=True)}, tags=["Messaging"])
    def get(self, request):
        messages = selectors.get_merged_thread(user=request.user)
        return Response(UnifiedMessageSerializer(messages, many=True).data)


class UnreadMessageCountView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Messaging"])
    def get(self, request):
        count = selectors.get_unread_message_count(user=request.user)
        return Response({"unread_count": count})


class AdminContactListView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(responses={200: ContactSerializer(many=True)}, tags=["Messaging"])
    def get(self, request):
        contacts = selectors.get_admin_contact_list(
            admin_user=request.user,
            search=request.query_params.get("search"),
        )
        return Response(ContactSerializer(contacts, many=True).data)


class AdminClientThreadView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(responses={200: UnifiedMessageSerializer(many=True)}, tags=["Messaging"])
    def get(self, request, user_id):
        try:
            client = User.objects.get(id=user_id, role="client")
        except User.DoesNotExist:
            raise NotFoundError()
        messages = selectors.get_admin_thread_for_client(client_user=client)
        return Response(UnifiedMessageSerializer(messages, many=True).data)
