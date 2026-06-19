from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("authentication", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="notify_frequency",
            field=models.CharField(
                choices=[("immediate", "Immediate"), ("daily", "Daily Digest")],
                default="immediate",
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name="profile",
            name="pending_digest",
            field=models.JSONField(blank=True, default=list),
        ),
    ]