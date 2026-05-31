from django.urls import path

from . import views

app_name = "opportunities"

urlpatterns = [
    # Public
    path("", views.PublicOpportunityListView.as_view(), name="public-list"),
    path("<int:pk>/", views.OpportunityDetailView.as_view(), name="detail"),
    # Admin
    path("admin/", views.AdminOpportunityListView.as_view(), name="admin-list"),
    path("admin/<int:pk>/", views.AdminOpportunityDetailView.as_view(), name="admin-detail"),
    path("admin/<int:pk>/publish/", views.PublishOpportunityView.as_view(), name="publish"),
    path("admin/<int:pk>/archive/", views.ArchiveOpportunityView.as_view(), name="archive"),
]
