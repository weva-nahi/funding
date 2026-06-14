"""Authentication business logic."""

import logging
import uuid
from datetime import timedelta

from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from common.exceptions import AccountLockedError, ApplicationError

from .models import Profile, User
from .tasks import send_reset_password_email, send_verification_email

logger = logging.getLogger(__name__)


def register_user(*, email: str, password: str, role: str = "client", **kwargs) -> User:
    if User.objects.filter(email__iexact=email).exists():
        raise ApplicationError("An account with this email already exists.")

    # Wrap user + profile creation in a transaction so any failure is atomic.
    # Organization creation is attempted inside but its failure is caught and
    # logged — it must NOT roll back the user registration itself.
    with transaction.atomic():
        user = User.objects.create_user(email=email, password=password, role=role)
        Profile.objects.create(
            user=user,
            first_name=kwargs.get("first_name", ""),
            last_name=kwargs.get("last_name", ""),
            company=kwargs.get("company_name", ""),
        )

    # Organization creation happens outside the user transaction so a failure
    # there does not leave an orphaned user record.
    org_name = kwargs.get("company_name") or kwargs.get("organization_name")
    if org_name:
        try:
            from apps.organizations.services import create_organization

            create_organization(
                user=user,
                name=org_name,
                registration_number=kwargs.get("registration_number") or None,
                industry=kwargs.get("industry", ""),
                size=kwargs.get("size", ""),
                location=kwargs.get("location", ""),
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Organization creation failed for %s: %s", email, exc)

    token = _generate_verification_token(user)
    verify_url = f"{settings.FRONTEND_URL}/verify-email/{token}"

    # Log the URL to the console so developers can verify email in development
    logger.warning(
        "\n" + "=" * 60 + "\n"
        "EMAIL VERIFICATION LINK FOR: %s\n%s\n" + "=" * 60,
        email,
        verify_url,
    )

    send_verification_email.delay(user.id, token)
    return user


def verify_email(*, token: str) -> User:
    user_id = cache.get(f"email_verify:{token}")
    if not user_id:
        raise ApplicationError("Invalid or expired verification link.")

    user = User.objects.get(id=user_id)
    user.is_email_verified = True
    user.save(update_fields=["is_email_verified"])
    cache.delete(f"email_verify:{token}")
    return user


def login_user(*, email: str, password: str) -> dict:
    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        raise ApplicationError("Invalid email or password.")

    if user.locked_until and user.locked_until > timezone.now():
        remaining = (user.locked_until - timezone.now()).seconds // 60 + 1
        raise AccountLockedError(
            f"Account locked. Try again in {remaining} minutes."
        )

    if not user.check_password(password):
        _handle_failed_login(user)
        raise ApplicationError("Invalid email or password.")

    if not user.is_active:
        raise ApplicationError("Your account has been deactivated.")

    if not user.is_email_verified:
        if settings.DEBUG:
            raise ApplicationError(
                "Email not verified. Run: docker compose logs backend "
                "and look for your verification link."
            )
        raise ApplicationError("Please verify your email before logging in.")

    # Reset failed attempts after a successful login
    if user.failed_login_attempts > 0:
        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_login = timezone.now()
        user.save(update_fields=["failed_login_attempts", "locked_until", "last_login"])
    else:
        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])

    refresh = RefreshToken.for_user(user)
    refresh["role"] = user.role
    refresh["email"] = user.email

    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": user,
    }


def request_password_reset(*, email: str) -> None:
    try:
        user = User.objects.get(email__iexact=email, is_active=True)
        token = _generate_reset_token(user)
        reset_url = f"{settings.FRONTEND_URL}/reset-password/{token}"

        logger.warning(
            "\n" + "=" * 60 + "\n"
            "PASSWORD RESET LINK FOR: %s\n%s\n" + "=" * 60,
            email,
            reset_url,
        )

        send_reset_password_email.delay(user.id, token)
    except User.DoesNotExist:
        pass  # Silent fail — never reveal whether an email exists


def reset_password(*, token: str, new_password: str) -> None:
    user_id = cache.get(f"password_reset:{token}")
    if not user_id:
        raise ApplicationError("Invalid or expired reset link.")

    user = User.objects.get(id=user_id)
    user.set_password(new_password)
    user.save(update_fields=["password"])
    cache.delete(f"password_reset:{token}")


def change_password(*, user: User, old_password: str, new_password: str) -> None:
    if not user.check_password(old_password):
        raise ApplicationError("Current password is incorrect.")
    user.set_password(new_password)
    user.save(update_fields=["password"])


def update_profile(*, user: User, **kwargs) -> Profile:
    profile = user.profile
    allowed = {
        "first_name",
        "last_name",
        "company",
        "phone",
        "sector",
        "notify_application_status",
        "notify_new_opportunities",
        "notify_consulting_response",
        "notify_deadline_reminder",
        "notify_system_announcements",
        "notify_email_enabled",
    }
    for field, value in kwargs.items():
        if field in allowed and hasattr(profile, field):
            setattr(profile, field, value)
    profile.save()
    return profile


def _handle_failed_login(user: User) -> None:
    user.failed_login_attempts += 1
    if user.failed_login_attempts >= settings.ACCOUNT_LOCKOUT_ATTEMPTS:
        user.locked_until = timezone.now() + timedelta(
            minutes=settings.ACCOUNT_LOCKOUT_DURATION_MINUTES
        )
    user.save(update_fields=["failed_login_attempts", "locked_until"])


def _generate_verification_token(user: User) -> str:
    token = uuid.uuid4().hex
    cache.set(f"email_verify:{token}", user.id, timeout=86400)  # 24 hours
    return token


def _generate_reset_token(user: User) -> str:
    token = uuid.uuid4().hex
    cache.set(
        f"password_reset:{token}",
        user.id,
        timeout=settings.SIGNED_URL_EXPIRY_SECONDS,
    )
    return token