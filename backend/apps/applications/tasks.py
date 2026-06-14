"""Celery tasks for application notifications."""

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_application_approved_email(self, application_id: int):
    from .models import Application

    try:
        app = Application.objects.select_related("user", "opportunity").get(id=application_id)
        html_message = render_to_string(
            "emails/application_approved.html",
            {"user": app.user, "application": app, "opportunity": app.opportunity,
             "frontend_url": settings.FRONTEND_URL},
        )
        send_mail(
            subject=f"Application Approved — {app.opportunity.title}",
            message=f"Your application for {app.opportunity.title} has been approved.",
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@richat.mr"),
            recipient_list=[app.user.email],
            html_message=html_message,
            fail_silently=False,
        )
    except Exception as exc:  # noqa: BLE001
        raise self.retry(exc=exc, countdown=60 * 2 ** self.request.retries)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_application_rejected_email(self, application_id: int):
    from .models import Application

    try:
        app = Application.objects.select_related("user", "opportunity").get(id=application_id)
        html_message = render_to_string(
            "emails/application_rejected.html",
            {"user": app.user, "application": app, "opportunity": app.opportunity,
             "frontend_url": settings.FRONTEND_URL},
        )
        send_mail(
            subject=f"Application Update — {app.opportunity.title}",
            message=f"Your application for {app.opportunity.title} was not approved.",
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@richat.mr"),
            recipient_list=[app.user.email],
            html_message=html_message,
            fail_silently=False,
        )
    except Exception as exc:  # noqa: BLE001
        raise self.retry(exc=exc, countdown=60 * 2 ** self.request.retries)