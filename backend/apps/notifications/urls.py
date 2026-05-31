from django.urls import path

from . import views

app_name = "notifications"

urlpatterns = [
    path("", views.NotificationListView.as_view(), name="list"),
    path("unread-count/", views.UnreadCountView.as_view(), name="unread-count"),
    path("<int:pk>/read/", views.MarkReadView.as_view(), name="mark-read"),
    path("read-all/", views.MarkAllReadView.as_view(), name="mark-all-read"),
    path("<int:pk>/archive/", views.ArchiveView.as_view(), name="archive"),
]
