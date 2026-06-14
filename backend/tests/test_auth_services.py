"""Tests for authentication services."""

import pytest
from django.core.cache import cache

from apps.authentication.models import Profile, User
from apps.authentication.services import (
    change_password,
    login_user,
    register_user,
    verify_email,
)
from common.exceptions import AccountLockedError, ApplicationError


@pytest.mark.django_db
class TestUserRegistration:
    def test_creates_user_and_profile(self):
        user = register_user(
            email="newuser@richat.mr",
            password="SecurePassword123!",
            first_name="New",
            last_name="User",
            company_name="NewCorp",
        )
        assert user.pk is not None
        assert user.email == "newuser@richat.mr"
        assert user.role == "client"
        assert not user.is_email_verified
        assert user.is_active
        assert Profile.objects.filter(user=user).exists()
        assert user.profile.company == "NewCorp"

    def test_duplicate_email_raises(self):
        register_user(email="dup@richat.mr", password="SecurePassword123!")
        with pytest.raises(ApplicationError, match="already exists"):
            register_user(email="dup@richat.mr", password="AnotherPassword123!")

    def test_email_check_is_case_insensitive(self):
        register_user(email="User@Richat.mr", password="SecurePassword123!")
        with pytest.raises(ApplicationError):
            register_user(email="user@richat.mr", password="AnotherPassword123!")

    def test_creates_organization_when_company_provided(self):
        user = register_user(
            email="orguser@richat.mr",
            password="SecurePassword123!",
            company_name="Solar Corp MR",
        )
        assert hasattr(user, "organization")
        assert user.organization.name == "Solar Corp MR"


@pytest.mark.django_db
class TestEmailVerification:
    def test_verify_marks_user_verified_and_deletes_token(self):
        user = User.objects.create_user(
            email="unverified@richat.mr",
            password="Pass1234!",
            is_email_verified=False,
        )
        token = "test-verify-token-abc123"
        cache.set(f"email_verify:{token}", user.id, timeout=86400)

        verified = verify_email(token=token)

        assert verified.is_email_verified is True
        # Token must be consumed — one-time use
        assert cache.get(f"email_verify:{token}") is None

    def test_invalid_token_raises(self):
        with pytest.raises(ApplicationError, match="Invalid or expired"):
            verify_email(token="nonexistent-token-xyz")


@pytest.mark.django_db
class TestLogin:
    def test_successful_login_returns_tokens(self, client_user):
        result = login_user(email="client@richat.mr", password="Client1234!")
        assert "access" in result
        assert "refresh" in result
        assert result["user"] == client_user

    def test_successful_login_updates_last_login(self, client_user):
        assert client_user.last_login is None
        login_user(email="client@richat.mr", password="Client1234!")
        client_user.refresh_from_db()
        assert client_user.last_login is not None

    def test_wrong_password_raises(self, client_user):
        with pytest.raises(ApplicationError, match="Invalid email or password"):
            login_user(email="client@richat.mr", password="wrongpassword")

    def test_nonexistent_email_raises(self):
        with pytest.raises(ApplicationError, match="Invalid email or password"):
            login_user(email="ghost@richat.mr", password="anything")

    def test_inactive_user_raises(self, db):
        user = User.objects.create_user(
            email="inactive@richat.mr",
            password="Pass1234!",
            is_active=False,
            is_email_verified=True,
        )
        Profile.objects.create(user=user)
        with pytest.raises(ApplicationError, match="deactivated"):
            login_user(email="inactive@richat.mr", password="Pass1234!")

    def test_unverified_user_raises_in_production(self, db, settings):
        settings.DEBUG = False
        user = User.objects.create_user(
            email="unverified@richat.mr",
            password="Pass1234!",
            is_active=True,
            is_email_verified=False,
        )
        Profile.objects.create(user=user)
        with pytest.raises(ApplicationError, match="verify your email"):
            login_user(email="unverified@richat.mr", password="Pass1234!")

    def test_failed_login_increments_counter(self, client_user):
        for _ in range(3):
            try:
                login_user(email="client@richat.mr", password="wrong")
            except ApplicationError:
                pass
        client_user.refresh_from_db()
        assert client_user.failed_login_attempts == 3

    def test_account_locks_after_max_attempts(self, client_user, settings):
        settings.ACCOUNT_LOCKOUT_ATTEMPTS = 5
        for _ in range(5):
            try:
                login_user(email="client@richat.mr", password="wrong")
            except ApplicationError:
                pass
        with pytest.raises(AccountLockedError, match="Account locked"):
            login_user(email="client@richat.mr", password="wrong")

    def test_successful_login_resets_failed_counter(self, client_user):
        for _ in range(2):
            try:
                login_user(email="client@richat.mr", password="wrong")
            except ApplicationError:
                pass
        login_user(email="client@richat.mr", password="Client1234!")
        client_user.refresh_from_db()
        assert client_user.failed_login_attempts == 0


@pytest.mark.django_db
class TestChangePassword:
    def test_change_password_succeeds(self, client_user):
        change_password(
            user=client_user,
            old_password="Client1234!",
            new_password="NewSecure456!",
        )
        client_user.refresh_from_db()
        assert client_user.check_password("NewSecure456!")

    def test_wrong_old_password_raises(self, client_user):
        with pytest.raises(ApplicationError, match="Current password is incorrect"):
            change_password(
                user=client_user,
                old_password="WrongOld",
                new_password="NewPass789!",
            )