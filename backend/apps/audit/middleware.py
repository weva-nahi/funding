"""Audit middleware — auto-logs API write operations with record id."""

import logging
import re

from .services import create_audit_log

logger = logging.getLogger(__name__)

AUDIT_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
_ACTION_BY_METHOD = {"POST": "CREATE", "PUT": "UPDATE", "PATCH": "UPDATE", "DELETE": "DELETE"}
_ID_RE = re.compile(r"/(\d+)/")

# Paths that are excluded from audit logging entirely.
_EXCLUDE_PATHS = {
    "/api/v1/auth/token/refresh/",
}

# Only log requests whose response status indicates success.
_SUCCESS_STATUSES = {200, 201, 204}


class AuditLogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if request.method not in AUDIT_METHODS:
            return response
        if not request.path.startswith("/api/"):
            return response

        # Skip noisy / irrelevant paths.
        if request.path in _EXCLUDE_PATHS:
            return response

        # Only log successful writes — 4xx/5xx aren't audit-worthy.
        if response.status_code not in _SUCCESS_STATUSES:
            return response

        try:
            user = request.user if request.user.is_authenticated else None
            ip = self._get_client_ip(request)
            ua = request.META.get("HTTP_USER_AGENT", "")
            create_audit_log(
                user=user,
                action=_ACTION_BY_METHOD.get(request.method, request.method),
                model_name=self._extract_model(request.path),
                record_id=self._extract_record_id(request.path),
                data_after={
                    "method": request.method,
                    "path": request.path,
                    "status": response.status_code,
                    "success": True,
                },
                ip_address=ip,
                user_agent=ua[:500],
            )
        except Exception as e:  # noqa: BLE001
            logger.warning(f"Audit log failed: {e}")

        return response

    def _get_client_ip(self, request):
        xff = request.META.get("HTTP_X_FORWARDED_FOR")
        if xff:
            return xff.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")

    def _extract_model(self, path):
        parts = [p for p in path.split("/") if p and p not in ("api", "v1")]
        return parts[0] if parts else "unknown"

    def _extract_record_id(self, path):
        match = _ID_RE.search(path)
        return int(match.group(1)) if match else None