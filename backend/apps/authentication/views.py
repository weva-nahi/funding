"""Authentication views — thin controllers calling services/selectors."""

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from common.pagination import StandardPagination
from common.permissions import IsAdmin

from . import selectors, services
from .serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    ProfileSerializer,
    RegisterSerializer,
    ResendVerificationSerializer,
    TokenSerializer,
    UnsubscribeSerializer,
    UserSerializer,
)


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "signup"

    @extend_schema(request=RegisterSerializer, responses={201: UserSerializer}, tags=["Authentication"])
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.register_user(**serializer.validated_data)
        return Response(
            {"success": True, "message": "Registration successful. Please verify your email."},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    @extend_schema(request=LoginSerializer, responses={200: TokenSerializer}, tags=["Authentication"])
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = services.login_user(
            email=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
        )
        response = Response(
            {
                "success": True,
                "access": result["access"],
                "user": UserSerializer(result["user"]).data,
            },
            status=status.HTTP_200_OK,
        )
        response.set_cookie(
            key="refresh_token",
            value=result["refresh"],
            httponly=True,
            secure=request.is_secure(),
            samesite="Strict",
            max_age=7 * 24 * 60 * 60,
            path="/api/v1/auth/token/refresh/",
        )
        return response


class RefreshTokenView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(responses={200: TokenSerializer}, tags=["Authentication"])
    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token")
        if not refresh_token:
            return Response(
                {"success": False, "error": "No refresh token provided."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        from rest_framework_simplejwt.exceptions import TokenError
        from rest_framework_simplejwt.tokens import RefreshToken
        from .models import User

        try:
            old_refresh = RefreshToken(refresh_token)
            user_id = old_refresh.get("user_id")
            user = User.objects.get(id=user_id, is_active=True)

            try:
                old_refresh.blacklist()
            except AttributeError:
                pass

            new_refresh = RefreshToken.for_user(user)
            new_refresh["role"] = user.role
            new_refresh["email"] = user.email
            access = str(new_refresh.access_token)

            response = Response(
                {"success": True, "access": access},
                status=status.HTTP_200_OK,
            )
            response.set_cookie(
                key="refresh_token",
                value=str(new_refresh),
                httponly=True,
                secure=request.is_secure(),
                samesite="Strict",
                max_age=7 * 24 * 60 * 60,
                path="/api/v1/auth/token/refresh/",
            )
            return response

        except (TokenError, User.DoesNotExist):
            return Response(
                {"success": False, "error": "Invalid or expired refresh token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )


class LogoutView(APIView):
    @extend_schema(tags=["Authentication"])
    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token")
        if refresh_token:
            from rest_framework_simplejwt.tokens import RefreshToken
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass
        response = Response(
            {"success": True, "message": "Logged out successfully."},
            status=status.HTTP_200_OK,
        )
        response.delete_cookie("refresh_token", path="/api/v1/auth/token/refresh/")
        return response


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(tags=["Authentication"])
    def get(self, request, token):
        services.verify_email(token=token)
        return Response(
            {"success": True, "message": "Email verified successfully."},
            status=status.HTTP_200_OK,
        )


class ResendVerificationEmailView(APIView):
    """Re-send the verification email for an unverified account."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "signup"

    @extend_schema(request=ResendVerificationSerializer, tags=["Authentication"])
    def post(self, request):
        serializer = ResendVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.resend_verification_email(email=serializer.validated_data["email"])
        return Response(
            {
                "success": True,
                "message": "If an unverified account exists for this email, a new verification link has been sent.",
            },
            status=status.HTTP_200_OK,
        )


class UnsubscribeView(APIView):
    """GDPR-compliant one-click unsubscribe — no login required.

    Accepts the token via POST body (frontend page reads the :token route
    param and posts it here) rather than GET-with-side-effects, since GET
    requests can be pre-fetched by email-client link scanners/proxies and
    silently trigger the unsubscribe before the user even opens the email —
    a known issue with GET-based unsubscribe links.
    """

    permission_classes = [AllowAny]

    @extend_schema(request=UnsubscribeSerializer, tags=["Authentication"])
    def post(self, request):
        serializer = UnsubscribeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        success = services.unsubscribe_user(token=serializer.validated_data["token"])
        if not success:
            return Response(
                {"success": False, "message": "This unsubscribe link is invalid or has expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {"success": True, "message": "You have been unsubscribed from emails."},
            status=status.HTTP_200_OK,
        )


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(request=PasswordResetRequestSerializer, tags=["Authentication"])
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.request_password_reset(email=serializer.validated_data["email"])
        return Response(
            {"success": True, "message": "If the email exists, a reset link has been sent."},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(request=PasswordResetConfirmSerializer, tags=["Authentication"])
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.reset_password(
            token=serializer.validated_data["token"],
            new_password=serializer.validated_data["new_password"],
        )
        return Response(
            {"success": True, "message": "Password reset successful."},
            status=status.HTTP_200_OK,
        )


class ChangePasswordView(APIView):
    @extend_schema(request=ChangePasswordSerializer, tags=["Authentication"])
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.change_password(
            user=request.user,
            old_password=serializer.validated_data["old_password"],
            new_password=serializer.validated_data["new_password"],
        )
        return Response(
            {"success": True, "message": "Password changed successfully."},
            status=status.HTTP_200_OK,
        )


class ProfileView(APIView):
    @extend_schema(responses={200: ProfileSerializer}, tags=["Authentication"])
    def get(self, request):
        profile = selectors.get_user_profile(user=request.user)
        return Response(ProfileSerializer(profile).data)

    @extend_schema(request=ProfileSerializer, responses={200: ProfileSerializer}, tags=["Authentication"])
    def patch(self, request):
        serializer = ProfileSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        validated = dict(serializer.validated_data)

        avatar = request.FILES.get("avatar")
        if avatar is not None:
            from common.validators import validate_file_size, validate_file_type

            validate_file_size(avatar)
            validate_file_type(avatar)  # also runs validate_image_dimensions internally

        profile = services.update_profile(user=request.user, **validated)
        if avatar is not None:
            profile.avatar = avatar
            profile.save(update_fields=["avatar"])

        return Response(ProfileSerializer(profile).data)


class UserListView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(responses={200: UserSerializer(many=True)}, tags=["Authentication"])
    def get(self, request):
        search = request.query_params.get("search")
        users = selectors.get_active_users(search=search)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(users, request)
        return paginator.get_paginated_response(UserSerializer(page, many=True).data)


class UserDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    @extend_schema(responses={200: UserSerializer}, tags=["Authentication"])
    def get(self, request, user_id):
        user = selectors.get_user_by_id(user_id=user_id)
        return Response(UserSerializer(user).data)

    @extend_schema(tags=["Authentication"])
    def patch(self, request, user_id):
        """Admin can toggle is_active status."""
        user = selectors.get_user_by_id(user_id=user_id)
        if "is_active" in request.data:
            user.is_active = request.data["is_active"]
            user.save(update_fields=["is_active"])
        return Response(UserSerializer(user).data)

    @extend_schema(tags=["Authentication"])
    def delete(self, request, user_id):
        """Admin can delete a user account."""
        user = selectors.get_user_by_id(user_id=user_id)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    """Return the current authenticated user."""

    @extend_schema(responses={200: UserSerializer}, tags=["Authentication"])
    def get(self, request):
        return Response(UserSerializer(request.user).data)