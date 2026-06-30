from rest_framework import serializers

from .models import FundingOpportunity


class FundingOpportunitySerializer(serializers.ModelSerializer):
    is_expired = serializers.BooleanField(read_only=True)
    is_saved = serializers.SerializerMethodField()

    class Meta:
        model = FundingOpportunity
        fields = [
            "id", "title", "source", "description", "country", "city", "amount", "currency",
            "deadline", "eligibility_criteria", "required_documents", "funding_type",
            "sector", "completeness_score", "status", "url", "metadata", "is_expired",
            "is_saved", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "completeness_score", "is_expired", "created_at", "updated_at"]

    def get_is_saved(self, obj) -> bool:
        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            return False
        saved_ids = self.context.get("saved_ids")
        if saved_ids is not None:
            return obj.id in saved_ids
        from .selectors import is_opportunity_saved
        return is_opportunity_saved(user=request.user, opportunity_id=obj.id)


class FundingOpportunityListSerializer(serializers.ModelSerializer):
    is_expired = serializers.BooleanField(read_only=True)
    is_saved = serializers.SerializerMethodField()

    class Meta:
        model = FundingOpportunity
        fields = [
            "id", "title", "source", "country", "city", "amount", "currency", "deadline",
            "funding_type", "sector", "completeness_score", "status", "is_expired",
            "is_saved", "created_at",
        ]

    def get_is_saved(self, obj) -> bool:
        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            return False
        saved_ids = self.context.get("saved_ids")
        if saved_ids is not None:
            return obj.id in saved_ids
        from .selectors import is_opportunity_saved
        return is_opportunity_saved(user=request.user, opportunity_id=obj.id)


class OpportunityCreateSerializer(serializers.ModelSerializer):
    # Source is free text (not dropdown) — admin enters it manually
    source = serializers.CharField(max_length=200)
    amount = serializers.DecimalField(max_digits=20, decimal_places=2)  # Required
    deadline = serializers.DateField()  # Required

    class Meta:
        model = FundingOpportunity
        fields = [
            "title", "source", "description", "country", "amount", "currency",
            "deadline", "eligibility_criteria", "required_documents", "funding_type",
            "sector", "url", "metadata",
        ]

    def validate_funding_type(self, value):
        from django.conf import settings
        allowed = getattr(settings, "ISLAMIC_FINANCE_ALLOWED_TYPES", ["grant", "concessional", "blended"])
        if value and value not in allowed:
            raise serializers.ValidationError(
                f"Funding type must be one of: {', '.join(allowed)}"
            )
        return value


class OpportunityUpdateSerializer(serializers.ModelSerializer):
    source = serializers.CharField(max_length=200, required=False)

    class Meta:
        model = FundingOpportunity
        fields = [
            "title", "source", "description", "country", "amount", "currency",
            "deadline", "eligibility_criteria", "required_documents", "funding_type",
            "sector", "url", "metadata", "status",
        ]
        extra_kwargs = {f: {"required": False} for f in fields}


class ExcelImportSerializer(serializers.Serializer):
    file = serializers.FileField()


class BulkPublishSerializer(serializers.Serializer):
    ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)