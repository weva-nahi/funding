from django.urls import path

from . import views

app_name = "opportunities"

urlpatterns = [
    # Public
    path("", views.PublicOpportunityListView.as_view(), name="public-list"),
    # Saved (authenticated) — declared BEFORE <int:pk> so "saved" isn't
    # swallowed by the numeric detail route.
    path("saved/", views.SavedOpportunityListView.as_view(), name="saved-list"),
    path("<int:pk>/save/", views.SaveOpportunityView.as_view(), name="save"),
    path("<int:pk>/", views.OpportunityDetailView.as_view(), name="detail"),
    # Admin
    path("admin/", views.AdminOpportunityListView.as_view(), name="admin-list"),
    path("admin/import/", views.ExcelImportView.as_view(), name="admin-import"),
    path("admin/bulk-publish/", views.BulkPublishView.as_view(), name="admin-bulk-publish"),
    path("admin/<int:pk>/", views.AdminOpportunityDetailView.as_view(), name="admin-detail"),
    path("admin/<int:pk>/publish/", views.PublishOpportunityView.as_view(), name="publish"),
    path("admin/<int:pk>/archive/", views.ArchiveOpportunityView.as_view(), name="archive"),
]