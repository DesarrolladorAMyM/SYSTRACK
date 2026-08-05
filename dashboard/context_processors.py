import json
from .models import OpcionMenuGrupo, OpcionMenu


def permisos_menu(request):
    """
    Devuelve al contexto de cualquier template:
      screens_permitidas        -> set de screen_key visibles
      screens_solo_lectura      -> set de screen_key en modo solo lectura
      screens_permitidas_json   -> lo mismo, como string JSON
      screens_solo_lectura_json -> idem
    Superusuario ve TODO automáticamente (no necesita grupos).
    """
    if not request.user.is_authenticated:
        return {}

    if request.user.is_superuser:
        todas = set(OpcionMenu.objects.values_list('screen_key', flat=True))
        return {
            'screens_permitidas': todas,
            'screens_solo_lectura': set(),
            'screens_permitidas_json': json.dumps(sorted(todas)),
            'screens_solo_lectura_json': '[]',
        }

    accesos = (OpcionMenuGrupo.objects
               .filter(grupo__in=request.user.groups.all())
               .select_related('opcion'))

    permitidas = set()
    solo_lectura = set()

    # si el usuario está en varios grupos con la misma pantalla,
    # gana el acceso más permisivo (full > solo lectura)
    resumen = {}
    for acceso in accesos:
        key = acceso.opcion.screen_key
        if key not in resumen:
            resumen[key] = acceso.solo_lectura
        else:
            resumen[key] = resumen[key] and acceso.solo_lectura

    for key, es_ro in resumen.items():
        permitidas.add(key)
        if es_ro:
            solo_lectura.add(key)

    return {
        'screens_permitidas': permitidas,
        'screens_solo_lectura': solo_lectura,
        'screens_permitidas_json': json.dumps(sorted(permitidas)),
        'screens_solo_lectura_json': json.dumps(sorted(solo_lectura)),
    }