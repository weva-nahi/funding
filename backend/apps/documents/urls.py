from django.urls import path

from . import views

app_name = "documents"

urlpatterns = [
    path("upload/", views.DocumentUploadView.as_view(), name="upload"),
    path("application/<int:application_id>/", views.DocumentListView.as_view(), name="list"),
    path("<int:pk>/delete/", views.DocumentDeleteView.as_view(), name="delete"),
    path("<int:pk>/download/", views.DocumentDownloadView.as_view(), name="download"),
]
