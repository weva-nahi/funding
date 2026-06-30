from rest_framework import serializers
from apps.opportunities.serializers import FundingOpportunityListSerializer
from .models import ScrapingAlert, ScrapingJob


class ScrapingJobSerializer(serializers.ModelSerializer):
    triggered_by_email = serializers.EmailField(
        source="triggered_by.email", read_only=True, default=None
    )

    class Meta:
        model = ScrapingJob
        fields = [
            "id",
            "source",
            "pages_scraped",
            "projects_found",
            "status",
            "started_at",
            "finished_at",
            "error_log",
            "triggered_by_email",
            "created_at",
        ]


class ScrapingAlertSerializer(serializers.ModelSerializer):
    opportunity = FundingOpportunityListSerializer(read_only=True)

    class Meta:
        model = ScrapingAlert
        fields = ["id", "opportunity", "priority", "status", "created_at"]


class StartScrapingSerializer(serializers.Serializer):
    source = serializers.ChoiceField(
        choices=["gef", "gcf", "oecd", "world_bank"]
    )


class StartAllScrapingSerializer(serializers.Serializer):
    pass