from django.contrib import admin

from .models import Application, ApplicationStatusHistory


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ["user", "opportunity", "status", "version", "created_at"]
    list_filter = ["status"]
    search_fields = ["user__email", "opportunity__title"]


@admin.register(ApplicationStatusHistory)
class ApplicationStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ["application", "from_status", "to_status", "changed_by", "created_at"]
