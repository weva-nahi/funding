"""Authentication Celery tasks for async email sending."""

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_verification_email(self, user_id: int, token: str):
    from .models import User

    try:
        user = User.objects.get(id=user_id)
        verify_url = f"{settings.FRONTEND_URL}/verify-email/{token}"
        html_message = render_to_string(
            "emails/verify_email.html",
            {"user": user, "verify_url": verify_url},
        )
        send_mail(
            subject="Verify your email — Richat Funding Tracker",
            message=f"Please verify your email by visiting: {verify_url}",
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
        user = User.objects.get(id=user_id)
        reset_url = f"{settings.FRONTEND_URL}/reset-password/{token}"
        html_message = render_to_string(
            "emails/reset_password.html",
            {"user": user, "reset_url": reset_url},
        )
        send_mail(
            subject="Reset your password — Richat Funding Tracker",
            message=f"Reset your password by visiting: {reset_url}",
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@richat.mr"),
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
    except Exception as exc:  # noqa: BLE001
        raise self.retry(exc=exc, countdown=60 * 2 ** self.request.retries)