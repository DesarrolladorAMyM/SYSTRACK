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
from django.contrib.auth.decorators import login_required
from django.utils import timezone

from requerimientos.models import (
    Equipo, EstadoGeneral, Usuario, HistorialPrestamo,
    AccesorioEquipo, PrestamoAccesorio,
)
from .permisos import requiere_pantalla
# El servidor guarda en UTC (TIME_ZONE='UTC'), asi que las horas hay que
# convertirlas antes de mostrarlas o salen 5 horas adelantadas.
from .views import _fecha_local_str

DB = 'requerimientos'

# IdEstado en t100_mm_estados, iguales a los de requerimientos/views_equipos.py
ESTADO_DISPONIBLE    = 3
ESTADO_NO_DISPONIBLE = 4


@login_required(login_url='login')
@require_GET
@requiere_pantalla('prestamo-equipos')
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

    # Prestamo abierto de cada equipo (sin FechaDevolucionReal). De aqui sale
    # el boton "Devolucion": se muestra segun el PRESTAMO, no segun el estado
    # del equipo. La diferencia importa — hoy hay equipos marcados DISPONIBLE
    # con un prestamo todavia abierto (a alguien le cambiaron el estado a mano
    # en vez de cerrar el prestamo, que era el unico atajo que existia), y si
    # nos guiaramos por el estado esos prestamos no se podrian cerrar nunca.
    prestamos = {}
    for p in (HistorialPrestamo.objects.using(DB)
              .filter(FechaDevolucionReal__isnull=True)
              .order_by('FechaPrestamo')):
        prestamos[p.IdEquipo_id] = p

    data = []
    for e in equipos:
        p = prestamos.get(e['IdEquipo'])
        data.append({
            'id_equipo':      e['IdEquipo'],
            'nombre':         e['NombreEquipo'],
            'descripcion':    e['Descripcion'] or '',
            'id_responsable': e['IdResponsable'],
            'responsable':    responsables.get(e['IdResponsable'], '—') if e['IdResponsable'] else '—',
            'id_estado':      e['IdEstado'],
            'estado':         estados.get(e['IdEstado'], 'Desconocido'),
            'disponible':     e['IdEstado'] == ESTADO_DISPONIBLE,
            'prestamo_activo': None if not p else {
                'id':          p.IdPrestamo,
                'cedula':      p.Cedula,
                'solicitante': p.NombreSolicitante,
                'area':        p.Area or '',
                'fecha':       _fecha_local_str(p.FechaPrestamo),
                'fecha_estimada': (p.FechaEstimadaDevolucion.strftime('%d/%m/%Y')
                                   if p.FechaEstimadaDevolucion else ''),
                'observaciones': p.Observaciones or '',
            },
        })

    return JsonResponse({'ok': True, 'equipos': data})


@login_required(login_url='login')
@require_GET
@requiere_pantalla('prestamo-equipos')
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


@login_required(login_url='login')
@csrf_exempt
@require_POST
@requiere_pantalla('prestamo-equipos', bloquear_solo_lectura=True)
def api_equipo_admin_guardar(request):
    """Crea un equipo nuevo, o edita uno existente si viene id_equipo.

    NO toca IdResponsable a proposito. Ese campo lo maneja el ciclo de
    prestamo: se llena al prestar y se vacia al devolver. Antes se podia
    asignar desde este modal, pero el primer prestamo lo sobrescribia, asi
    que no servia para lo que aparentaba ("este equipo esta a cargo de
    fulano") y ademas duplicaba la columna "Prestado a" de la tabla.

    Importante: si aqui se volviera a escribir IdResponsable, editar el
    nombre de un equipo prestado borraria de quien lo tiene.
    """
    try:
        data = json.loads(request.body)
    except Exception:
        return JsonResponse({'ok': False, 'error': 'Solicitud inválida.'}, status=400)

    id_equipo   = data.get('id_equipo') or None
    nombre      = str(data.get('nombre', '')).strip()
    descripcion = str(data.get('descripcion', '')).strip()
    id_estado   = data.get('id_estado') or None

    if not nombre:
        return JsonResponse({'ok': False, 'error': 'El nombre del equipo es obligatorio.'}, status=400)
    if not id_estado:
        return JsonResponse({'ok': False, 'error': 'Debes seleccionar un estado.'}, status=400)
    if not EstadoGeneral.objects.using(DB).filter(IdEstado=id_estado).exists():
        return JsonResponse({'ok': False, 'error': 'El estado seleccionado no es válido.'}, status=400)

    if id_equipo:
        try:
            equipo = Equipo.objects.using(DB).get(IdEquipo=id_equipo)
        except Equipo.DoesNotExist:
            return JsonResponse({'ok': False, 'error': 'El equipo no existe.'}, status=404)
    else:
        equipo = Equipo()

    equipo.NombreEquipo = nombre
    equipo.Descripcion  = descripcion or None
    equipo.IdEstado     = id_estado
    equipo.save(using=DB)

    return JsonResponse({'ok': True, 'id_equipo': equipo.IdEquipo})


@login_required(login_url='login')
@csrf_exempt
@require_POST
@requiere_pantalla('prestamo-equipos', bloquear_solo_lectura=True)
def api_equipo_admin_eliminar(request, pk):
    try:
        equipo = Equipo.objects.using(DB).get(IdEquipo=pk)
    except Equipo.DoesNotExist:
        return JsonResponse({'ok': False, 'error': 'El equipo no existe.'}, status=404)
    equipo.delete(using=DB)
    return JsonResponse({'ok': True})


@login_required(login_url='login')
@require_GET
@requiere_pantalla('prestamo-equipos')
def api_equipo_admin_historial(request, pk):
    """Historial completo de préstamos de un equipo (todas las filas de
    mv_HistorialPrestamos para ese IdEquipo), para el modal de 'Ver
    historial' — evita tener que consultar la base de datos directamente."""
    if not Equipo.objects.using(DB).filter(IdEquipo=pk).exists():
        return JsonResponse({'ok': False, 'error': 'El equipo no existe.'}, status=404)

    historial = (
        HistorialPrestamo.objects.using(DB)
        .filter(IdEquipo_id=pk)
        .order_by('-FechaPrestamo')
    )
    data = [{
        'id':                        h.IdPrestamo,
        'cedula':                    h.Cedula,
        'solicitante':               h.NombreSolicitante,
        'area':                      h.Area or '—',
        'fecha_prestamo':            _fecha_local_str(h.FechaPrestamo) or '—',
        'fecha_estimada_devolucion': h.FechaEstimadaDevolucion.strftime('%d/%m/%Y') if h.FechaEstimadaDevolucion else '—',
        'fecha_devolucion_real':     _fecha_local_str(h.FechaDevolucionReal) or None,
        'observaciones':             h.Observaciones or '',
        'activo':                    h.FechaDevolucionReal is None,
    } for h in historial]

    return JsonResponse({'ok': True, 'historial': data, 'total': len(data)})


@login_required(login_url='login')
@csrf_exempt
@require_POST
@requiere_pantalla('prestamo-equipos', bloquear_solo_lectura=True)
def api_equipo_admin_devolver(request, pk):
    """Registra la devolucion de un equipo. SOLO desde el dashboard.

    La devolucion vivia en el portal y la hacia el propio solicitante, pero
    eso liberaba el equipo sin que nadie verificara que de verdad lo trajo a
    TIC: alguien podia marcar "devuelto" desde su escritorio y quedarse con el
    equipo, y el sistema lo mostraba libre para que otro lo pidiera. Ahora la
    registra quien recibe el equipo fisicamente.

    Cierra el prestamo abierto (le pone FechaDevolucionReal) y devuelve el
    equipo a DISPONIBLE. Las dos cosas o ninguna: liberar el equipo sin cerrar
    el prestamo es justo lo que dejo datos inconsistentes antes.
    """
    try:
        equipo = Equipo.objects.using(DB).get(IdEquipo=pk)
    except Equipo.DoesNotExist:
        return JsonResponse({'ok': False, 'error': 'El equipo no existe.'}, status=404)

    prestamo = (HistorialPrestamo.objects.using(DB)
                .filter(IdEquipo=equipo, FechaDevolucionReal__isnull=True)
                .order_by('-FechaPrestamo')
                .first())
    if not prestamo:
        return JsonResponse(
            {'ok': False, 'error': 'Este equipo no tiene un prestamo abierto.'}, status=400)

    try:
        body = json.loads(request.body or '{}')
    except Exception:
        body = {}
    observacion = (body.get('observaciones') or '').strip()

    # Checklist: [{id: <IdPrestamoAccesorio>, devuelto: bool, observacion: str}]
    # Solo se tocan las lineas de ESTE prestamo, para que un id equivocado no
    # pueda modificar el historial de otro.
    faltantes = []
    for a in (body.get('accesorios') or []):
        linea = _guardar_linea(prestamo.IdPrestamo, a, 'Devuelto', bool(a.get('devuelto')))
        if not linea:
            continue
        obs = (a.get('observacion') or '').strip()
        if obs:
            linea.Observacion = obs[:300]
        linea.save(using=DB)
        # Solo cuenta como faltante lo que SALIO y no volvio: pedir de vuelta
        # algo que nunca se entrego seria acusar de perder lo que no se llevo.
        if linea.Entregado and not linea.Devuelto:
            faltantes.append(linea.NombreAccesorio)

    if observacion:
        # Se agrega a lo que ya haya, no se pisa: la observacion del prestamo
        # la escribio el solicitante al pedirlo y tambien sirve de historia.
        previo = (prestamo.Observaciones or '').strip()
        nota = f'[Devolucion] {observacion}'
        prestamo.Observaciones = (previo + ' | ' + nota) if previo else nota

    prestamo.FechaDevolucionReal = timezone.now()
    prestamo.save(using=DB)

    equipo.IdResponsable = None
    equipo.IdEstado      = ESTADO_DISPONIBLE
    equipo.save(using=DB)

    return JsonResponse({
        'ok': True,
        'equipo': equipo.NombreEquipo,
        'solicitante': prestamo.NombreSolicitante,
        'faltantes': faltantes,
    })


# ══════════════════════════════════════════════════════════════
#  ACCESORIOS DE LOS EQUIPOS
#  Catalogo por equipo (lo que normalmente va con el) y registro de lo que
#  salio/volvio en cada prestamo. Sin el registro por prestamo no se podria
#  responder "le falto devolver el cable HDMI": el catalogo dice lo que
#  DEBERIA llevar, no lo que se llevo.
# ══════════════════════════════════════════════════════════════

def _accesorios_prestamo(id_prestamo):
    """Lineas de accesorios YA guardadas de un prestamo."""
    return [{
        'id':          a.IdPrestamoAccesorio,
        'id_accesorio': a.IdAccesorio,
        'nombre':      a.NombreAccesorio,
        'entregado':   bool(a.Entregado),
        'devuelto':    bool(a.Devuelto),
        'observacion': a.Observacion or '',
    } for a in (PrestamoAccesorio.objects.using(DB)
                .filter(IdPrestamo=id_prestamo)
                .order_by('IdPrestamoAccesorio'))]


def _accesorios_con_catalogo(id_prestamo, id_equipo):
    """Lo guardado MAS el catalogo del equipo, premarcado como entregado.

    Sin esto, la lista de "que se llevo" solo mostraria lo que se copio en el
    instante del prestamo. Un accesorio agregado al catalogo despues — o un
    prestamo anterior a que el catalogo existiera — quedaba invisible y no
    habia forma de marcarlo.

    Los del catalogo que todavia no tienen linea vienen con id=None: no
    existen en la base hasta que alguien guarde. Ahi se crean.
    """
    lineas = _accesorios_prestamo(id_prestamo)
    ya = {l['id_accesorio'] for l in lineas if l['id_accesorio']}

    pendientes = []
    for acc in (AccesorioEquipo.objects.using(DB)
                .filter(IdEquipo=id_equipo, Activo=True).order_by('Nombre')):
        if acc.IdAccesorio in ya:
            continue
        pendientes.append({
            'id':           None,
            'id_accesorio': acc.IdAccesorio,
            'nombre':       acc.Nombre,
            'entregado':    True,   # por defecto va marcado: es lo normal
            'devuelto':     False,
            'observacion':  '',
        })
    return lineas + pendientes


def _guardar_linea(id_prestamo, entrada, campo, valor):
    """Aplica un cambio a una linea, creandola si todavia no existe.

    `entrada` trae 'id' (linea guardada) o 'id_accesorio' (viene del catalogo
    y aun no se ha materializado). Devuelve la linea o None si no se pudo
    resolver — nunca toca lineas de OTRO prestamo.
    """
    linea = None
    if entrada.get('id'):
        linea = (PrestamoAccesorio.objects.using(DB)
                 .filter(IdPrestamo=id_prestamo, IdPrestamoAccesorio=entrada['id']).first())
    elif entrada.get('id_accesorio'):
        linea = (PrestamoAccesorio.objects.using(DB)
                 .filter(IdPrestamo=id_prestamo, IdAccesorio=entrada['id_accesorio']).first())
        if not linea:
            acc = AccesorioEquipo.objects.using(DB).filter(
                IdAccesorio=entrada['id_accesorio']).first()
            if not acc:
                return None
            linea = PrestamoAccesorio(
                IdPrestamo=id_prestamo, IdAccesorio=acc.IdAccesorio,
                NombreAccesorio=acc.Nombre, Entregado=True, Devuelto=False)
    if not linea:
        return None
    setattr(linea, campo, valor)
    return linea


@login_required(login_url='login')
@require_GET
@requiere_pantalla('prestamo-equipos')
def api_equipo_detalle(request, pk):
    """Todo lo de un equipo para el modal "Ver detalles": sus datos, el
    catalogo de accesorios, el prestamo abierto (si tiene) con lo que salio,
    y el historial."""
    try:
        equipo = Equipo.objects.using(DB).get(IdEquipo=pk)
    except Equipo.DoesNotExist:
        return JsonResponse({'ok': False, 'error': 'El equipo no existe.'}, status=404)

    estados = {e.IdEstado: e.Descripcion
               for e in EstadoGeneral.objects.using(DB).all()}
    responsable = ''
    if equipo.IdResponsable:
        u = Usuario.objects.using(DB).filter(IdUsuario=equipo.IdResponsable).first()
        responsable = u.NombreCompleto if u else ''

    catalogo = [{
        'id':     a.IdAccesorio,
        'nombre': a.Nombre,
        'activo': bool(a.Activo),
    } for a in (AccesorioEquipo.objects.using(DB)
                .filter(IdEquipo=pk, Activo=True).order_by('Nombre'))]

    prestamo = (HistorialPrestamo.objects.using(DB)
                .filter(IdEquipo_id=pk, FechaDevolucionReal__isnull=True)
                .order_by('-FechaPrestamo').first())

    activo = None
    if prestamo:
        activo = {
            'id':          prestamo.IdPrestamo,
            'solicitante': prestamo.NombreSolicitante,
            'cedula':      prestamo.Cedula,
            'area':        prestamo.Area or '',
            'fecha':       _fecha_local_str(prestamo.FechaPrestamo),
            'fecha_estimada': (prestamo.FechaEstimadaDevolucion.strftime('%d/%m/%Y')
                               if prestamo.FechaEstimadaDevolucion else ''),
            'observaciones': prestamo.Observaciones or '',
            'accesorios':  _accesorios_con_catalogo(prestamo.IdPrestamo, pk),
        }

    historial = []
    for h in (HistorialPrestamo.objects.using(DB)
              .filter(IdEquipo_id=pk).order_by('-FechaPrestamo')[:20]):
        historial.append({
            'id':          h.IdPrestamo,
            'solicitante': h.NombreSolicitante,
            'fecha':       _fecha_local_str(h.FechaPrestamo),
            'devolucion':  _fecha_local_str(h.FechaDevolucionReal) or None,
            'accesorios':  _accesorios_prestamo(h.IdPrestamo),
        })

    return JsonResponse({'ok': True, 'equipo': {
        'id':          equipo.IdEquipo,
        'nombre':      equipo.NombreEquipo,
        'descripcion': equipo.Descripcion or '',
        'estado':      (estados.get(equipo.IdEstado) or '').strip(),
        'disponible':  equipo.IdEstado == ESTADO_DISPONIBLE,
        'responsable': responsable,
        'catalogo':    catalogo,
        'prestamo_activo': activo,
        'historial':   historial,
    }})


@login_required(login_url='login')
@csrf_exempt
@require_POST
@requiere_pantalla('prestamo-equipos', bloquear_solo_lectura=True)
def api_equipo_accesorio_guardar(request, pk):
    """Agrega o renombra un accesorio del catalogo de un equipo."""
    try:
        equipo = Equipo.objects.using(DB).get(IdEquipo=pk)
    except Equipo.DoesNotExist:
        return JsonResponse({'ok': False, 'error': 'El equipo no existe.'}, status=404)

    try:
        body = json.loads(request.body or '{}')
    except Exception:
        return JsonResponse({'ok': False, 'error': 'Solicitud invalida.'}, status=400)

    nombre = str(body.get('nombre', '')).strip()
    if not nombre:
        return JsonResponse({'ok': False, 'error': 'El nombre del accesorio es obligatorio.'}, status=400)

    id_acc = body.get('id_accesorio') or None
    if id_acc:
        acc = (AccesorioEquipo.objects.using(DB)
               .filter(IdAccesorio=id_acc, IdEquipo=equipo.IdEquipo).first())
        if not acc:
            return JsonResponse({'ok': False, 'error': 'El accesorio no existe.'}, status=404)
        acc.Nombre = nombre
    else:
        # Sin duplicados: dos "Cable HDMI" en el mismo equipo solo confunden
        # al marcar el checklist.
        ya = (AccesorioEquipo.objects.using(DB)
              .filter(IdEquipo=equipo.IdEquipo, Nombre__iexact=nombre, Activo=True).first())
        if ya:
            return JsonResponse({'ok': False, 'error': 'Ese accesorio ya esta en la lista.'}, status=400)
        acc = AccesorioEquipo(IdEquipo=equipo.IdEquipo, Activo=True, Nombre=nombre)

    acc.save(using=DB)
    return JsonResponse({'ok': True, 'id': acc.IdAccesorio, 'nombre': acc.Nombre})


@login_required(login_url='login')
@csrf_exempt
@require_POST
@requiere_pantalla('prestamo-equipos', bloquear_solo_lectura=True)
def api_equipo_accesorio_eliminar(request, pk, acc_id):
    """Quita un accesorio del catalogo del equipo.

    Se marca Activo=0 en vez de borrar la fila: los prestamos que ya lo
    incluyeron apuntan a ese IdAccesorio, y borrarlo dejaria huerfanas esas
    referencias. El historial igual sobrevive gracias a NombreAccesorio, pero
    no hay razon para romper el enlace.

    Ademas se quita de los prestamos ABIERTOS. Si no, el accesorio seguiria
    apareciendo en "que se llevo" y en el checklist de devolucion de un
    prestamo en curso, pidiendo de vuelta algo que ya no forma parte del
    equipo. Los prestamos CERRADOS no se tocan: eso ya es historia y decir
    hoy que no se presto un cable que si se presto seria falsear el registro.
    """
    acc = (AccesorioEquipo.objects.using(DB)
           .filter(IdAccesorio=acc_id, IdEquipo=pk).first())
    if not acc:
        return JsonResponse({'ok': False, 'error': 'El accesorio no existe.'}, status=404)

    abiertos = list(HistorialPrestamo.objects.using(DB)
                    .filter(IdEquipo_id=pk, FechaDevolucionReal__isnull=True)
                    .values_list('IdPrestamo', flat=True))
    quitados = 0
    if abiertos:
        quitados = (PrestamoAccesorio.objects.using(DB)
                    .filter(IdPrestamo__in=abiertos, IdAccesorio=acc.IdAccesorio)
                    .delete())[0]

    acc.Activo = False
    acc.save(using=DB)
    return JsonResponse({'ok': True, 'nombre': acc.Nombre, 'quitado_de_prestamo': quitados})


@login_required(login_url='login')
@csrf_exempt
@require_POST
@requiere_pantalla('prestamo-equipos', bloquear_solo_lectura=True)
def api_prestamo_accesorios_guardar(request, pk):
    """Corrige que accesorios SALIERON en el prestamo abierto de un equipo.

    Al prestar desde el portal se copia el catalogo como entregado, porque es
    lo que normalmente sale. Esto es para ajustar la realidad: quitar lo que
    no se entrego o agregar algo que no esta en el catalogo (una extension
    prestada de otro lado, por ejemplo).
    """
    try:
        body = json.loads(request.body or '{}')
    except Exception:
        return JsonResponse({'ok': False, 'error': 'Solicitud invalida.'}, status=400)

    prestamo = (HistorialPrestamo.objects.using(DB)
                .filter(IdEquipo_id=pk, FechaDevolucionReal__isnull=True)
                .order_by('-FechaPrestamo').first())
    if not prestamo:
        return JsonResponse({'ok': False, 'error': 'Este equipo no tiene un prestamo abierto.'}, status=400)

    # Cada entrada trae 'id' (linea ya guardada) o 'id_accesorio' (viene del
    # catalogo y se materializa aqui).
    for a in (body.get('accesorios') or []):
        linea = _guardar_linea(prestamo.IdPrestamo, a, 'Entregado', bool(a.get('entregado')))
        if linea:
            linea.save(using=DB)

    # Accesorios sueltos que no vienen del catalogo (IdAccesorio queda NULL)
    creados = []
    for nombre in (body.get('nuevos') or []):
        nombre = str(nombre).strip()[:150]
        if not nombre:
            continue
        creados.append(PrestamoAccesorio.objects.using(DB).create(
            IdPrestamo=prestamo.IdPrestamo, IdAccesorio=None,
            NombreAccesorio=nombre, Entregado=True, Devuelto=False))

    return JsonResponse({'ok': True, 'agregados': len(creados),
                         'accesorios': _accesorios_con_catalogo(prestamo.IdPrestamo, pk)})
