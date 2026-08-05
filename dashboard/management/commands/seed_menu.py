from django.core.management.base import BaseCommand
from dashboard.models import Modulo, OpcionMenu


PANTALLAS = [
    # (modulo, orden_modulo, nombre_pantalla, screen_key, orden_pantalla)
    ("General",       1, "Systraker (Dashboard)",       "dashboard",                1),

    ("Inventario",     2, "Inventario",                  "inventario",               1),

    ("Seguimiento",    3, "Centro de costo",              "centro-costo",             1),
    ("Seguimiento",    3, "Historial equipo",             "historial-equipo",         2),
    ("Seguimiento",    3, "Inactivos",                     "inactivos",                3),
    ("Seguimiento",    3, "Colaboradores",                 "colaboradores",            4),
    ("Seguimiento",    3, "Préstamo de Equipos",            "prestamo-equipos",         5),

    ("Requerimientos", 4, "Gestión de Usuarios",           "gestion-usuarios",         1),
    ("Requerimientos", 4, "Mis Requerimientos",             "mis-requerimientos",       2),
    ("Requerimientos", 4, "Asignar Requerimientos",         "asignar-requerimientos",   3),
    ("Requerimientos", 4, "Historial de Requerimientos",    "historial-requerimientos", 4),
    ("Requerimientos", 4, "Indicadores",                    "indicadores",              5),
]


class Command(BaseCommand):
    help = "Precarga los Modulo/OpcionMenu con las pantallas reales del sidebar"

    def handle(self, *args, **options):
        modulos_cache = {}
        creados = 0

        for nombre_modulo, orden_modulo, nombre_pantalla, screen_key, orden_pantalla in PANTALLAS:
            if nombre_modulo not in modulos_cache:
                modulo, _ = Modulo.objects.get_or_create(
                    nombre=nombre_modulo, defaults={'orden': orden_modulo}
                )
                modulos_cache[nombre_modulo] = modulo
            else:
                modulo = modulos_cache[nombre_modulo]

            _, created = OpcionMenu.objects.get_or_create(
                screen_key=screen_key,
                defaults={'nombre': nombre_pantalla, 'modulo': modulo, 'orden': orden_pantalla},
            )
            if created:
                creados += 1

        self.stdout.write(self.style.SUCCESS(
            f"Listo. {creados} pantallas nuevas creadas."
        ))
        self.stdout.write(
            "Ahora ve a /admin/auth/group/, crea tus grupos y asígnales pantallas."
        )