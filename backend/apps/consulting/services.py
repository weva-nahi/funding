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

    req.admin_response = response
    req.responded_by = admin_user
    req.responded_at = timezone.now()
    req.status = "resolved" if action == "resolve" else "rejected"
    req.save()

    from apps.notifications.services import create_notification

    create_notification(
        user=req.user,
        message=f"Your consulting request #{req.id} has been {'answered' if action == 'resolve' else 'declined'}.",
        notification_type="consulting_response",
        category="consulting",
    )
    return req
