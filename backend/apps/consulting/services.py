"""Consulting services — pure conversation model."""

from .models import ConsultingMessage, ConsultingRequest


def create_request(*, user, description, priority="medium") -> ConsultingRequest:
    return ConsultingRequest.objects.create(
        user=user, description=description, priority=priority, status="pending"
    )


def add_message(*, request_id: int, sender, content: str = "", attachment=None) -> ConsultingMessage:
    """Add a message to the consulting thread. Auto-activates the request."""
    req = ConsultingRequest.objects.get(id=request_id)

    msg = ConsultingMessage(
        request=req,
        sender=sender,
        content=content,
    )
    if attachment:
        msg.attachment = attachment
        msg.attachment_name = attachment.name
    msg.save()

    # Auto-set to active when admin replies
    if sender.role == "admin" and req.status == "pending":
        req.status = "active"
        req.save(update_fields=["status", "updated_at"])

    return msg


def close_request(*, request_id: int) -> ConsultingRequest:
    req = ConsultingRequest.objects.get(id=request_id)
    req.status = "closed"
    req.save(update_fields=["status", "updated_at"])
    return req