from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from . import selectors, services
from .serializers import OrganizationSerializer


class OrganizationView(APIView):
    @extend_schema(responses={200: OrganizationSerializer}, tags=["Organizations"])
    def get(self, request):
        org = selectors.get_organization_by_user(user=request.user)
        if not org:
            return Response({"detail": "No organization found."}, status=404)
        return Response(OrganizationSerializer(org).data)

    @extend_schema(request=OrganizationSerializer, responses={201: OrganizationSerializer}, tags=["Organizations"])
    def post(self, request):
        serializer = OrganizationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        org = services.create_organization(user=request.user, **serializer.validated_data)
        return Response(OrganizationSerializer(org).data, status=status.HTTP_201_CREATED)

    @extend_schema(request=OrganizationSerializer, responses={200: OrganizationSerializer}, tags=["Organizations"])
    def patch(self, request):
        org = selectors.get_organization_by_user(user=request.user)
        if not org:
            return Response({"detail": "No organization found."}, status=404)
        org = services.update_organization(organization=org, **request.data)
        return Response(OrganizationSerializer(org).data)
