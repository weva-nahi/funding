import pytest
from rest_framework.test import APIClient

from apps.authentication.models import User


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(db):
    user = User.objects.create_superuser(email="admin@richat.mr", password="password123")
    return user


@pytest.fixture
def client_user(db):
    user = User.objects.create_user(email="client@richat.mr", password="password123", role="client")
    return user


@pytest.fixture
def auth_api_client(api_client, client_user):
    api_client.force_authenticate(user=client_user)
    return api_client


@pytest.fixture
def admin_api_client(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    return api_client
