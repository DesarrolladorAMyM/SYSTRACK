# Migración manual: agrega FK de CentroCosto a Dispositivo

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0015_centrocosto_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='dispositivo',
            name='g212_centro_costo',
            field=models.ForeignKey(
                blank=True,
                db_column='g212_centro_costo_id',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to='dashboard.centrocosto',
            ),
        ),
    ]
