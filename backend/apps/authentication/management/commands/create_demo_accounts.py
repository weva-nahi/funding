"""Management command to create demo accounts for development."""
from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = "Create demo admin and client accounts for development"

    def handle(self, *args, **options):
        from apps.authentication.models import User, Profile

        demo_accounts = [
            {
                "email": "admin@richat.mr",
                "password": "Admin1234!",
                "role": "admin",
                "is_staff": True,
                "is_superuser": True,
                "first_name": "Admin",
                "last_name": "Richat",
            },
            {
                "email": "client@richat.mr",
                "password": "Client1234!",
                "role": "client",
                "first_name": "Demo",
                "last_name": "Client",
                "company": "Demo Corp",
            },
        ]

        for account in demo_accounts:
            email = account["email"]
            if User.objects.filter(email=email).exists():
                self.stdout.write(f"  [skip] {email} already exists")
                continue

            with transaction.atomic():
                user = User.objects.create_user(
                    email=email,
                    password=account["password"],
                    role=account["role"],
                    is_staff=account.get("is_staff", False),
                    is_superuser=account.get("is_superuser", False),
                    is_email_verified=True,
                    is_active=True,
                )
                Profile.objects.get_or_create(
                    user=user,
                    defaults={
                        "first_name": account.get("first_name", ""),
                        "last_name": account.get("last_name", ""),
                        "company": account.get("company", ""),
                    },
                )
                self.stdout.write(
                    self.style.SUCCESS(f"  [created] {email} / {account['password']}")
                )

        self.stdout.write(self.style.SUCCESS("Demo accounts ready."))
