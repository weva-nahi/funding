"""Custom User model and Profile."""

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models

from common.mixins import TimestampMixin


class UserManager(BaseUserManager):
    """Custom user manager using email as the unique identifier."""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "admin")
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin, TimestampMixin):
    """Custom user model — email-based authentication."""

    ROLE_CHOICES = [
        ("admin", "Admin"),
        ("client", "Client"),
    ]

    email = models.EmailField(unique=True, db_index=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default="client")
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)
    last_login = models.DateTimeField(null=True, blank=True)

    # Account lockout
    failed_login_attempts = models.IntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "users"
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        return self.email

    @property
    def is_admin(self):
        return self.role == "admin"

    @property
    def is_client(self):
        return self.role == "client"


class Profile(TimestampMixin):
    """Extended user profile information."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    company = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
    sector = models.CharField(max_length=100, blank=True)

    # Notification preferences
    notify_application_status = models.BooleanField(default=True)
    notify_new_opportunities = models.BooleanField(default=True)
    notify_consulting_response = models.BooleanField(default=True)
    notify_deadline_reminder = models.BooleanField(default=True)
    notify_system_announcements = models.BooleanField(default=True)
    notify_email_enabled = models.BooleanField(default=True)

    class Meta:
        db_table = "profiles"

    def __str__(self):
        return f"{self.first_name} {self.last_name}".strip() or self.user.email

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()
