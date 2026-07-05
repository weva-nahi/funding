"""Helpers for dispatching Celery tasks from request-handling code paths."""

import logging

logger = logging.getLogger(__name__)


def safe_delay(task, *args, **kwargs):
    """Enqueue a Celery task without letting a broker outage break the caller.

    Email notifications are best-effort side effects — the primary action
    (registration, password reset, application review) must still succeed
    even if Redis/Celery is temporarily unreachable, e.g. during local dev
    when the worker hasn't been started.
    """
    try:
        return task.delay(*args, **kwargs)
    except Exception:
        logger.warning(
            "Failed to enqueue task %s — is the Celery broker running?",
            getattr(task, "name", task),
            exc_info=True,
        )
        return None
