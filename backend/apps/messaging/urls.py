"""Messaging URL patterns."""

from django.urls import path

from . import views

app_name = "messaging"

urlpatterns = [
    path("thread/", views.ClientMergedThreadView.as_view(), name="client-thread"),
    path("unread-count/", views.UnreadMessageCountView.as_view(), name="unread-count"),
    path("admin/contacts/", views.AdminContactListView.as_view(), name="admin-contacts"),
    path("admin/contacts/<int:user_id>/thread/", views.AdminClientThreadView.as_view(), name="admin-client-thread"),
]
