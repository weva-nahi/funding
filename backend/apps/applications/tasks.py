"""Celery tasks for application notifications."""

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string

from common.utils.email_i18n import (
    APPLICATION_APPROVED,
    APPLICATION_REJECTED,
    BASE_FOOTER,
    resolve_language,
    unsubscribe_url,
)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_application_approved_email(self, application_id: int):
    from .models import Application

    try:
        app = Application.objects.select_related("user", "user__profile", "opportunity").get(id=application_id)
        user = app.user
        lang = resolve_language(user)
        t = APPLICATION_APPROVED[lang]
        html_message = render_to_string(
            "emails/application_approved.html",
            {
                "user": user,
                "application": app,
                "opportunity": app.opportunity,
                "frontend_url": settings.FRONTEND_URL,
                "t": {
                    **t,
                    "greeting": t["greeting"].format(email=user.email),
                    "body": t["body"].format(opportunity_title=app.opportunity.title),
                },
                "footer_t": BASE_FOOTER[lang],
                "unsubscribe_url": unsubscribe_url(user.id),
                "unsubscribe_label": t["unsubscribe"],
                "dir": "rtl" if lang == "ar" else "ltr",
            },
        )
        send_mail(
            subject=f"{t['preheader']} — {app.opportunity.title}",
            message=f"{t['body']}".replace("<strong>", "").replace("</strong>", ""),
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@richat.mr"),
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
    except Exception as exc:  # noqa: BLE001
        raise self.retry(exc=exc, countdown=60 * 2 ** self.request.retries)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_application_rejected_email(self, application_id: int):
    from .models import Application

    try:
        app = Application.objects.select_related("user", "user__profile", "opportunity").get(id=application_id)
        user = app.user
        lang = resolve_language(user)
        t = APPLICATION_REJECTED[lang]
        html_message = render_to_string(
            "emails/application_rejected.html",
            {
                "user": user,
                "application": app,
                "opportunity": app.opportunity,
                "frontend_url": settings.FRONTEND_URL,
                "t": {
                    **t,
                    "greeting": t["greeting"].format(email=user.email),
                    "body": t["body"].format(opportunity_title=app.opportunity.title),
                },
                "footer_t": BASE_FOOTER[lang],
                "unsubscribe_url": unsubscribe_url(user.id),
                "unsubscribe_label": t["unsubscribe"],
                "dir": "rtl" if lang == "ar" else "ltr",
            },
        )
        send_mail(
            subject=f"{t['preheader']} — {app.opportunity.title}",
            message=f"{t['body']}".replace("<strong>", "").replace("</strong>", ""),
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@richat.mr"),
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
    except Exception as exc:  # noqa: BLE001
        raise self.retry(exc=exc, countdown=60 * 2 ** self.request.retries)