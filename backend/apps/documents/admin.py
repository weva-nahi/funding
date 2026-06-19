from django.contrib import admin

from .models import ApplicationDocument


@admin.register(ApplicationDocument)
class ApplicationDocumentAdmin(admin.ModelAdmin):
    list_display = [
        "application",
        "original_filename",
        "file_type",
        "file_size",
        "validation_status",
        "created_at",
    ]
    list_filter = ["validation_status", "file_type"]
    search_fields = ["application__user__email", "original_filename"]
    readonly_fields = [f.name for f in ApplicationDocument._meta.fields]

    def has_delete_permission(self, request, obj=None):
        # Documents can be deleted through the application flow only.
        return False