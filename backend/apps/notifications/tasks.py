"""Notification email and periodic tasks."""

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_notification_email(self, user_id: int, subject: str, message: str):
    from apps.authentication.models import User

    try:
        user = User.objects.get(id=user_id)
        if hasattr(user, "profile") and not user.profile.notify_email_enabled:
            return
        send_mail(
            subject=subject, message=message,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@richat.mr"),
            recipient_list=[user.email], fail_silently=False,
        )
    except Exception as exc:  # noqa: BLE001
        raise self.retry(exc=exc, countdown=60 * 2 ** self.request.retries)


@shared_task
def send_deadline_reminders():
    """Notify applicants whose draft/pending applications have opportunities
    with deadlines in exactly 7 or 1 day(s)."""
    from datetime import timedelta

    from apps.applications.models import Application

    from .services import create_notification

    today = timezone.now().date()
    sent = 0
    for offset in settings.DEADLINE_REMINDER_DAYS:
        target = today + timedelta(days=offset)
        apps = Application.objects.filter(
            status__in=["draft", "pending", "in_review"],
            opportunity__deadline=target,
        ).select_related("user", "opportunity")
        for app in apps:
            create_notification(
                user=app.user,
                message=(
                    f"Reminder: the deadline for '{app.opportunity.title}' is in {offset} "
                    f"day{'s' if offset != 1 else ''}."
                ),
                notification_type="deadline_reminder",
                category="opportunity",
                priority="high" if offset == 1 else "medium",
            )
            sent += 1
    return {"reminders_sent": sent}