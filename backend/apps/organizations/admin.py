from django.contrib import admin

from .models import Organization


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ["name", "user", "industry", "size", "location"]
    search_fields = ["name", "registration_number"]
