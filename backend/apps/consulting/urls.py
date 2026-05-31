from django.urls import path

from . import views

app_name = "consulting"
urlpatterns = [
    path("", views.ClientConsultingListView.as_view(), name="client-list"),
    path("<int:pk>/", views.ClientConsultingDetailView.as_view(), name="client-detail"),
    path("admin/", views.AdminConsultingListView.as_view(), name="admin-list"),
    path("admin/<int:pk>/respond/", views.AdminConsultingRespondView.as_view(), name="admin-respond"),
]
