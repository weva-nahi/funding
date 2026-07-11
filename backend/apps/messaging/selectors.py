"""Messaging selectors — read-only aggregation across the applications and
consulting apps' message threads. This app owns no models of its own; it only
queries ApplicationMessage/ConsultingMessage/Application/ConsultingRequest,
mirroring how apps.analytics aggregates across other apps without owning the
underlying data.
"""

from django.db.models import Max, Q

from apps.applications.models import ApplicationMessage
from apps.consulting.models import ConsultingMessage, ConsultingRequest
from apps.authentication.models import User
from apps.notifications.models import Notification


def _message_preview(content: str, attachment_name: str) -> str:
    if content:
        return content.strip()[:120]
    if attachment_name:
        return attachment_name
    return ""


def _to_message_dict(msg, source: str) -> dict:
    return {
        "id": msg.id,
        "source": source,
        "application_id": msg.application_id if source == "application" else None,
        "consulting_request_id": msg.request_id if source == "consulting" else None,
        "sender_email": msg.sender.email,
        "sender_role": msg.sender.role,
        "content": msg.content,
        "attachment": msg.attachment.url if msg.attachment else None,
        "attachment_name": msg.attachment_name,
        "created_at": msg.created_at,
    }


def _request_opening_message(req: ConsultingRequest) -> dict:
    """A ConsultingRequest's `description` is effectively the client's opening
    message but isn't stored as a ConsultingMessage row — synthesize one so it
    appears in the merged thread instead of only on the Consulting page's
    request card. Uses a negative id (real message ids are positive
    auto-increment) so it never collides with an actual message id.
    """
    return {
        "id": -req.id,
        "source": "consulting",
        "application_id": None,
        "consulting_request_id": req.id,
        "sender_email": req.user.email,
        "sender_role": "client",
        "content": req.description,
        "attachment": None,
        "attachment_name": "",
        "created_at": req.created_at,
    }


def get_merged_thread(*, user) -> list[dict]:
    """All messages (application + consulting, including each consulting
    request's opening description) belonging to this user's own threads,
    merged and sorted chronologically. Single user — no grouping needed.
    """
    app_messages = (
        ApplicationMessage.objects.filter(application__user=user)
        .select_related("sender", "application")
        .order_by("created_at")
    )
    consult_messages = (
        ConsultingMessage.objects.filter(request__user=user)
        .select_related("sender", "request")
        .order_by("created_at")
    )
    consult_requests = ConsultingRequest.objects.filter(user=user).select_related("user")

    merged = (
        [_to_message_dict(m, "application") for m in app_messages]
        + [_to_message_dict(m, "consulting") for m in consult_messages]
        + [_request_opening_message(r) for r in consult_requests]
    )
    merged.sort(key=lambda m: m["created_at"])
    return merged


def _unread_count_for_admin(*, client_user, admin_user) -> int:
    """Proxy for "unread messages from this client": there is no is_read field
    on ApplicationMessage/ConsultingMessage, so we count unread Notification
    rows created for this admin when this client sent a message (see the
    `link=f"/admin/messages?contact={client_user.id}"` set in add_message and
    create_request). This is a pragmatic proxy, not a precise read receipt.
    """
    return Notification.objects.filter(
        user=admin_user,
        notification_type="new_message",
        link=f"/admin/messages?contact={client_user.id}",
        is_read=False,
    ).count()


def get_admin_contact_list(*, admin_user, search: str = None) -> list[dict]:
    """One row per distinct client with >=1 message (or a consulting request,
    whose description counts as an opening message) across either source,
    sorted by most recent activity. Low-traffic B2B app on MySQL 8.0 — a
    Python-side merge of small aggregate queries is the pragmatic choice
    here, no need for a raw SQL UNION.
    """
    app_agg = ApplicationMessage.objects.values("application__user_id").annotate(last_at=Max("created_at"))
    consult_agg = ConsultingMessage.objects.values("request__user_id").annotate(last_at=Max("created_at"))
    request_agg = ConsultingRequest.objects.values("user_id").annotate(last_at=Max("created_at"))

    last_at_by_user = {}
    for row in app_agg:
        uid = row["application__user_id"]
        last_at_by_user[uid] = max(last_at_by_user.get(uid, row["last_at"]), row["last_at"])
    for row in consult_agg:
        uid = row["request__user_id"]
        last_at_by_user[uid] = max(last_at_by_user.get(uid, row["last_at"]), row["last_at"])
    for row in request_agg:
        uid = row["user_id"]
        last_at_by_user[uid] = max(last_at_by_user.get(uid, row["last_at"]), row["last_at"])

    if not last_at_by_user:
        return []

    users = User.objects.filter(id__in=last_at_by_user.keys()).select_related("profile")
    if search:
        users = users.filter(Q(email__icontains=search) | Q(profile__company__icontains=search))

    contacts = []
    for user in users:
        thread = get_merged_thread(user=user)
        if not thread:
            continue
        last_msg = thread[-1]

        profile = getattr(user, "profile", None)
        display_name = (profile.full_name if profile and profile.full_name else user.email)

        contacts.append({
            "user_id": user.id,
            "email": user.email,
            "display_name": display_name,
            "company": profile.company if profile else "",
            "avatar": profile.avatar.url if profile and profile.avatar else None,
            "last_message_preview": _message_preview(last_msg["content"], last_msg["attachment_name"]),
            "last_message_at": last_at_by_user[user.id],
            "unread_count": _unread_count_for_admin(client_user=user, admin_user=admin_user),
        })

    contacts.sort(key=lambda c: c["last_message_at"], reverse=True)
    return contacts


def get_admin_thread_for_client(*, client_user) -> list[dict]:
    """Same shape as get_merged_thread, scoped to a specific client, for the
    admin-side conversation view."""
    return get_merged_thread(user=client_user)


def get_unread_message_count(*, user) -> int:
    return Notification.objects.filter(
        user=user, notification_type="new_message", is_read=False
    ).count()
