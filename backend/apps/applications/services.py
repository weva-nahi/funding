"""Application services — all write operations."""

from common.exceptions import ApplicationError

from .models import Application, ApplicationStatusHistory


def create_draft(*, user, opportunity) -> Application:
    if Application.objects.filter(user=user, opportunity=opportunity).exclude(status="withdrawn").exists():
        raise ApplicationError("You already have an application for this opportunity.")
    if opportunity.is_expired:
        raise ApplicationError("This opportunity's deadline has passed.")

    app = Application.objects.create(user=user, opportunity=opportunity, status="draft")
    _record_status_change(app, "", "draft", user)
    return app


def update_draft(*, application: Application, **kwargs) -> Application:
    if application.status != "draft":
        raise ApplicationError("Only draft applications can be edited.")
    for field, value in kwargs.items():
        if hasattr(application, field) and field not in ("status", "user", "opportunity"):
            setattr(application, field, value)
    application.save()
    return application


def submit_application(*, application: Application, user) -> Application:
    if application.status != "draft":
        raise ApplicationError("Only draft applications can be submitted.")
    if not application.motivation_letter:
        raise ApplicationError("Motivation letter is required.")

    old = application.status
    application.status = "pending"
    application.version += 1
    application.save(update_fields=["status", "version", "updated_at"])
    _record_status_change(application, old, "pending", user)
    return application


def approve_application(*, application: Application, admin_user, comment="") -> Application:
    if application.status not in ("pending", "in_review"):
        raise ApplicationError("Only pending or in-review applications can be approved.")

    old = application.status
    application.status = "approved"
    application.admin_comment = comment
    application.save(update_fields=["status", "admin_comment", "updated_at"])
    _record_status_change(application, old, "approved", admin_user, comment)

    # Trigger notification
    from apps.notifications.services import create_notification

    create_notification(
        user=application.user,
        message=f"Your application for '{application.opportunity.title}' has been approved!",
        notification_type="application_status",
        category="application",
    )
    return application


def reject_application(*, application: Application, admin_user, reason: str) -> Application:
    if application.status not in ("pending", "in_review"):
        raise ApplicationError("Only pending or in-review applications can be rejected.")
    if len(reason) < 20:
        raise ApplicationError("Rejection reason must be at least 20 characters.")

    old = application.status
    application.status = "rejected"
    application.rejection_reason = reason
    application.save(update_fields=["status", "rejection_reason", "updated_at"])
    _record_status_change(application, old, "rejected", admin_user, reason)

    from apps.notifications.services import create_notification

    create_notification(
        user=application.user,
        message=f"Your application for '{application.opportunity.title}' has been rejected.",
        notification_type="application_status",
        category="application",
    )
    return application


def withdraw_application(*, application: Application, user) -> Application:
    if application.status in ("approved", "rejected", "withdrawn"):
        raise ApplicationError("This application cannot be withdrawn.")

    old = application.status
    application.status = "withdrawn"
    application.save(update_fields=["status", "updated_at"])
    _record_status_change(application, old, "withdrawn", user)
    return application


def set_in_review(*, application: Application, admin_user) -> Application:
    if application.status != "pending":
        raise ApplicationError("Only pending applications can be set to in-review.")

    old = application.status
    application.status = "in_review"
    application.save(update_fields=["status", "updated_at"])
    _record_status_change(application, old, "in_review", admin_user)
    return application


def _record_status_change(application, from_status, to_status, changed_by, comment=""):
    ApplicationStatusHistory.objects.create(
        application=application,
        from_status=from_status,
        to_status=to_status,
        changed_by=changed_by,
        comment=comment,
    )
