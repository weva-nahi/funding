"""Tests that client users cannot access admin endpoints."""

import pytest


@pytest.mark.django_db
class TestPermissionEnforcement:
    def test_client_cannot_list_all_applications(self, auth_api_client):
        response = auth_api_client.get('/api/v1/applications/admin/')
        assert response.status_code == 403

    def test_client_cannot_review_application(self, auth_api_client, pending_application):
        response = auth_api_client.post(
            f'/api/v1/applications/admin/{pending_application.id}/review/',
            {'action': 'approve'},
            format='json',
        )
        assert response.status_code == 403

    def test_client_cannot_list_admin_opportunities(self, auth_api_client):
        response = auth_api_client.get('/api/v1/opportunities/admin/')
        assert response.status_code == 403

    def test_client_cannot_start_scraping(self, auth_api_client):
        response = auth_api_client.post(
            '/api/v1/scraping/start/',
            {'source': 'gef', 'max_pages': 1},
            format='json',
        )
        assert response.status_code == 403

    def test_client_cannot_list_users(self, auth_api_client):
        response = auth_api_client.get('/api/v1/auth/users/')
        assert response.status_code == 403

    def test_client_cannot_view_analytics(self, auth_api_client):
        response = auth_api_client.get('/api/v1/analytics/dashboard/')
        assert response.status_code == 403

    def test_client_cannot_view_audit_logs(self, auth_api_client):
        response = auth_api_client.get('/api/v1/audit/logs/')
        assert response.status_code == 403

    def test_admin_can_access_admin_endpoints(self, admin_api_client):
        response = admin_api_client.get('/api/v1/applications/admin/')
        assert response.status_code == 200

    def test_unauthenticated_cannot_access_protected_route(self, api_client):
        response = api_client.get('/api/v1/applications/')
        assert response.status_code == 401

    def test_client_cannot_access_another_users_application(self, auth_api_client, admin_user, published_opportunity):
        from apps.applications.models import Application

        other_app = Application.objects.create(
            user=admin_user,
            opportunity=published_opportunity,
            status="draft",
        )
        response = auth_api_client.get(f'/api/v1/applications/{other_app.id}/')
        # The view returns 404 (not 403) to avoid leaking resource existence.
        assert response.status_code == 404