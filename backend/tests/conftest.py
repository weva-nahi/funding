"""
Shared pytest fixtures for the Richat Funding Tracker test suite.

Every user fixture creates a Profile so tests don't hit RelatedObjectDoesNotExist.
"""

import pytest
from rest_framework.test import APIClient

from apps.authentication.models import Profile, User


# ─── API Clients ──────────────────────────────────────────────────────────────

@pytest.fixture
def api_client():
    """Unauthenticated DRF test client."""
    return APIClient()


# ─── Users ────────────────────────────────────────────────────────────────────

@pytest.fixture
def admin_user(db):
    """Fully set-up admin user with Profile."""
    user = User.objects.create_user(
        email="admin@richat.mr",
        password="Admin1234!",
        role="admin",
        is_staff=True,
        is_superuser=True,
        is_email_verified=True,
        is_active=True,
    )
    Profile.objects.get_or_create(
        user=user,
        defaults={"first_name": "Admin", "last_name": "Richat"},
    )
    return user


@pytest.fixture
def client_user(db):
    """
    Verified client user with Profile.
    is_email_verified=True is required for login tests to succeed.
    """
    user = User.objects.create_user(
        email="client@richat.mr",
        password="Client1234!",
        role="client",
        is_email_verified=True,
        is_active=True,
    )
    Profile.objects.get_or_create(
        user=user,
        defaults={"first_name": "Demo", "last_name": "Client", "company": "Demo Corp"},
    )
    return user


@pytest.fixture
def unverified_user(db):
    """Client user whose email has NOT been verified."""
    user = User.objects.create_user(
        email="unverified@richat.mr",
        password="Unverified1234!",
        role="client",
        is_email_verified=False,
        is_active=True,
    )
    Profile.objects.get_or_create(user=user, defaults={})
    return user


# ─── Authenticated Clients ─────────────────────────────────────────────────────

@pytest.fixture
def auth_api_client(api_client, client_user):
    """DRF client pre-authenticated as client_user."""
    api_client.force_authenticate(user=client_user)
    return api_client


@pytest.fixture
def admin_api_client(api_client, admin_user):
    """DRF client pre-authenticated as admin_user."""
    api_client.force_authenticate(user=admin_user)
    return api_client


# ─── Opportunities ────────────────────────────────────────────────────────────

@pytest.fixture
def published_opportunity(db, admin_user):
    """A published FundingOpportunity ready for applications."""
    from apps.opportunities.services import create_opportunity, publish_opportunity

    opp = create_opportunity(
        title="Test GCF Solar Initiative",
        source="GCF",
        description="Solar energy funding for Mauritania",
        country="Mauritania",
        amount=5_000_000,
        currency="USD",
        funding_type="grant",
        sector="energy",
        created_by=admin_user,
    )
    return publish_opportunity(opportunity=opp, user=admin_user)


@pytest.fixture
def draft_opportunity(db, admin_user):
    """A draft FundingOpportunity not visible to clients."""
    from apps.opportunities.services import create_opportunity

    return create_opportunity(
        title="Draft World Bank Project",
        source="WORLD_BANK",
        description="Infrastructure funding",
        country="Mauritania",
        amount=2_000_000,
        currency="USD",
        funding_type="loan",
        sector="infrastructure",
        created_by=admin_user,
    )


# ─── Applications ─────────────────────────────────────────────────────────────

@pytest.fixture
def draft_application(db, client_user, published_opportunity):
    """A draft Application linked to the published opportunity."""
    from apps.applications.models import Application

    return Application.objects.create(
        user=client_user,
        opportunity=published_opportunity,
        status="draft",
    )


@pytest.fixture
def pending_application(db, client_user, published_opportunity):
    """A submitted (pending review) Application."""
    from apps.applications.models import Application

    return Application.objects.create(
        user=client_user,
        opportunity=published_opportunity,
        status="pending",
        motivation_letter="We are a leading solar energy company in Mauritania.",
        version=2,
    )