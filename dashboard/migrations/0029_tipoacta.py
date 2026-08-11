# Generated manually — separada de 0028 porque la tabla j233_tipo_acta
# ya existía físicamente en la base de datos (creada fuera de Django,
# misma estructura, con datos). Esta migración se aplica con --fake
# para sincronizar el historial de Django sin tocar la tabla ni sus datos.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0028_tipoacta_alter_caracteristicapc_g222_ram'),
    ]

    operations = [
        migrations.CreateModel(
            name='TipoActa',
            fields=[
                ('g233_id', models.AutoField(primary_key=True, serialize=False)),
                ('g233_tipo_acta', models.CharField(max_length=100)),
                ('g233_estado', models.BooleanField(default=True)),
            ],
            options={
                'verbose_name': 'Tipo de Acta',
                'verbose_name_plural': 'Tipos de Acta',
                'db_table': 'j233_tipo_acta',
            },
        ),
    ]
