from functools import wraps
from django.http import JsonResponse
from .models import OpcionMenuGrupo


def usuario_tiene_pantalla(user, screen_key):
    """True si el usuario puede ver esa pantalla (o es superuser)."""
    if user.is_superuser:
        return True
    return OpcionMenuGrupo.objects.filter(
        grupo__in=user.groups.all(),
        opcion__screen_key=screen_key,
    ).exists()


def usuario_es_solo_lectura(user, screen_key):
    """
    True si TODOS los grupos del usuario que dan acceso a esa pantalla
    están marcados como solo_lectura (si tiene al menos un grupo con
    acceso full, no es solo lectura). Si no tiene acceso, se considera
    bloqueado (se usa junto con usuario_tiene_pantalla, no en vez de).
    """
    if user.is_superuser:
        return False
    accesos = OpcionMenuGrupo.objects.filter(
        grupo__in=user.groups.all(),
        opcion__screen_key=screen_key,
    )
    if not accesos.exists():
        return True
    return not accesos.filter(solo_lectura=False).exists()


def requiere_pantalla(screen_key, bloquear_solo_lectura=False):
    """
    Decorador para vistas de API (JsonResponse).
    screen_key            -> el data-screen que protege este endpoint.
    bloquear_solo_lectura -> si True, rechaza también cuando el usuario
                             está en modo solo lectura (úsalo en crear/
                             editar/eliminar).
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not usuario_tiene_pantalla(request.user, screen_key):
                return JsonResponse(
                    {'ok': False, 'error': 'No tienes permiso para esta sección.'},
                    status=403,
                )
            if bloquear_solo_lectura and usuario_es_solo_lectura(request.user, screen_key):
                return JsonResponse(
                    {'ok': False, 'error': 'Tu acceso a esta sección es de solo lectura.'},
                    status=403,
                )
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator