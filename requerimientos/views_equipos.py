import json

from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from .models import Equipo, EstadoGeneral, Usuario, HistorialPrestamo

DB = 'requerimientos'

# IdEstado en t100_mm_estados, reservados para Préstamo de Equipos
ESTADO_DISPONIBLE    = 3
ESTADO_NO_DISPONIBLE = 4

@csrf_exempt
@require_GET
def api_equipos_lista(request):
    """
    Lista de equipos para el módulo Préstamo de Equipos, con el nombre del
    estado (desde la tabla compartida t100_mm_estados) y el nombre del
    responsable actual (si tiene) ya resueltos, listos para pintar en tabla.
    """
    equipos = list(Equipo.objects.using(DB).values(
        'IdEquipo', 'NombreEquipo', 'Descripcion', 'IdResponsable', 'IdEstado'
    ))

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

    data = []
    for e in equipos:
        data.append({
            'id_equipo':    e['IdEquipo'],
            'nombre':       e['NombreEquipo'],
            'descripcion':  e['Descripcion'] or '',
            'responsable':  responsables.get(e['IdResponsable'], '—') if e['IdResponsable'] else '—',
            'estado':       estados.get(e['IdEstado'], 'Desconocido'),
            'disponible':   e['IdEstado'] == ESTADO_DISPONIBLE,
        })

    return JsonResponse({'ok': True, 'equipos': data})

@csrf_exempt
@require_POST
def api_equipos_prestar(request):
    """
    Registra un préstamo en autoservicio: el usuario ya identificado en el
    portal pide un equipo disponible y queda asignado al instante, sin
    aprobación de por medio. Crea la fila en mv_HistorialPrestamos y pasa
    el equipo a 'No disponible' (IdEstado=4).
    """
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, TypeError):
        return JsonResponse({'ok': False, 'error': 'Datos inválidos.'}, status=400)

    id_equipo = body.get('id_equipo')
    cedula    = (body.get('cedula') or '').strip()
    nombre    = (body.get('nombre') or '').strip()
    area      = (body.get('area') or '').strip()
    fecha_est = body.get('fecha_estimada_devolucion') or None
    observ    = (body.get('observaciones') or '').strip()

    if not id_equipo or not cedula or not nombre:
        return JsonResponse({'ok': False, 'error': 'Faltan datos obligatorios.'}, status=400)

    equipo = Equipo.objects.using(DB).filter(IdEquipo=id_equipo).first()
    if not equipo:
        return JsonResponse({'ok': False, 'error': 'El equipo no existe.'}, status=404)
    if equipo.IdEstado != ESTADO_DISPONIBLE:
        return JsonResponse({'ok': False, 'error': 'Este equipo ya no está disponible.'}, status=400)

    usuario = Usuario.objects.using(DB).filter(Cedula=cedula).first()
    id_responsable = usuario.IdUsuario if usuario else None

    HistorialPrestamo.objects.using(DB).create(
        IdEquipo=equipo,
        Cedula=cedula,
        NombreSolicitante=nombre,
        Area=area,
        FechaEstimadaDevolucion=fecha_est,
        Observaciones=observ,
    )

    equipo.IdResponsable = id_responsable
    equipo.IdEstado = ESTADO_NO_DISPONIBLE
    equipo.save(using=DB)

    return JsonResponse({'ok': True})

@csrf_exempt
@require_POST
def api_equipos_devolver(request):
    """
    Registra la devolución del equipo: cierra el préstamo activo en
    mv_HistorialPrestamos (le pone FechaDevolucionReal) y pasa el equipo
    de vuelta a 'Disponible' (IdEstado=3).
    """
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, TypeError):
        return JsonResponse({'ok': False, 'error': 'Datos inválidos.'}, status=400)

    id_equipo = body.get('id_equipo')
    if not id_equipo:
        return JsonResponse({'ok': False, 'error': 'Falta el equipo.'}, status=400)

    equipo = Equipo.objects.using(DB).filter(IdEquipo=id_equipo).first()
    if not equipo:
        return JsonResponse({'ok': False, 'error': 'El equipo no existe.'}, status=404)

    prestamo = (
        HistorialPrestamo.objects.using(DB)
        .filter(IdEquipo=equipo, FechaDevolucionReal__isnull=True)
        .order_by('-FechaPrestamo')
        .first()
    )
    if prestamo:
        prestamo.FechaDevolucionReal = timezone.now()
        prestamo.save(using=DB)

    equipo.IdResponsable = None
    equipo.IdEstado = ESTADO_DISPONIBLE
    equipo.save(using=DB)

    return JsonResponse({'ok': True})