"""Application services — all write operations."""

import bleach
from django.conf import settings
from django.db import IntegrityError

from common.exceptions import ApplicationError

from .models import Application, ApplicationStatusHistory

_ALLOWED_TAGS = [
    "p", "br", "strong", "em", "u", "ul", "ol", "li",
    "h2", "h3", "blockquote", "a",
]
_ALLOWED_ATTRS = {"a": ["href", "title", "rel"]}


def _sanitize(html: str) -> str:
    if not html:
        return html
    return bleach.clean(html, tags=_ALLOWED_TAGS, attributes=_ALLOWED_ATTRS, strip=True)


def create_draft(*, user, opportunity) -> Application:
    # Business rule: a user may hold only ONE active (non-withdrawn)
    # application per opportunity, but may re-apply after withdrawing.
    # The DB now enforces this with a partial unique index covering only
    # non-withdrawn rows (see migration 0004). We still check explicitly to
    # return a friendly error, and we catch IntegrityError as a race-safe
    # fallback so a duplicate never escapes as a raw HTTP 500.
    if (
        Application.objects.filter(user=user, opportunity=opportunity)
        .exclude(status="withdrawn")
        .exists()
    ):
        raise ApplicationError(
            "You already have an active application for this opportunity."
        )
    if opportunity.is_expired:
        raise ApplicationError("This opportunity's deadline has passed.")

    try:
        app = Application.objects.create(
            user=user, opportunity=opportunity, status="draft"
        )
    except IntegrityError as exc:
        raise ApplicationError(
            "You already have an active application for this opportunity."
        ) from exc

    _record_status_change(app, "", "draft", user)
    return app


def update_draft(*, application: Application, **kwargs) -> Application:
    if application.status != "draft":
        raise ApplicationError("Only draft applications can be edited.")
    if "motivation_letter" in kwargs:
        application.motivation_letter = _sanitize(kwargs["motivation_letter"])
    application.save()
    return application


def submit_application(*, application: Application, user) -> Application:
    if application.status != "draft":
        raise ApplicationError("Only draft applications can be submitted.")

    # Accept submission if there is either a motivation letter or at least one
    # uploaded document — the frontend wizard supports either path.
    has_letter = bool(
        application.motivation_letter and application.motivation_letter.strip()
    )
    has_documents = application.documents.exists()

    if not has_letter and not has_documents:
        raise ApplicationError(
            "Please provide a motivation letter or upload at least one "
            "supporting document before submitting."
        )

    old = application.status
    application.status = "pending"
    application.version += 1
    application.save(update_fields=["status", "version", "updated_at"])
    _record_status_change(application, old, "pending", user)
    return application


def approve_application(
    *, application: Application, admin_user, comment: str = ""
) -> Application:
    if application.status not in ("pending", "in_review"):
        raise ApplicationError(
            "Only pending or in-review applications can be approved."
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
    send_application_approved_email.delay(application.id)
    return application


def reject_application(
    *, application: Application, admin_user, reason: str
) -> Application:
    if application.status not in ("pending", "in_review"):
        raise ApplicationError(
            "Only pending or in-review applications can be rejected."
        )

    min_length = getattr(settings, "REJECTION_REASON_MIN_LENGTH", 20)
    if not reason or len(reason.strip()) < min_length:
        raise ApplicationError(
            f"Rejection reason must be at least {min_length} characters long."
        )

    old = application.status
    application.status = "rejected"
    application.rejection_reason = reason.strip()
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
    send_application_rejected_email.delay(application.id)
    return application


def withdraw_application(*, application: Application, user) -> Application:
    if application.status in ("approved", "rejected", "withdrawn"):
        raise ApplicationError(
            f"An application with status '{application.status}' cannot be withdrawn."
        )
    old = application.status
    application.status = "withdrawn"
    application.save(update_fields=["status", "updated_at"])
    _record_status_change(application, old, "withdrawn", user)
    return application


def set_in_review(*, application: Application, admin_user) -> Application:
    if application.status != "pending":
        raise ApplicationError(
            "Only pending applications can be moved to in-review."
        )
    old = application.status
    application.status = "in_review"
    application.save(update_fields=["status", "updated_at"])
    _record_status_change(application, old, "in_review", admin_user)
    return application


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