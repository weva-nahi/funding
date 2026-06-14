from rest_framework import serializers

from .models import FundingOpportunity


class FundingOpportunitySerializer(serializers.ModelSerializer):
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = FundingOpportunity
        fields = [
            "id", "title", "source", "description", "country", "amount", "currency",
            "deadline", "eligibility_criteria", "required_documents", "funding_type",
            "sector", "completeness_score", "status", "url", "metadata", "is_expired",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "completeness_score", "is_expired", "created_at", "updated_at"]


class FundingOpportunityListSerializer(serializers.ModelSerializer):
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = FundingOpportunity
        fields = [
            "id", "title", "source", "country", "amount", "currency", "deadline",
            "funding_type", "sector", "completeness_score", "status", "is_expired", "created_at",
        ]


class OpportunityCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FundingOpportunity
        fields = [
            "title", "source", "description", "country", "amount", "currency",
            "deadline", "eligibility_criteria", "required_documents", "funding_type",
            "sector", "url", "metadata", "status",
        ]


class OpportunityUpdateSerializer(serializers.ModelSerializer):
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