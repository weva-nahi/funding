"""Application services — all write operations."""

import bleach
from django.conf import settings
from django.db import IntegrityError

from common.exceptions import ApplicationError
from common.utils.tasks import safe_delay

from .models import Application, ApplicationMessage, ApplicationStatusHistory

_ALLOWED_TAGS = [
    "p", "br", "strong", "em", "u", "ul", "ol", "li",
    "h2", "h3", "blockquote", "a",
]
_ALLOWED_ATTRS = {"a": ["href", "title", "rel"]}


def _sanitize(html: str) -> str:
    if not html:
        return html
    return bleach.clean(html, tags=_ALLOWED_TAGS, attributes=_ALLOWED_ATTRS, strip=True)


def create_application(*, user, opportunity, motivation_letter: str = "", documents=None) -> Application:
    """Create a pending application directly (no draft step)."""
    if (
        Application.objects.filter(user=user, opportunity=opportunity).exists()
    ):
        raise ApplicationError(
            "You already have an application for this opportunity."
        )
    if opportunity.is_expired:
        raise ApplicationError("This opportunity's deadline has passed.")

    try:
        app = Application.objects.create(
            user=user,
            opportunity=opportunity,
            status="pending",
            motivation_letter=_sanitize(motivation_letter),
            version=1,
        )
    except IntegrityError as exc:
        raise ApplicationError(
            "You already have an application for this opportunity."
        ) from exc

    _record_status_change(app, "", "pending", user)
    return app


def update_application(*, application: Application, **kwargs) -> Application:
    if application.status not in ("pending",):
        raise ApplicationError("Only pending applications can be edited.")
    if "motivation_letter" in kwargs:
        application.motivation_letter = _sanitize(kwargs["motivation_letter"])
    application.save()
    return application


def shortlist_application(*, application: Application, admin_user, comment: str = "") -> Application:
    if application.status not in ("pending",):
        raise ApplicationError("Only pending applications can be shortlisted.")
    old = application.status
    application.status = "shortlisted"
    if comment:
        application.admin_comment = comment
    application.save(update_fields=["status", "admin_comment", "updated_at"])
    _record_status_change(application, old, "shortlisted", admin_user, comment)

    from apps.notifications.services import create_notification
    create_notification(
        user=application.user,
        message=f"Your application for '{application.opportunity.title}' has been shortlisted.",
        notification_type="application_status",
        category="application",
        priority="medium",
    )
    return application


def bulk_shortlist(*, application_ids: list, admin_user) -> dict:
    shortlisted = skipped = 0
    for app_id in application_ids:
        try:
            app = Application.objects.get(id=app_id)
            shortlist_application(application=app, admin_user=admin_user)
            shortlisted += 1
        except (Application.DoesNotExist, ApplicationError):
            skipped += 1
    return {"shortlisted": shortlisted, "skipped": skipped}


def approve_application(
    *, application: Application, admin_user, comment: str = ""
) -> Application:
    if application.status not in ("pending", "shortlisted"):
        raise ApplicationError(
            "Only pending or shortlisted applications can be approved."
        )

    old = application.status
    application.status = "approved"
    application.admin_comment = comment
    application.save(update_fields=["status", "admin_comment", "updated_at"])
    _record_status_change(application, old, "approved", admin_user, comment)

    from apps.applications.tasks import send_application_approved_email
    from apps.notifications.services import create_notification

    create_notification(
        user=application.user,
        message=f"Your application for '{application.opportunity.title}' has been approved!",
        notification_type="application_status",
        category="application",
        priority="high",
    )
    safe_delay(send_application_approved_email, application.id)
    return application

def reject_application(
    *, application: Application, admin_user, reason: str = ""
) -> Application:
    if application.status not in ("pending", "shortlisted"):
        raise ApplicationError(
            "Only pending or shortlisted applications can be rejected."
        )

    old = application.status
    application.status = "rejected"
    application.rejection_reason = reason.strip() if reason else ""
    application.save(update_fields=["status", "rejection_reason", "updated_at"])
    _record_status_change(application, old, "rejected", admin_user, reason)

    from apps.applications.tasks import send_application_rejected_email
    from apps.notifications.services import create_notification

    create_notification(
        user=application.user,
        message=f"Your application for '{application.opportunity.title}' has been reviewed.",
        notification_type="application_status",
        category="application",
        priority="medium",
    )
    safe_delay(send_application_rejected_email, application.id)
    return application


def add_message(*, application: Application, sender, content: str = "", attachment=None) -> ApplicationMessage:
    """Add a chat message to an application thread."""
    msg = ApplicationMessage(
        application=application,
        sender=sender,
        content=content,
    )
    if attachment:
        msg.attachment = attachment
        msg.attachment_name = attachment.name
    msg.save()
    return msg


def _record_status_change(
    application: Application,
    from_status: str,
    to_status: str,
    changed_by,
    comment: str = "",
) -> None:
    ApplicationStatusHistory.objects.create(
        application=application,
        from_status=from_status,
        to_status=to_status,
        changed_by=changed_by,
        comment=comment,
    )