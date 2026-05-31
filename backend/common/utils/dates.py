"""Date utility functions."""

from django.utils import timezone


def days_until(target_date):
    """Return days remaining until target date, or None if no date."""
    if not target_date:
        return None
    delta = target_date - timezone.now().date()
    return delta.days


def is_deadline_passed(deadline):
    """Check if a deadline has passed."""
    if not deadline:
        return False
    return timezone.now().date() > deadline
