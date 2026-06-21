from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("applications", "0004_partial_unique_active_application"),
    ]

    operations = [
        migrations.AlterField(
            model_name="application",
            name="status",
            field=models.CharField(
                choices=[
                    ("draft", "Draft"),
                    ("pending", "Pending"),
                    ("in_review", "In Review"),
                    ("shortlisted", "Shortlisted"),
                    ("approved", "Approved"),
                    ("rejected", "Rejected"),
                    ("withdrawn", "Withdrawn"),
                ],
                default="draft",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="applicationstatushistory",
            name="to_status",
            field=models.CharField(max_length=20),
        ),
    ]