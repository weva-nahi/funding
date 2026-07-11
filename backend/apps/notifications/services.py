"""Notification services."""

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import Notification

_PREFERENCE_MAP = {
    "application_status": "notify_application_status",
    "new_opportunity": "notify_new_opportunities",
    "consulting_response": "notify_consulting_response",
    "deadline_reminder": "notify_deadline_reminder",
    "system": "notify_system_announcements",
    "new_message": "notify_new_message",
}


def create_notification(*, user, message, notification_type, category="system", priority="medium", link=""):
    # Check the user's opt-out preference for this notification type.
    pref_field = _PREFERENCE_MAP.get(notification_type)
    if pref_field and hasattr(user, "profile"):
        if not getattr(user.profile, pref_field, True):
            return None

    # For users on daily digest: store the message in their pending_digest
    # field instead of creating an in-app notification immediately.
    # We still create the Notification record so the history is preserved,
    # but we skip the realtime push and email until the daily task runs.
    if (
        hasattr(user, "profile")
        and getattr(user.profile, "notify_frequency", "immediate") == "daily"
        and notification_type != "scraping_complete"  # always immediate for admins
    ):
        notification = Notification.objects.create(
            user=user,
            message=message,
            notification_type=notification_type,
            category=category,
            priority=priority,
            link=link,
        )
        # Queue for daily digest email
        profile = user.profile
        pending = list(profile.pending_digest or [])
        pending.append(message)
        profile.pending_digest = pending
        profile.save(update_fields=["pending_digest"])
        return notification

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


def notify_all_admins(*, message, notification_type, category="system", priority="medium", link=""):
    """Fan out a notification to every admin user.

    There is no "assigned admin" concept in this codebase — every admin already
    sees every application/consulting request unfiltered — so fan-out-to-all is
    the only convention-consistent way to notify admins of a new client message.
    """
    from apps.authentication.models import User

    for admin in User.objects.filter(role="admin", is_active=True):
        create_notification(
            user=admin,
            message=message,
            notification_type=notification_type,
            category=category,
            priority=priority,
            link=link,
        )


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
        pass