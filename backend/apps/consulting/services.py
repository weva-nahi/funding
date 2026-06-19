"""Consulting services."""

from django.utils import timezone

from common.exceptions import ApplicationError

from .models import ConsultingRequest


def create_request(*, user, description, priority="medium"):
    return ConsultingRequest.objects.create(user=user, description=description, priority=priority)


def respond_to_request(*, request_id, admin_user, response, action="resolve"):
    req = ConsultingRequest.objects.get(id=request_id)
    if req.status in ("resolved", "rejected"):
        raise ApplicationError("This request has already been handled.")

    # in_progress is an intermediate transition — mark it without closing the
    # request or sending a completion notification.
    if action == "in_progress":
        req.status = "in_progress"
        if response:
            req.admin_response = response
        req.responded_by = admin_user
        req.save(update_fields=["status", "admin_response", "responded_by", "updated_at"])
        return req

    req.admin_response = response
    req.responded_by = admin_user
    req.responded_at = timezone.now()
    req.status = "resolved" if action == "resolve" else "rejected"
    req.save()

    from apps.notifications.services import create_notification
    from apps.notifications.tasks import send_consulting_response_email

    create_notification(
        user=req.user,
        message=f"Your consulting request #{req.id} has been {'answered' if action == 'resolve' else 'declined'}.",
        notification_type="consulting_response",
        category="consulting",
    )
    send_consulting_response_email.delay(req.id)
    return req