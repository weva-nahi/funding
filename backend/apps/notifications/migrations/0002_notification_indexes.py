from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("notifications", "0001_initial"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="notification",
            index=models.Index(
                fields=["user", "is_read", "is_archived"],
                name="notif_user_read_arch_idx",
            ),
        ),
    ]