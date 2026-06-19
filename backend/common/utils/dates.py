"""Date utility functions."""

import datetime

from django.utils import timezone


def _coerce_date(value):
    """Coerce a value to datetime.date, or return None if impossible."""
    if value is None:
        return None
    if isinstance(value, datetime.datetime):
        return value.date()
    if isinstance(value, datetime.date):
        return value
    if isinstance(value, str):
        try:
            return datetime.date.fromisoformat(value)
        except (ValueError, TypeError):
            return None
    return None


def days_until(target_date):
    """Return days remaining until target date, or None if no date."""
    d = _coerce_date(target_date)
    if d is None:
        return None
    delta = d - timezone.now().date()
    return delta.days


def is_deadline_passed(deadline):
    """Check if a deadline has passed."""
    d = _coerce_date(deadline)
    if d is None:
        return False
    return timezone.now().date() > d