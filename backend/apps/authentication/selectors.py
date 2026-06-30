"""Authentication selectors — read-only queries."""

from django.db.models import Q

from .models import Profile, User


def get_user_by_id(*, user_id: int) -> User:
    return User.objects.get(id=user_id)


def get_user_by_email(*, email: str) -> User:
    return User.objects.get(email__iexact=email)


def get_user_profile(*, user: User) -> Profile:
    return Profile.objects.select_related("user").get(user=user)


def get_verified_users(*, search: str = None):
    """Return all verified users (admin panel — unverified accounts hidden)."""
    qs = User.objects.filter(is_email_verified=True).select_related("profile")
    if search:
        qs = qs.filter(
            Q(email__icontains=search)
            | Q(profile__first_name__icontains=search)
            | Q(profile__last_name__icontains=search)
            | Q(profile__company__icontains=search)
        )
    return qs.order_by("-created_at")


def get_active_users(*, search: str = None):
    """Return all active users (legacy, kept for compatibility)."""
    qs = User.objects.filter(is_active=True, is_email_verified=True).select_related("profile")
    if search:
        qs = qs.filter(
            Q(email__icontains=search)
            | Q(profile__first_name__icontains=search)
            | Q(profile__last_name__icontains=search)
            | Q(profile__company__icontains=search)
        )
    return qs.order_by("-created_at")


def get_all_clients():
    """Return all verified client users."""
    return User.objects.filter(role="client", is_email_verified=True).select_related("profile").order_by("-created_at")