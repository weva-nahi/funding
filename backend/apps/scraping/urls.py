from django.urls import path

from . import views

app_name = "scraping"

urlpatterns = [
    path("start/", views.StartScrapingView.as_view(), name="start"),
    path("jobs/", views.ScrapingJobListView.as_view(), name="job-list"),
    path("jobs/<int:job_id>/cancel/", views.CancelScrapingView.as_view(), name="cancel"),
    path("alerts/", views.ScrapingAlertListView.as_view(), name="alert-list"),
    path("alerts/<int:alert_id>/action/", views.AlertActionView.as_view(), name="alert-action"),
    path("alerts/bulk-action/", views.BulkAlertActionView.as_view(), name="bulk-alert-action"),
]
