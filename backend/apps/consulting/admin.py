from django.contrib import admin

from .models import ConsultingRequest


@admin.register(ConsultingRequest)
class ConsultingRequestAdmin(admin.ModelAdmin):
    list_display = ["user", "priority", "status", "created_at"]
    list_filter = ["status", "priority"]
