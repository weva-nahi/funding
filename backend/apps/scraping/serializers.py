from rest_framework import serializers

from apps.opportunities.serializers import FundingOpportunityListSerializer

from .models import ScrapingAlert, ScrapingJob


class ScrapingJobSerializer(serializers.ModelSerializer):
    triggered_by_email = serializers.EmailField(source="triggered_by.email", read_only=True, default=None)

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
    source = serializers.ChoiceField(choices=["gef", "gcf", "oecd", "climate_fund", "world_bank", "afd", "eu"])
    # max_pages removed — scrapers now always run to completion (see
    # apps.scraping.scrapers.base.BaseScraper.safety_max_pages for the
    # runaway-loop safety net, which is not a tunable product setting).


class StartAllScrapingSerializer(serializers.Serializer):
    """Empty body serializer for the 'scrape all sources' endpoint — kept
    as a real serializer (rather than skipping validation) so drf-spectacular
    documents the endpoint correctly and so it's trivial to add fields
    (e.g. an exclude-sources list) later without changing the view."""
    pass