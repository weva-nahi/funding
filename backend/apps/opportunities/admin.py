from django.contrib import admin

from .models import FundingOpportunity


@admin.register(FundingOpportunity)
class FundingOpportunityAdmin(admin.ModelAdmin):
    list_display = ["title", "source", "amount", "deadline", "status", "completeness_score"]
    list_filter = ["source", "status", "funding_type"]
    search_fields = ["title", "description"]
