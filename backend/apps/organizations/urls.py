from django.urls import path

from . import views

app_name = "organizations"

urlpatterns = [
    path("", views.OrganizationView.as_view(), name="organization"),
]
