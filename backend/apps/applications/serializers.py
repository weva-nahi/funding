from rest_framework import serializers

from .models import Application, ApplicationMessage, ApplicationStatusHistory


class ApplicationListSerializer(serializers.ModelSerializer):
    opportunity_title = serializers.CharField(source="opportunity.title", read_only=True)
    opportunity_source = serializers.CharField(source="opportunity.source", read_only=True)
    opportunity_deadline = serializers.DateField(source="opportunity.deadline", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    company = serializers.CharField(source="user.profile.company", read_only=True, default="")

    class Meta:
        model = Application
        fields = [
            "id",
            "status",
            "opportunity_title",
            "opportunity_source",
            "opportunity_deadline",
            "user_email",
            "company",
            "version",
            "created_at",
            "updated_at",
        ]


class StatusHistorySerializer(serializers.ModelSerializer):
    changed_by_email = serializers.EmailField(source="changed_by.email", read_only=True, default=None)

    class Meta:
        model = ApplicationStatusHistory
        fields = ["id", "from_status", "to_status", "changed_by_email", "comment", "created_at"]


class ApplicationMessageSerializer(serializers.ModelSerializer):
    sender_email = serializers.EmailField(source="sender.email", read_only=True)
    sender_role = serializers.CharField(source="sender.role", read_only=True)

    class Meta:
        model = ApplicationMessage
        fields = ["id", "sender_email", "sender_role", "content", "attachment", "attachment_name", "created_at"]
        read_only_fields = ["id", "sender_email", "sender_role", "created_at"]


class ApplicationDetailSerializer(serializers.ModelSerializer):
    opportunity_title = serializers.CharField(source="opportunity.title", read_only=True)
    opportunity_id = serializers.IntegerField(source="opportunity.id", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    company = serializers.CharField(source="user.profile.company", read_only=True, default="")
    first_name = serializers.CharField(source="user.profile.first_name", read_only=True, default="")
    last_name = serializers.CharField(source="user.profile.last_name", read_only=True, default="")
    status_history = StatusHistorySerializer(many=True, read_only=True)
    messages = ApplicationMessageSerializer(many=True, read_only=True)

    class Meta:
        model = Application
        fields = [
            "id",
            "user_email",
            "company",
            "first_name",
            "last_name",
            "opportunity_id",
            "opportunity_title",
            "motivation_letter",
            "status",
            "admin_comment",
            "rejection_reason",
            "version",
            "status_history",
            "messages",
            "created_at",
            "updated_at",
        ]


class ApplicationCreateSerializer(serializers.Serializer):
    opportunity_id = serializers.IntegerField()
    motivation_letter = serializers.CharField(required=False, allow_blank=True, max_length=2000)


class ApplicationUpdateSerializer(serializers.Serializer):
    motivation_letter = serializers.CharField(required=False, allow_blank=True, max_length=2000)


class ApplicationReviewSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["approve", "reject", "shortlist"])
    comment = serializers.CharField(required=False, allow_blank=True, default="")
    reason = serializers.CharField(required=False, allow_blank=True, default="")


class ApplicationMessageCreateSerializer(serializers.Serializer):
    content = serializers.CharField(required=False, allow_blank=True, max_length=2000)


class BulkShortlistSerializer(serializers.Serializer):
    ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)