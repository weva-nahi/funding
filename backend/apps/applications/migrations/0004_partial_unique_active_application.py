from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("applications", "0003_application_status_index"),
    ]

    operations = [
        # Drop the old blanket unique_together that blocked re-application
        # after withdrawal.
        migrations.AlterUniqueTogether(
            name="application",
            unique_together=set(),
        ),
        # Replace it with a partial unique constraint: only ONE non-withdrawn
        # application may exist per (user, opportunity). Withdrawn rows are
        # exempt, so a user can withdraw and apply again.
        migrations.AddConstraint(
            model_name="application",
            constraint=models.UniqueConstraint(
                fields=["user", "opportunity"],
                condition=~models.Q(status="withdrawn"),
                name="uniq_active_application_per_user_opportunity",
            ),
        ),
    ]