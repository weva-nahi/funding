"""Authentication URL patterns."""

from django.urls import path

from . import views

app_name = "authentication"

urlpatterns = [
    # Public
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("token/refresh/", views.RefreshTokenView.as_view(), name="token-refresh"),
    path("verify-email/<str:token>/", views.VerifyEmailView.as_view(), name="verify-email"),
    path("resend-verification/", views.ResendVerificationEmailView.as_view(), name="resend-verification"),
    path("unsubscribe/", views.UnsubscribeView.as_view(), name="unsubscribe"),
    path("password-reset/", views.PasswordResetRequestView.as_view(), name="password-reset"),
    path("password-reset/confirm/", views.PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    # Authenticated
    path("me/", views.MeView.as_view(), name="me"),
    path("change-password/", views.ChangePasswordView.as_view(), name="change-password"),
    path("profile/", views.ProfileView.as_view(), name="profile"),
    # Admin
    path("users/", views.UserListView.as_view(), name="user-list"),
    path("users/<int:user_id>/", views.UserDetailView.as_view(), name="user-detail"),
]