from rest_framework import serializers

from .models import ConsultingRequest


class ConsultingRequestSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    company = serializers.CharField(source="user.profile.company", read_only=True, default="")

    class Meta:
        model = ConsultingRequest
        fields = [
            "id",
            "user_email",
            "company",
            "description",
            "priority",
            "status",
            "admin_response",
            "responded_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user_email",
            "company",
            "status",
            "admin_response",
            "responded_at",
            "created_at",
            "updated_at",
        ]


class ConsultingCreateSerializer(serializers.Serializer):
    description = serializers.CharField(min_length=10)
    priority = serializers.ChoiceField(choices=["low", "medium", "high"], default="medium")


class ConsultingRespondSerializer(serializers.Serializer):
    response = serializers.CharField(min_length=5)
    action = serializers.ChoiceField(choices=["resolve", "reject"])
