"""Standardized API exception handling."""

from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    """Wrap DRF exceptions in a consistent format."""
    response = exception_handler(exc, context)

    if response is not None:
        response.data = {
            "success": False,
            "error": {
                "code": response.status_code,
                "message": _extract_message(response.data),
                "details": response.data,
            },
        }

    return response


def _extract_message(data):
    """Extract a human-readable message from error data."""
    if isinstance(data, dict):
        if "detail" in data:
            return str(data["detail"])
        first_key = next(iter(data), None)
        if first_key:
            value = data[first_key]
            if isinstance(value, list):
                return str(value[0])
            return str(value)
    if isinstance(data, list):
        return str(data[0])
    return str(data)


class ApplicationError(APIException):
    """Base exception for business logic errors."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "A business logic error occurred."
    default_code = "application_error"


class PermissionDeniedError(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "You do not have permission to perform this action."
    default_code = "permission_denied"


class NotFoundError(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "The requested resource was not found."
    default_code = "not_found"


class ConflictError(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "A conflict occurred with the current state."
    default_code = "conflict"


class AccountLockedError(APIException):
    status_code = status.HTTP_423_LOCKED
    default_detail = "Account locked due to too many failed login attempts."
    default_code = "account_locked"


class InvalidFileError(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "The uploaded file is invalid."
    default_code = "invalid_file"
