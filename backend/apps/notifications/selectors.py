"""Notification selectors."""

from .models import Notification


def get_user_notifications(*, user, category=None, is_read=None):
    qs = Notification.objects.filter(user=user, is_archived=False)
    if category:
        qs = qs.filter(category=category)
    if is_read is not None:
        qs = qs.filter(is_read=is_read)
    return qs.order_by("-created_at")


def get_unread_count(*, user):
    return Notification.objects.filter(user=user, is_read=False, is_archived=False).count()
