"""Organization selectors."""

from .models import Organization


def get_organization_by_user(*, user):
    return Organization.objects.filter(user=user).first()


def get_all_organizations(*, search=None):
    qs = Organization.objects.select_related("user").all()
    if search:
        qs = qs.filter(name__icontains=search)
    return qs.order_by("-created_at")
