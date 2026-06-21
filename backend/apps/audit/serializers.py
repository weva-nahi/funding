from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    """List view — kept lean for pagination performance."""

    user_email = serializers.EmailField(source="user.email", read_only=True, default=None)

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "user_email",
            "action",
            "model_name",
            "record_id",
            "timestamp",
            "ip_address",
        ]


class AuditLogDetailSerializer(serializers.ModelSerializer):
    """Detail view — the 'more info, organized' surface. Exposes fields
    that already existed on the model (data_before, data_after, user_agent)
    but were never returned to the frontend, so clicking a log row had
    nowhere further to go."""

    user_email = serializers.EmailField(source="user.email", read_only=True, default=None)

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "user_email",
            "action",
            "model_name",
            "record_id",
            "data_before",
            "data_after",
            "timestamp",
            "ip_address",
            "user_agent",
        ]