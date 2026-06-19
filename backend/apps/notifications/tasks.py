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
            subject=subject,
            message=message,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@richat.mr"),
            recipient_list=[user.email],
            fail_silently=False,
        )
    except Exception as exc:  # noqa: BLE001
        raise self.retry(exc=exc, countdown=60 * 2 ** self.request.retries)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_consulting_response_email(self, consulting_request_id: int):
    """Send an email when a consulting request receives a final response."""
    from django.template.loader import render_to_string

    from apps.consulting.models import ConsultingRequest

    try:
        req = ConsultingRequest.objects.select_related("user").get(id=consulting_request_id)
        if not req.admin_response:
            return
        html_message = render_to_string(
            "emails/consulting_response.html",
            {
                "user": req.user,
                "consulting_request": req,
                "frontend_url": settings.FRONTEND_URL,
            },
        )
        send_mail(
            subject=f"Richat — Réponse à votre demande de conseil #{req.id}",
            message=req.admin_response,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@richat.mr"),
            recipient_list=[req.user.email],
            html_message=html_message,
            fail_silently=False,
        )
    except Exception as exc:  # noqa: BLE001
        raise self.retry(exc=exc, countdown=60 * 2 ** self.request.retries)


@shared_task
def send_daily_digests():
    """Send digest emails to all users with notify_frequency='daily'.

    Runs every day at 08:00 UTC (configured in CELERY_BEAT_SCHEDULE).
    Collects all pending_digest messages for each user, sends a single
    summary email, then clears the queue.
    """
    from django.template.loader import render_to_string

    from apps.authentication.models import Profile

    profiles = Profile.objects.filter(
        notify_frequency="daily",
        notify_email_enabled=True,
        pending_digest__len__gt=0,
    ).select_related("user")

    sent = 0
    for profile in profiles:
        messages = profile.pending_digest
        if not messages:
            continue

        body = "\n".join(f"• {m}" for m in messages)
        subject = f"Richat Funding Tracker — Résumé quotidien ({len(messages)} notification{'s' if len(messages) != 1 else ''})"

        try:
            send_mail(
                subject=subject,
                message=body,
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@richat.mr"),
                recipient_list=[profile.user.email],
                fail_silently=False,
            )
            profile.pending_digest = []
            profile.save(update_fields=["pending_digest"])
            sent += 1
        except Exception:  # noqa: BLE001
            pass

    return {"digest_emails_sent": sent}


@shared_task
def send_deadline_reminders():
    """Notify applicants whose applications have opportunities with deadlines
    in exactly 7 or 1 day(s)."""
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
                    f"Rappel : la date limite pour '{app.opportunity.title}' est dans {offset} "
                    f"jour{'s' if offset != 1 else ''}."
                ),
                notification_type="deadline_reminder",
                category="opportunity",
                priority="high" if offset == 1 else "medium",
            )
            sent += 1
    return {"reminders_sent": sent}