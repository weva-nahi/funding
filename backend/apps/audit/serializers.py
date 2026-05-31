from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
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
