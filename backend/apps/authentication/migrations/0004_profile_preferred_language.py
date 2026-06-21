from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("authentication", "0003_email_verification_tokens"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="preferred_language",
            field=models.CharField(
                choices=[("fr", "Français"), ("en", "English"), ("ar", "العربية")],
                default="fr",
                max_length=2,
            ),
        ),
    ]