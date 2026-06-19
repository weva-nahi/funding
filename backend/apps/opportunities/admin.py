from django.contrib import admin

from .models import FundingOpportunity, SavedOpportunity


@admin.register(FundingOpportunity)
class FundingOpportunityAdmin(admin.ModelAdmin):
    list_display = ["title", "source", "amount", "deadline", "status", "completeness_score"]
    list_filter = ["source", "status", "funding_type"]
    search_fields = ["title", "description"]


@admin.register(SavedOpportunity)
class SavedOpportunityAdmin(admin.ModelAdmin):
    list_display = ["user", "opportunity", "created_at"]
    search_fields = ["user__email", "opportunity__title"]