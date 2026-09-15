import json

from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from .models import (
    Equipo, EstadoGeneral, Usuario, HistorialPrestamo,
    AccesorioEquipo, PrestamoAccesorio,
)

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

    ?cedula=X (opcional): si se manda, cada equipo trae 'es_mio' — indica
    si el equipo está prestado justo a esa cédula, para que el frontend
    solo muestre "Devolver" a quien realmente lo tiene (y no a cualquier
    usuario que entre y vea la lista).
    """
    cedula = (request.GET.get('cedula') or '').strip()

    equipos = list(Equipo.objects.using(DB).values(
        'IdEquipo', 'NombreEquipo', 'Descripcion', 'IdResponsable', 'IdEstado'
    ))

    estados = {
        e['IdEstado']: e['Descripcion']
        for e in EstadoGeneral.objects.using(DB).values('IdEstado', 'Descripcion')
    }

    ids_responsables = {e['IdResponsable'] for e in equipos if e['IdResponsable']}
    responsables_qs = Usuario.objects.using(DB).filter(IdUsuario__in=ids_responsables) \
        .values('IdUsuario', 'NombreCompleto')
    responsables = {u['IdUsuario']: u['NombreCompleto'] for u in responsables_qs}

    # Cédula de quien tiene cada equipo, tomada del préstamo activo (el que
    # todavía no tiene FechaDevolucionReal). De aquí sale 'es_mio', NO de
    # Equipo.IdResponsable -> Usuario.Cedula, por dos razones:
    #
    #   1. mv_Usuarios.Cedula está declarada CharField pero la columna es
    #      numérica, así que Django la devuelve como int. Comparada con la
    #      cédula del querystring (str) la igualdad nunca se cumplía y el
    #      botón "Devolver" no le aparecía a nadie, ni al dueño del préstamo.
    #   2. Es la misma regla que valida api_equipos_devolver, así que el botón
    #      se le muestra exactamente a quien se le va a aceptar la devolución.
    #      Con IdResponsable no era así: si el solicitante no existe en
    #      mv_Usuarios queda en NULL y el préstamo se volvía indevolvible.
    #
    # Orden ascendente a propósito: si un equipo tuviera más de un préstamo
    # abierto, gana el más reciente al sobrescribirse en el dict — el mismo
    # que elige api_equipos_devolver con order_by('-FechaPrestamo').first().
    prestamos_activos = {
        p['IdEquipo']: str(p['Cedula'] or '').strip()
        for p in (HistorialPrestamo.objects.using(DB)
                  .filter(FechaDevolucionReal__isnull=True)
                  .order_by('FechaPrestamo')
                  .values('IdEquipo', 'Cedula'))
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
            'es_mio':       bool(cedula) and prestamos_activos.get(e['IdEquipo']) == cedula,
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

    prestamo = HistorialPrestamo.objects.using(DB).create(
        IdEquipo=equipo,
        Cedula=cedula,
        NombreSolicitante=nombre,
        Area=area,
        FechaEstimadaDevolucion=fecha_est,
        Observaciones=observ,
    )

    # Se copia el catalogo de accesorios del equipo como "entregado". Es un
    # VALOR POR DEFECTO, no una verificacion: aqui nadie de TIC esta presente,
    # asi que lo que se registra es lo que normalmente va con el equipo. TIC
    # lo corrige desde "Ver detalles" si algo no salio.
    #
    # Se copia el NOMBRE ademas del id: si manana se quita el accesorio del
    # catalogo, este prestamo sigue diciendo que se llevo un cable HDMI.
    for acc in AccesorioEquipo.objects.using(DB).filter(IdEquipo=equipo.IdEquipo, Activo=True):
        PrestamoAccesorio.objects.using(DB).create(
            IdPrestamo=prestamo.IdPrestamo,
            IdAccesorio=acc.IdAccesorio,
            NombreAccesorio=acc.Nombre,
            Entregado=True,
            Devuelto=False,
        )

    equipo.IdResponsable = id_responsable
    equipo.IdEstado = ESTADO_NO_DISPONIBLE
    equipo.save(using=DB)

    return JsonResponse({'ok': True})

@csrf_exempt
@require_POST
def api_equipos_devolver(request):
    """CERRADO: la devolucion ya no se hace desde el portal.

    Antes el propio solicitante pulsaba "Devolver" y el sistema liberaba el
    equipo al instante. El problema es que eso solo registra una intencion:
    nadie verificaba que el equipo de verdad hubiera vuelto a TIC, asi que se
    podia marcar como devuelto desde el escritorio y quedarse con el, y el
    equipo aparecia libre para que otra persona lo pidiera.

    Ahora la registra TIC al recibir el equipo fisicamente
    (dashboard -> api_equipo_admin_devolver).

    La ruta se conserva a proposito y responde 403 con una explicacion: si
    alguien tiene el portal abierto de antes y pulsa el boton viejo, debe
    entender que pasa en vez de ver un error 404 sin sentido. Tampoco basta
    con esconder el boton — sin este candado el endpoint seguiria abierto a
    cualquiera que conociera una cedula y un id de equipo.
    """
    return JsonResponse({
        'ok': False,
        'error': 'La devolucion se registra en TIC al entregar el equipo. '
                 'Acercate con el equipo y alli la registran en el sistema.',
    }, status=403)
