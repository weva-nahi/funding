from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "message",
            "notification_type",
            "category",
            "priority",
            "is_read",
            "is_archived",
            "link",
            "created_at",
        ]
