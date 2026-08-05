"""
views_prestamo_equipos.py — SYSTRAKER (dashboard)
Administración del responsable/estado de los equipos de "Préstamo de Equipos"
(tabla mv_Equipos, de la app requerimientos). No toca nada de Dispositivo /
Colaborador / AsignacionColaborador — es un módulo aparte, a propósito.
"""
import json

from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST
from django.views.decorators.csrf import csrf_exempt

from requerimientos.models import Equipo, EstadoGeneral, Usuario

DB = 'requerimientos'


@require_GET
def api_equipos_admin_lista(request):
    """Lista completa de equipos con el nombre del responsable y del estado
    ya resueltos, para pintar la tabla de administración."""
    equipos = list(Equipo.objects.using(DB).values(
        'IdEquipo', 'NombreEquipo', 'Descripcion', 'IdResponsable', 'IdEstado'
    ).order_by('NombreEquipo'))

    estados = {
        e['IdEstado']: e['Descripcion']
        for e in EstadoGeneral.objects.using(DB).values('IdEstado', 'Descripcion')
    }
    ids_responsables = {e['IdResponsable'] for e in equipos if e['IdResponsable']}
    responsables = {
        u['IdUsuario']: u['NombreCompleto']
        for u in Usuario.objects.using(DB).filter(IdUsuario__in=ids_responsables)
                                 .values('IdUsuario', 'NombreCompleto')
    }

    data = [{
        'id_equipo':      e['IdEquipo'],
        'nombre':         e['NombreEquipo'],
        'descripcion':    e['Descripcion'] or '',
        'id_responsable': e['IdResponsable'],
        'responsable':    responsables.get(e['IdResponsable'], '—') if e['IdResponsable'] else '—',
        'id_estado':      e['IdEstado'],
        'estado':         estados.get(e['IdEstado'], 'Desconocido'),
    } for e in equipos]

    return JsonResponse({'ok': True, 'equipos': data})


@require_GET
def api_equipos_admin_catalogos(request):
    """Catálogos para el modal de administración: estados disponibles
    (tabla compartida mm_estados) y usuarios activos (para elegir responsable)."""
    estados_qs = EstadoGeneral.objects.using(DB).values('IdEstado', 'Descripcion')
    estados = [
        {'IdEstado': e['IdEstado'], 'Descripcion': e['Descripcion']}
        for e in estados_qs
    ]
    usuarios = list(
        Usuario.objects.using(DB).filter(Estado=1)
        .values('IdUsuario', 'NombreCompleto', 'Cedula')
        .order_by('NombreCompleto')
    )
    return JsonResponse({'ok': True, 'estados': estados, 'usuarios': usuarios})


@csrf_exempt
@require_POST
def api_equipo_admin_guardar(request):
    """Crea un equipo nuevo, o edita uno existente si viene id_equipo.
    Aquí es donde el admin asigna/cambia el responsable y el estado."""
    try:
        data = json.loads(request.body)
    except Exception:
        return JsonResponse({'ok': False, 'error': 'Solicitud inválida.'}, status=400)

    id_equipo      = data.get('id_equipo') or None
    nombre         = str(data.get('nombre', '')).strip()
    descripcion    = str(data.get('descripcion', '')).strip()
    id_responsable = data.get('id_responsable') or None
    id_estado      = data.get('id_estado') or None

    if not nombre:
        return JsonResponse({'ok': False, 'error': 'El nombre del equipo es obligatorio.'}, status=400)
    if not id_estado:
        return JsonResponse({'ok': False, 'error': 'Debes seleccionar un estado.'}, status=400)
    if not EstadoGeneral.objects.using(DB).filter(IdEstado=id_estado).exists():
        return JsonResponse({'ok': False, 'error': 'El estado seleccionado no es válido.'}, status=400)
    if id_responsable and not Usuario.objects.using(DB).filter(IdUsuario=id_responsable).exists():
        return JsonResponse({'ok': False, 'error': 'El responsable seleccionado no es válido.'}, status=400)

    if id_equipo:
        try:
            equipo = Equipo.objects.using(DB).get(IdEquipo=id_equipo)
        except Equipo.DoesNotExist:
            return JsonResponse({'ok': False, 'error': 'El equipo no existe.'}, status=404)
    else:
        equipo = Equipo()

    equipo.NombreEquipo  = nombre
    equipo.Descripcion   = descripcion or None
    equipo.IdResponsable = id_responsable
    equipo.IdEstado      = id_estado
    equipo.save(using=DB)

    return JsonResponse({'ok': True, 'id_equipo': equipo.IdEquipo})


@csrf_exempt
@require_POST
def api_equipo_admin_eliminar(request, pk):
    try:
        equipo = Equipo.objects.using(DB).get(IdEquipo=pk)
    except Equipo.DoesNotExist:
        return JsonResponse({'ok': False, 'error': 'El equipo no existe.'}, status=404)
    equipo.delete(using=DB)
    return JsonResponse({'ok': True})