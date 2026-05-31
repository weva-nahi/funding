from django.urls import path

from . import views

app_name = "applications"

urlpatterns = [
    # Client
    path("", views.ClientApplicationListView.as_view(), name="client-list"),
    path("<int:pk>/", views.ClientApplicationDetailView.as_view(), name="client-detail"),
    path("<int:pk>/submit/", views.SubmitApplicationView.as_view(), name="submit"),
    path("<int:pk>/withdraw/", views.WithdrawApplicationView.as_view(), name="withdraw"),
    # Admin
    path("admin/", views.AdminApplicationListView.as_view(), name="admin-list"),
    path("admin/<int:pk>/", views.AdminApplicationDetailView.as_view(), name="admin-detail"),
    path("admin/<int:pk>/review/", views.ReviewApplicationView.as_view(), name="review"),
    path("admin/bulk-review/", views.BulkReviewView.as_view(), name="bulk-review"),
]
