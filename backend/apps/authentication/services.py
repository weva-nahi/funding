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
from common.utils.email_i18n import resolve_unsubscribe_token
from common.utils.tasks import safe_delay

from .models import EmailVerificationToken, PasswordResetToken, Profile, User
from .tasks import send_reset_password_email, send_verification_email

logger = logging.getLogger(__name__)


def register_user(*, email: str, password: str, role: str = "client", **kwargs) -> User:
    """Register a new user or re-send verification for an unverified account.

    If an account with this email already exists AND is verified, raise an error.
    If it exists but is unverified, allow re-registration: invalidate old tokens
    and issue a new verification email. This prevents email addresses from being
    permanently blocked by sign-ups with wrong/inaccessible emails.
    """
    existing = User.objects.filter(email__iexact=email).first()

    if existing:
        if existing.is_email_verified:
            raise ApplicationError("An account with this email already exists.")
        # Unverified account — invalidate old tokens and re-send
        EmailVerificationToken.objects.filter(user=existing, used=False).update(used=True)
        # Update password in case they want to use a new one
        existing.set_password(password)
        existing.save(update_fields=["password"])
        # Update profile fields if provided
        if hasattr(existing, "profile"):
            profile = existing.profile
            for field in ["first_name", "last_name", "company", "phone", "sector"]:
                val = kwargs.get(field) or kwargs.get("company_name" if field == "company" else field, "")
                if val:
                    setattr(profile, field, val)
            profile.save()
        token = _generate_verification_token(existing)
        verify_url = f"{settings.FRONTEND_URL}/verify-email/{token}"
        logger.warning(
            "\n" + "=" * 60 + "\n"
            "EMAIL VERIFICATION LINK FOR: %s\n%s\n" + "=" * 60,
            email, verify_url,
        )
        safe_delay(send_verification_email, existing.id, token)
        return existing

    with transaction.atomic():
        user = User.objects.create_user(email=email, password=password, role=role)
        Profile.objects.create(
            user=user,
            first_name=kwargs.get("first_name", ""),
            last_name=kwargs.get("last_name", ""),
            company=kwargs.get("company_name", ""),
            phone=kwargs.get("phone", ""),
            sector=kwargs.get("sector", ""),
            preferred_language="en",  # Always English for emails
        )

    org_name = kwargs.get("company_name") or kwargs.get("organization_name")
    if org_name:
        try:
            from apps.organizations.services import create_organization
            create_organization(
                user=user,
                name=org_name,
                registration_number=kwargs.get("registration_number") or None,
                industry=kwargs.get("industry", ""),
                size=kwargs.get("company_size") or kwargs.get("size", ""),
                location=kwargs.get("location", ""),
            )
        except Exception as exc:
            logger.warning("Organization creation failed for %s: %s", email, exc)

    token = _generate_verification_token(user)
    verify_url = f"{settings.FRONTEND_URL}/verify-email/{token}"

    logger.warning(
        "\n" + "=" * 60 + "\n"
        "EMAIL VERIFICATION LINK FOR: %s\n%s\n" + "=" * 60,
        email, verify_url,
    )

    safe_delay(send_verification_email, user.id, token)
    return user


def resend_verification_email(*, email: str) -> None:
    """Re-issue a verification email for an unverified account."""
    try:
        user = User.objects.get(email__iexact=email, is_active=True)
    except User.DoesNotExist:
        return

    if user.is_email_verified:
        return

    # Invalidate all existing unused tokens
    EmailVerificationToken.objects.filter(user=user, used=False).update(used=True)

    token = _generate_verification_token(user)
    verify_url = f"{settings.FRONTEND_URL}/verify-email/{token}"

    logger.warning(
        "\n" + "=" * 60 + "\n"
        "RESENT EMAIL VERIFICATION LINK FOR: %s\n%s\n" + "=" * 60,
        email, verify_url,
    )

    safe_delay(send_verification_email, user.id, token)


def unsubscribe_user(*, token: str) -> bool:
    user_id = resolve_unsubscribe_token(token)
    if user_id is None:
        return False

    try:
        profile = Profile.objects.get(user_id=user_id)
    except Profile.DoesNotExist:
        return False

    if profile.notify_email_enabled:
        profile.notify_email_enabled = False
        profile.save(update_fields=["notify_email_enabled"])
    return True


def verify_email(*, token: str) -> User:
    """Verify email using DB token (Redis as cache, DB as fallback)."""
    user_id = cache.get(f"email_verify:{token}")

    if user_id:
        user = User.objects.get(id=user_id)
        user.is_email_verified = True
        user.save(update_fields=["is_email_verified"])
        cache.delete(f"email_verify:{token}")
        EmailVerificationToken.objects.filter(token=token).update(used=True)
        return user

    try:
        db_token = EmailVerificationToken.objects.select_related("user").get(token=token)
    except EmailVerificationToken.DoesNotExist:
        raise ApplicationError("Invalid or expired verification link.")

    if not db_token.is_valid():
        raise ApplicationError("Invalid or expired verification link.")

    user = db_token.user
    user.is_email_verified = True
    user.save(update_fields=["is_email_verified"])
    db_token.used = True
    db_token.save(update_fields=["used"])
    return user


def login_user(*, email: str, password: str) -> dict:
    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        raise ApplicationError("No account found with this email address.")

    if user.locked_until and user.locked_until > timezone.now():
        remaining = (user.locked_until - timezone.now()).seconds // 60 + 1
        raise AccountLockedError(f"Account locked. Try again in {remaining} minutes.")

    if not user.check_password(password):
        _handle_failed_login(user)
        raise ApplicationError("Invalid email or password.")

    if not user.is_active:
        raise ApplicationError("Your account has been deactivated. Please contact support.")

    if not user.is_email_verified:
        raise ApplicationError(
            "Please verify your email before logging in. "
            "Check your inbox or request a new verification link."
        )

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
    """Send a password reset email. Unlike the old version, this explicitly
    tells the caller whether the account exists (via the exception) so the
    frontend can show a meaningful message."""
    try:
        user = User.objects.get(email__iexact=email, is_active=True)
    except User.DoesNotExist:
        raise ApplicationError("No account found with this email address.")

    token = _generate_reset_token(user)
    reset_url = f"{settings.FRONTEND_URL}/reset-password/{token}"

    logger.warning(
        "\n" + "=" * 60 + "\n"
        "PASSWORD RESET LINK FOR: %s\n%s\n" + "=" * 60,
        email, reset_url,
    )

    safe_delay(send_reset_password_email, user.id, token)


def reset_password(*, token: str, new_password: str) -> None:
    user_id = cache.get(f"password_reset:{token}")

    if user_id:
        user = User.objects.get(id=user_id)
        user.set_password(new_password)
        user.save(update_fields=["password"])
        cache.delete(f"password_reset:{token}")
        PasswordResetToken.objects.filter(token=token).update(used=True)
        return

    try:
        db_token = PasswordResetToken.objects.select_related("user").get(token=token)
    except PasswordResetToken.DoesNotExist:
        raise ApplicationError("Invalid or expired reset link.")

    if not db_token.is_valid():
        raise ApplicationError("Invalid or expired reset link.")

    user = db_token.user
    user.set_password(new_password)
    user.save(update_fields=["password"])
    db_token.used = True
    db_token.save(update_fields=["used"])


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
        "notify_new_message",
        "notify_email_enabled",
        "notify_frequency",
    }
    for field, value in kwargs.items():
        if field in allowed and hasattr(profile, field):
            setattr(profile, field, value)
    profile.save()
    return profile


def verify_admin_password(*, user: User, password: str) -> bool:
    """Verify admin password for high-stakes actions."""
    return user.check_password(password)


def _handle_failed_login(user: User) -> None:
    user.failed_login_attempts += 1
    if user.failed_login_attempts >= settings.ACCOUNT_LOCKOUT_ATTEMPTS:
        user.locked_until = timezone.now() + timedelta(
            minutes=settings.ACCOUNT_LOCKOUT_DURATION_MINUTES
        )
    user.save(update_fields=["failed_login_attempts", "locked_until"])


def _generate_verification_token(user: User) -> str:
    token = uuid.uuid4().hex
    expires_at = timezone.now() + timedelta(hours=24)

    cache.set(f"email_verify:{token}", user.id, timeout=86400)

    EmailVerificationToken.objects.create(
        user=user,
        token=token,
        expires_at=expires_at,
    )

    return token


def _generate_reset_token(user: User) -> str:
    token = uuid.uuid4().hex
    expiry_seconds = settings.SIGNED_URL_EXPIRY_SECONDS
    expires_at = timezone.now() + timedelta(seconds=expiry_seconds)

    cache.set(f"password_reset:{token}", user.id, timeout=expiry_seconds)

    PasswordResetToken.objects.create(
        user=user,
        token=token,
        expires_at=expires_at,
    )

    return token