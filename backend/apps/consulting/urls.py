from django.urls import path

from . import views

app_name = "consulting"
urlpatterns = [
    path("", views.ClientConsultingListView.as_view(), name="client-list"),
    path("<int:pk>/", views.ClientConsultingDetailView.as_view(), name="client-detail"),
    path("<int:pk>/messages/", views.ConsultingMessageView.as_view(), name="messages"),
    path("admin/", views.AdminConsultingListView.as_view(), name="admin-list"),
    path("admin/<int:pk>/", views.AdminConsultingDetailView.as_view(), name="admin-detail"),
    path("admin/<int:pk>/messages/", views.ConsultingMessageView.as_view(), name="admin-messages"),
]