from rest_framework import serializers

from .models import Application, ApplicationStatusHistory


class ApplicationListSerializer(serializers.ModelSerializer):
    opportunity_title = serializers.CharField(source="opportunity.title", read_only=True)
    opportunity_source = serializers.CharField(source="opportunity.source", read_only=True)
    opportunity_deadline = serializers.DateField(source="opportunity.deadline", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Application
        fields = [
            "id",
            "status",
            "opportunity_title",
            "opportunity_source",
            "opportunity_deadline",
            "user_email",
            "version",
            "created_at",
            "updated_at",
        ]


class StatusHistorySerializer(serializers.ModelSerializer):
    changed_by_email = serializers.EmailField(source="changed_by.email", read_only=True, default=None)

    class Meta:
        model = ApplicationStatusHistory
        fields = ["id", "from_status", "to_status", "changed_by_email", "comment", "created_at"]


class ApplicationDetailSerializer(serializers.ModelSerializer):
    opportunity_title = serializers.CharField(source="opportunity.title", read_only=True)
    opportunity_id = serializers.IntegerField(source="opportunity.id", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    status_history = StatusHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Application
        fields = [
            "id",
            "user_email",
            "opportunity_id",
            "opportunity_title",
            "motivation_letter",
            "status",
            "admin_comment",
            "rejection_reason",
            "version",
            "status_history",
            "created_at",
            "updated_at",
        ]


class ApplicationCreateSerializer(serializers.Serializer):
    opportunity_id = serializers.IntegerField()


class ApplicationUpdateSerializer(serializers.Serializer):
    motivation_letter = serializers.CharField(required=False, allow_blank=True)


class ApplicationReviewSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["approve", "reject"])
    comment = serializers.CharField(required=False, allow_blank=True, default="")
    reason = serializers.CharField(required=False, allow_blank=True, default="")
