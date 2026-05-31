from django.urls import path

from . import views

app_name = "analytics"
urlpatterns = [
    path("dashboard/", views.DashboardStatsView.as_view(), name="dashboard"),
    path("activity/", views.ActivityChartView.as_view(), name="activity"),
    path("status-distribution/", views.StatusDistributionView.as_view(), name="status-distribution"),
    path("approval-rate/", views.ApprovalRateView.as_view(), name="approval-rate"),
    path("top-sources/", views.TopSourcesView.as_view(), name="top-sources"),
    path("client-activity/", views.ClientActivityView.as_view(), name="client-activity"),
    path("processing-time/", views.AvgProcessingTimeView.as_view(), name="processing-time"),
    path("export/", views.ExportCSVView.as_view(), name="export-csv"),
]
