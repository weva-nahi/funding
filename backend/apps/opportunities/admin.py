from django.contrib import admin

from .models import FundingOpportunity, SavedOpportunity


@admin.register(FundingOpportunity)
class FundingOpportunityAdmin(admin.ModelAdmin):
    list_display = ["title", "source", "country", "city", "amount", "deadline", "status", "completeness_score"]
    list_filter = ["source", "status", "funding_type", "city"]
    search_fields = ["title", "description", "city"]


@admin.register(SavedOpportunity)
class SavedOpportunityAdmin(admin.ModelAdmin):
    list_display = ["user", "opportunity", "created_at"]
    search_fields = ["user__email", "opportunity__title"]