"""Base permission classes."""

from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Allow access only to admin users."""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == "admin"


class IsClient(BasePermission):
    """Allow access only to client users."""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == "client"


class IsOwner(BasePermission):
    """Allow access only to the owner of the object."""

    def has_object_permission(self, request, view, obj):
        if hasattr(obj, "user"):
            return obj.user == request.user
        if hasattr(obj, "owner"):
            return obj.owner == request.user
        return False


class IsAdminOrOwner(BasePermission):
    """Allow access to admins or the owner."""

    def has_object_permission(self, request, view, obj):
        if request.user.role == "admin":
            return True
        if hasattr(obj, "user"):
            return obj.user == request.user
        return False
