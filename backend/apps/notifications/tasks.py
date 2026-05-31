"""Notification email tasks."""

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail


@shared_task
def send_notification_email(user_id: int, subject: str, message: str):
    from apps.authentication.models import User

    user = User.objects.get(id=user_id)
    if hasattr(user, "profile") and not user.profile.notify_email_enabled:
        return
    send_mail(
        subject=subject,
        message=message,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@richat.mr"),
        recipient_list=[user.email],
        fail_silently=True,
    )
