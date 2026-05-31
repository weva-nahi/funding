from django.contrib import admin

from .models import Profile, User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ["email", "role", "is_active", "is_email_verified", "created_at"]
    list_filter = ["role", "is_active", "is_email_verified"]
    search_fields = ["email"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "first_name", "last_name", "company", "sector"]
    search_fields = ["first_name", "last_name", "company"]
