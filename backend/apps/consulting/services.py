"""Consulting services — pure conversation model."""

from .models import ConsultingMessage, ConsultingRequest


def create_request(*, user, description, priority="medium") -> ConsultingRequest:
    req = ConsultingRequest.objects.create(
        user=user, description=description, priority=priority, status="pending"
    )

    from apps.notifications.services import notify_all_admins

    preview = description.strip()[:120]
    notify_all_admins(
        message=f"{user.email}: {preview}" if preview else f"New consulting request from {user.email}.",
        notification_type="new_message",
        category="messaging",
        link=f"/admin/messages?contact={user.id}",
    )

    return req


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

    from apps.notifications.services import create_notification, notify_all_admins

    preview = (content or (attachment.name if attachment else "")).strip()[:120]
    if sender.role == "admin":
        create_notification(
            user=req.user,
            message=f"Richat: {preview}" if preview else "New message from the Richat team.",
            notification_type="new_message",
            category="messaging",
            link="/messages",
        )
    else:
        notify_all_admins(
            message=f"{req.user.email}: {preview}" if preview else f"New message from {req.user.email}.",
            notification_type="new_message",
            category="messaging",
            link=f"/admin/messages?contact={req.user_id}",
        )

    return msg


def close_request(*, request_id: int) -> ConsultingRequest:
    req = ConsultingRequest.objects.get(id=request_id)
    req.status = "closed"
    req.save(update_fields=["status", "updated_at"])
    return req