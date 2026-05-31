"""Audit middleware — auto-logs API write operations."""

import logging

from .services import create_audit_log

logger = logging.getLogger(__name__)

AUDIT_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


class AuditLogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if request.method in AUDIT_METHODS and request.path.startswith("/api/"):
            try:
                user = request.user if request.user.is_authenticated else None
                ip = self._get_client_ip(request)
                ua = request.META.get("HTTP_USER_AGENT", "")

                create_audit_log(
                    user=user,
                    action=f"{request.method} {request.path}",
                    model_name=self._extract_model(request.path),
                    ip_address=ip,
                    user_agent=ua[:500],
                )
            except Exception as e:
                logger.warning(f"Audit log failed: {e}")

        return response

    def _get_client_ip(self, request):
        xff = request.META.get("HTTP_X_FORWARDED_FOR")
        if xff:
            return xff.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")

    def _extract_model(self, path):
        parts = [p for p in path.split("/") if p and p != "api" and p != "v1"]
        return parts[0] if parts else "unknown"
