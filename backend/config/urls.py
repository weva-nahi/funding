"""URL configuration for Richat Funding Tracker."""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from common.views import HealthCheckView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/health/", HealthCheckView.as_view(), name="health"),
    path("api/v1/auth/", include("apps.authentication.urls")),
    path("api/v1/organizations/", include("apps.organizations.urls")),
    path("api/v1/opportunities/", include("apps.opportunities.urls")),
    path("api/v1/applications/", include("apps.applications.urls")),
    path("api/v1/documents/", include("apps.documents.urls")),
    path("api/v1/notifications/", include("apps.notifications.urls")),
    path("api/v1/scraping/", include("apps.scraping.urls")),
    path("api/v1/consulting/", include("apps.consulting.urls")),
    path("api/v1/messaging/", include("apps.messaging.urls")),
    path("api/v1/analytics/", include("apps.analytics.urls")),
    path("api/v1/audit/", include("apps.audit.urls")),
    path("api/v1/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/v1/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(
        "api/v1/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    try:
        import debug_toolbar
        urlpatterns = [
            path("__debug__/", include(debug_toolbar.urls))
        ] + urlpatterns
    except ImportError:
        pass