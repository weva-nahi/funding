from rest_framework import serializers

from .models import ConsultingMessage, ConsultingRequest


class ConsultingMessageSerializer(serializers.ModelSerializer):
    sender_email = serializers.EmailField(source="sender.email", read_only=True)
    sender_role = serializers.CharField(source="sender.role", read_only=True)

    class Meta:
        model = ConsultingMessage
        fields = ["id", "sender_email", "sender_role", "content", "attachment", "attachment_name", "created_at"]
        read_only_fields = ["id", "sender_email", "sender_role", "created_at"]


class ConsultingRequestSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    company = serializers.CharField(source="user.profile.company", read_only=True, default="")
    messages = ConsultingMessageSerializer(many=True, read_only=True)

    class Meta:
        model = ConsultingRequest
        fields = [
            "id",
            "user_email",
            "company",
            "description",
            "priority",
            "status",
            "messages",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user_email",
            "company",
            "status",
            "messages",
            "created_at",
            "updated_at",
        ]


class ConsultingListSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    company = serializers.CharField(source="user.profile.company", read_only=True, default="")
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = ConsultingRequest
        fields = ["id", "user_email", "company", "description", "priority", "status", "last_message", "created_at"]

    def get_last_message(self, obj):
        msg = obj.messages.last()
        if msg:
            return {"content": msg.content, "sender_role": msg.sender.role, "created_at": msg.created_at}
        return None


class ConsultingCreateSerializer(serializers.Serializer):
    description = serializers.CharField(min_length=10, max_length=1000)
    priority = serializers.ChoiceField(choices=["low", "medium", "high"], default="medium")


class ConsultingMessageCreateSerializer(serializers.Serializer):
    content = serializers.CharField(required=False, allow_blank=True, max_length=2000)