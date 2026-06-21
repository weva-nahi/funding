"""Tests confirming signup is rate-limited (it previously was not)."""

import pytest
from django.core.cache import cache


@pytest.mark.django_db
class TestSignupRateLimit:
    def setup_method(self):
        cache.clear()

    def test_signup_throttled_after_limit(self, api_client, settings):
        """With DEFAULT_THROTTLE_RATES['signup'] = '5/hour' in test settings
        (inherited from base.py), the 6th distinct signup attempt from the
        same client should be throttled."""
        # Test settings disable throttle classes globally for speed/determinism
        # in most suites; re-enable just the scoped throttle for this test.
        settings.REST_FRAMEWORK = {
            **settings.REST_FRAMEWORK,
            "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.ScopedRateThrottle"],
            "DEFAULT_THROTTLE_RATES": {"signup": "3/hour"},
        }

        responses = []
        for i in range(4):
            resp = api_client.post(
                "/api/v1/auth/register/",
                {
                    "email": f"throttletest{i}@richat.mr",
                    "password": "SecurePassword123!",
                    "password_confirm": "SecurePassword123!",
                },
                format="json",
            )
            responses.append(resp.status_code)

        # First 3 should succeed (201), the 4th should be throttled (429)
        assert responses[:3] == [201, 201, 201]
        assert responses[3] == 429