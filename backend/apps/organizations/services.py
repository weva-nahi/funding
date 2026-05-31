"""Organization services."""

from .models import Organization


def create_organization(*, user, **kwargs) -> Organization:
    return Organization.objects.create(user=user, **kwargs)


def update_organization(*, organization: Organization, **kwargs) -> Organization:
    for field, value in kwargs.items():
        if hasattr(organization, field):
            setattr(organization, field, value)
    organization.save()
    return organization
