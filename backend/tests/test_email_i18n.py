"""Tests for email internationalization and unsubscribe token handling."""

import pytest

from common.utils.email_i18n import (
    resolve_language,
    resolve_unsubscribe_token,
    generate_unsubscribe_token,
    unsubscribe_url,
)


@pytest.mark.django_db
class TestResolveLanguage:
    def test_defaults_to_french(self, client_user):
        assert resolve_language(client_user) == "fr"

    def test_respects_preferred_language(self, client_user):
        client_user.profile.preferred_language = "en"
        client_user.profile.save()
        assert resolve_language(client_user) == "en"

    def test_arabic_supported(self, client_user):
        client_user.profile.preferred_language = "ar"
        client_user.profile.save()
        assert resolve_language(client_user) == "ar"

    def test_invalid_language_falls_back_to_french(self, client_user):
        client_user.profile.preferred_language = "de"
        client_user.profile.save()
        assert resolve_language(client_user) == "fr"


@pytest.mark.django_db
class TestUnsubscribeToken:
    def test_token_roundtrip(self, client_user):
        token = generate_unsubscribe_token(client_user.id)
        resolved = resolve_unsubscribe_token(token)
        assert resolved == client_user.id

    def test_invalid_token_returns_none(self):
        assert resolve_unsubscribe_token("not-a-real-token") is None

    def test_unsubscribe_url_contains_token(self, client_user, settings):
        url = unsubscribe_url(client_user.id)
        assert settings.FRONTEND_URL in url
        assert "/unsubscribe/" in url


@pytest.mark.django_db
class TestUnsubscribeEndpoint:
    def test_unsubscribe_disables_email_notifications(self, api_client, client_user):
        assert client_user.profile.notify_email_enabled is True
        token = generate_unsubscribe_token(client_user.id)

        response = api_client.post("/api/v1/auth/unsubscribe/", {"token": token}, format="json")
        assert response.status_code == 200

        client_user.profile.refresh_from_db()
        assert client_user.profile.notify_email_enabled is False

    def test_invalid_token_returns_400(self, api_client):
        response = api_client.post("/api/v1/auth/unsubscribe/", {"token": "garbage"}, format="json")
        assert response.status_code == 400

    def test_unsubscribe_does_not_require_auth(self, api_client, client_user):
        """Critical GDPR requirement — unsubscribing must not require login."""
        token = generate_unsubscribe_token(client_user.id)
        response = api_client.post("/api/v1/auth/unsubscribe/", {"token": token}, format="json")
        assert response.status_code == 200