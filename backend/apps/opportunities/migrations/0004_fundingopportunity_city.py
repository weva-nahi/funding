from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("opportunities", "0003_savedopportunity"),
    ]

    operations = [
        migrations.AddField(
            model_name="fundingopportunity",
            name="city",
            field=models.CharField(blank=True, db_index=True, max_length=100),
        ),
    ]