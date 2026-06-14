from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("applications", "0002_initial"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="application",
            index=models.Index(fields=["status", "-created_at"], name="app_status_created_idx"),
        ),
    ]