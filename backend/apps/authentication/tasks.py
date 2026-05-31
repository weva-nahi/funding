"""Authentication Celery tasks for async email sending."""

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string


@shared_task
def send_verification_email(user_id: int, token: str):
    """Send email verification link."""
    from .models import User

    user = User.objects.get(id=user_id)

    verify_url = f"{settings.FRONTEND_URL}/verify-email/{token}"

    html_message = render_to_string(
        "emails/verify_email.html",
        {
            "user": user,
            "verify_url": verify_url,
        },
    )

    send_mail(
        subject="Verify your email — Richat Funding Tracker",
        message=f"Please verify your email by visiting: {verify_url}",
        from_email=settings.DEFAULT_FROM_EMAIL if hasattr(settings, "DEFAULT_FROM_EMAIL") else "noreply@richat.mr",
        recipient_list=[user.email],
        html_message=html_message,
        fail_silently=False,
    )


@shared_task
def send_reset_password_email(user_id: int, token: str):
    """Send password reset link."""
    from .models import User

    user = User.objects.get(id=user_id)

    reset_url = f"{settings.FRONTEND_URL}/reset-password/{token}"

    html_message = render_to_string(
        "emails/reset_password.html",
        {
            "user": user,
            "reset_url": reset_url,
        },
    )

    send_mail(
        subject="Reset your password — Richat Funding Tracker",
        message=f"Reset your password by visiting: {reset_url}",
        from_email=settings.DEFAULT_FROM_EMAIL if hasattr(settings, "DEFAULT_FROM_EMAIL") else "noreply@richat.mr",
        recipient_list=[user.email],
        html_message=html_message,
        fail_silently=False,
    )
