"""Notification services."""

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import Notification


def create_notification(*, user, message, notification_type, category="system", priority="medium", link=""):
    notification = Notification.objects.create(
        user=user,
        message=message,
        notification_type=notification_type,
        category=category,
        priority=priority,
        link=link,
    )
    _send_realtime(notification)
    return notification


def mark_as_read(*, notification_id, user):
    Notification.objects.filter(id=notification_id, user=user).update(is_read=True)


def mark_all_as_read(*, user):
    Notification.objects.filter(user=user, is_read=False).update(is_read=True)


def archive_notification(*, notification_id, user):
    Notification.objects.filter(id=notification_id, user=user).update(is_archived=True)


def _send_realtime(notification):
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"notifications_{notification.user.id}",
            {
                "type": "send_notification",
                "notification": {
                    "id": notification.id,
                    "message": notification.message,
                    "type": notification.notification_type,
                    "category": notification.category,
                    "priority": notification.priority,
                    "link": notification.link,
                    "is_read": False,
                    "created_at": notification.created_at.isoformat(),
                },
            },
        )
    except Exception:
        pass  # Don't fail if WebSocket is unavailable
