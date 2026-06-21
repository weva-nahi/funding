"""Authentication Celery tasks for async email sending and maintenance."""

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone

from common.utils.email_i18n import (
    BASE_FOOTER,
    RESET_PASSWORD,
    VERIFY_EMAIL,
    resolve_language,
    unsubscribe_url,
)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_verification_email(self, user_id: int, token: str):
    from .models import User

    try:
        user = User.objects.select_related("profile").get(id=user_id)
        lang = resolve_language(user)
        verify_url = f"{settings.FRONTEND_URL}/verify-email/{token}"
        t = VERIFY_EMAIL[lang]
        html_message = render_to_string(
            "emails/verify_email.html",
            {
                "user": user,
                "verify_url": verify_url,
                "t": {**t, "greeting": t["greeting"].format(email=user.email)},
                "footer_t": BASE_FOOTER[lang],
                "unsubscribe_url": unsubscribe_url(user.id),
                "unsubscribe_label": t["unsubscribe"],
                "dir": "rtl" if lang == "ar" else "ltr",
            },
        )
        send_mail(
            subject=t["preheader"],
            message=f"{t['body']} {verify_url}",
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@richat.mr"),
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
    except Exception as exc:  # noqa: BLE001
        raise self.retry(exc=exc, countdown=60 * 2 ** self.request.retries)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_reset_password_email(self, user_id: int, token: str):
    from .models import User

    try:
        user = User.objects.select_related("profile").get(id=user_id)
        lang = resolve_language(user)
        reset_url = f"{settings.FRONTEND_URL}/reset-password/{token}"
        t = RESET_PASSWORD[lang]
        html_message = render_to_string(
            "emails/reset_password.html",
            {
                "user": user,
                "reset_url": reset_url,
                "t": {**t, "greeting": t["greeting"].format(email=user.email)},
                "footer_t": BASE_FOOTER[lang],
                "unsubscribe_url": unsubscribe_url(user.id),
                "unsubscribe_label": t["unsubscribe"],
                "dir": "rtl" if lang == "ar" else "ltr",
            },
        )
        send_mail(
            subject=t["preheader"],
            message=f"{t['body']} {reset_url}",
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@richat.mr"),
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
    except Exception as exc:  # noqa: BLE001
        raise self.retry(exc=exc, countdown=60 * 2 ** self.request.retries)


@shared_task
def cleanup_expired_tokens():
    """Delete expired/used email-verification and password-reset tokens.

    Runs daily (see CELERY_BEAT_SCHEDULE -> 'cleanup-expired-auth-tokens').
    """
    from django.db.models import Q

    from .models import EmailVerificationToken, PasswordResetToken

    retention_days = getattr(settings, "AUTH_TOKEN_RETENTION_DAYS", 7)
    cutoff = timezone.now() - timezone.timedelta(days=retention_days)

    verify_deleted, _ = EmailVerificationToken.objects.filter(
        Q(used=True) | Q(expires_at__lt=cutoff)
    ).delete()

    reset_deleted, _ = PasswordResetToken.objects.filter(
        Q(used=True) | Q(expires_at__lt=cutoff)
    ).delete()

    return {
        "verification_tokens_deleted": verify_deleted,
        "reset_tokens_deleted": reset_deleted,
    }