import json, uuid, unicodedata, datetime, logging, hashlib, os, time
import requests
from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_POST, require_GET
from django.views.decorators.csrf import csrf_exempt
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.contrib.auth.hashers import make_password
from .models import (
    Usuario, Requerimiento, Categoria, SubCategoria, CentroOperacion,
    Cargo, TipoUsuario, Area, Prioridad, Clasificacion, EvaluacionReq, TipoRequerimiento,
    Notificacion, ImagenAdjunta,
)

DB = 'requerimientos'

logger = logging.getLogger('requerimientos')


PREFIJO_APP = '/SYSTRACK'

ID_TIPO_REQ_SISTEMAS = 4  # Requerimiento Sistemas — único tipo que usa este formulario

# Los requerimientos "Cerrados sin calificar" (IdEstado=4) solo cuentan para
# el bloqueo de creación y la campanita de notificaciones si se solucionaron
# desde esta fecha en adelante — evita arrastrar backlog histórico (hay
# casos desde 2023 que ya no tiene sentido seguir bloqueando).
FECHA_INICIO_PENDIENTES_CALIFICAR = datetime.date(2026, 7, 1)

# Categoría bajo la cual viven las subcategorías que exigen aprobación.
CATEGORIA_SOPORTE_EXTERNO = 'soporte tecnico externo'

# Subcategorías (dentro de esa categoría) que exigen aprobación del jefe de área.
SUBCATEGORIAS_REQUIEREN_APROBACION = ['compras']

# Adjuntos de requerimientos (un solo archivo, cualquier tipo, máx 5 MB)
ADJUNTO_CARPETA    = 'requerimientos_adjuntos'
ADJUNTO_MAX_BYTES  = 5 * 1024 * 1024


def _token_seguimiento(req):
    """
    Token público de solo-lectura para el link de seguimiento del correo.
    No se guarda en BD: se calcula con el código + email + SECRET_KEY,
    así que solo es válido para ESE requerimiento y no se puede adivinar
    ni reutilizar en otro código.
    """
    base = f"{req.codigo()}-{req.Email or ''}-{settings.SECRET_KEY}"
    return hashlib.sha256(base.encode()).hexdigest()[:24]


def _normaliza(txt):
    """minúsculas + sin tildes, para comparar sin fallos por formato."""
    txt = (txt or '').strip().lower()
    return ''.join(c for c in unicodedata.normalize('NFD', txt) if unicodedata.category(c) != 'Mn')


def Requerimientos(request):
    return render(request, "requerimientos/requerimientos.html")


@require_GET
def catalogos(request):
    cats = list(
        Categoria.objects
        .using(DB)
        .filter(Estado=1)
        .values('IdCategoria', 'Descripcion', 'TiempoDias')
        .order_by('Descripcion')
    )
    cos = list(
        CentroOperacion.objects
        .using(DB)
        .filter(Estado=1)
        .values('IdCo', 'Descripcion', 'Ciudad')
        .order_by('Descripcion')
    )

    tipos_req = list(
        TipoRequerimiento.objects
        .using(DB)
        .values('IdTipoReque', 'Descripcion')
        .order_by('Descripcion')
    )
    return JsonResponse({'ok': True, 'categorias': cats, 'centros': cos, 'tipos_req': tipos_req})


@require_GET
def subcategorias(request):
    id_cat = request.GET.get('categoria', '').strip()
    if not id_cat:
        return JsonResponse({'ok': False, 'error': 'Falta categoria.'}, status=400)

    subs = list(
        SubCategoria.objects
        .using(DB)
        .filter(IdCategoria=id_cat)
        .values('IdSubCategoria', 'Descripcion', 'Prioridad', 'TiempoDias')
        .order_by('Descripcion')
    )
    return JsonResponse({'ok': True, 'subcategorias': subs})


@csrf_exempt
@require_POST
def validar_cedula(request):
    try:
        data   = json.loads(request.body)
        cedula = str(data.get('cedula', '')).strip()
    except Exception:
        return JsonResponse({'ok': False, 'error': 'Solicitud inválida.'}, status=400)

    if not cedula:
        return JsonResponse({'ok': False, 'error': 'Debes ingresar tu cédula.'})

    try:
        usuario = Usuario.objects.using(DB).get(Cedula=cedula, Estado=1)
    except Usuario.DoesNotExist:
        return JsonResponse({'ok': False, 'error': 'Cédula no encontrada o usuario inhabilitado.'})

    co_texto = ''
    id_co_limpio = (usuario.IdCO or '').strip()
    if id_co_limpio:
        try:
            co = CentroOperacion.objects.using(DB).get(IdCo=id_co_limpio)
            co_texto = co.Descripcion
        except CentroOperacion.DoesNotExist:
            pass

    cargo_txt = ''
    if usuario.IdCargo:
        try:
            cargo = Cargo.objects.using(DB).get(IdCargo=usuario.IdCargo)
            cargo_txt = cargo.Descripcion
        except Cargo.DoesNotExist:
            pass

    return JsonResponse({
        'ok':        True,
        'nombre':    usuario.NombreCompleto,
        'email':     usuario.Email or '',
        'id_cargo':  usuario.IdCargo or '',
        'cargo_txt': cargo_txt,
        'id_co':     id_co_limpio,
        'co_texto':  co_texto,
        'id_area':   usuario.IdArea or '',
        'datos_actualizados': bool(usuario.DatosActualizados),
    })


@csrf_exempt
@require_POST
def api_actualizar_datos_usuario(request):
    """
    Actualización obligatoria de datos (una sola vez) para usuarios ya
    existentes cuyo perfil está incompleto. A diferencia del auto-registro
    (api_registrar_usuario_req), esto actualiza un usuario que YA existe,
    no crea uno nuevo, y marca DatosActualizados=True para que no se le
    vuelva a pedir.
    """
    try:
        data = json.loads(request.body)
    except Exception:
        return JsonResponse({'ok': False, 'error': 'Solicitud inválida.'}, status=400)

    cedula   = str(data.get('cedula', '')).strip()
    id_cargo = data.get('id_cargo') or None
    id_co    = str(data.get('id_co', '')).strip()
    correo   = str(data.get('correo', '')).strip()
    id_area  = data.get('id_area') or None

    faltantes = []
    if not cedula:
        faltantes.append('Número de documento')
    if not id_cargo:
        faltantes.append('Cargo')
    if not id_co:
        faltantes.append('Centro de operación')
    if not id_area:
        faltantes.append('Área')
    if not correo:
        faltantes.append('Correo corporativo')

    if faltantes:
        return JsonResponse({
            'ok': False,
            'error': 'Faltan campos obligatorios: ' + ', '.join(faltantes)
        }, status=400)

    try:
        usuario = Usuario.objects.using(DB).get(Cedula=cedula, Estado=1)
    except Usuario.DoesNotExist:
        return JsonResponse({'ok': False, 'error': 'Cédula no encontrada o usuario inhabilitado.'}, status=404)

    if not Cargo.objects.using(DB).filter(IdCargo=id_cargo).exists():
        return JsonResponse({'ok': False, 'error': 'El cargo seleccionado no es válido.'}, status=400)
    if not CentroOperacion.objects.using(DB).filter(IdCo=id_co).exists():
        return JsonResponse({'ok': False, 'error': 'El centro de operación seleccionado no es válido.'}, status=400)
    if not Area.objects.using(DB).filter(IdArea=id_area).exists():
        return JsonResponse({'ok': False, 'error': 'El área seleccionada no es válida.'}, status=400)

    usuario.IdCargo           = id_cargo
    usuario.IdCO              = id_co
    usuario.IdArea            = id_area
    usuario.Email             = correo
    usuario.DatosActualizados = True
    usuario.save(using=DB, update_fields=['IdCargo', 'IdCO', 'IdArea', 'Email', 'DatosActualizados'])

    return JsonResponse({'ok': True})


@require_GET
def mis_requerimientos(request):
    cedula = request.GET.get('cedula', '').strip()
    if not cedula:
        return JsonResponse({'ok': False, 'error': 'Cedula requerida.'}, status=400)

    ESTADOS = {1: 'Abierto', 2: 'Asignado', 3: 'En Proceso', 4: 'Cerrado', 5: 'Eliminado', 6: 'Calificado',
           7: 'Pendiente Aprobación', 8: 'Rechazado'}

    qs = (Requerimiento.objects
          .using(DB)
          .filter(CedulaUsuario=cedula)
          .exclude(IdEstado=5)
          .order_by('-Fecha'))

    reqs = list(qs)

    # --- resolver textos de catálogos ---
    prioridad_ids = [r.IdPrioridad for r in reqs if r.IdPrioridad]
    prioridad_map = {
        p.IdPrioridad: p.Descripcion
        for p in Prioridad.objects.using(DB).filter(IdPrioridad__in=prioridad_ids)
    }

    clasif_ids = [r.Clasificacion for r in reqs if r.Clasificacion]
    clasif_map = {
        c.IdClasificacion: c.Clasificacion
        for c in Clasificacion.objects.using(DB).filter(IdClasificacion__in=clasif_ids)
    }

    # --- mapa de categorías y subcategorías (resuelve el nombre en vez del ID crudo) ---
    cat_ids = [r.IdCategoria for r in reqs if r.IdCategoria]
    categoria_map = {
        c.IdCategoria: c.Descripcion
        for c in Categoria.objects.using(DB).filter(IdCategoria__in=cat_ids)
    }

    sub_ids = [r.IdSubCategoria for r in reqs if r.IdSubCategoria]
    subcategoria_map = {
        s.IdSubCategoria: s.Descripcion
        for s in SubCategoria.objects.using(DB).filter(IdSubCategoria__in=sub_ids)
    }

    codigos = [r.Codigo for r in reqs]
    evaluacion_map = {
        e.IdReq: e.Evaluacion
        for e in EvaluacionReq.objects.using(DB).filter(IdReq__in=codigos)
    }

    data = []
    for r in reqs:
        data.append({
            'codigo':          r.codigo(),
            'documento':       r.CedulaUsuario,
            'fecha_creacion':  r.Fecha.strftime('%d/%m/%Y') if r.Fecha else '',
            'requerimiento':   r.Requerimiento or '',
            'area':            categoria_map.get(r.IdCategoria, ''),
            'subcategoria':    subcategoria_map.get(r.IdSubCategoria, ''),
            'prioridad':       prioridad_map.get(r.IdPrioridad, ''),
            'vencimiento':     r.FechaEstiSoluci.strftime('%d/%m/%Y') if r.FechaEstiSoluci else '',
            'responsable':     r.NombreUsuariAsig or '',
            'plan_accion':     r.PlanAccion or '',
            'solucion':        r.Solucion or '',
            'fecha_solucion':  r.FechaRealSoluci.strftime('%d/%m/%Y') if r.FechaRealSoluci else '',
            'clasificacion':   clasif_map.get(r.Clasificacion, ''),
            'calificacion':    evaluacion_map.get(r.Codigo, None),
            'estado':          ESTADOS.get(r.IdEstado, str(r.IdEstado or '')),
            'requiere_aprobacion': bool(r.IdJefeArea),
            'fecha_aprobacion':    r.FechaAprobacion.strftime('%d/%m/%Y') if r.FechaAprobacion else '',
        })

    return JsonResponse({'ok': True, 'data': data})


@csrf_exempt
@require_POST
def crear_requerimiento(request):
    try:
        data   = json.loads(request.body)
        cedula = str(data.get('cedula', '')).strip()
        if not cedula:
                    return JsonResponse({'ok': False, 'error': 'Cédula requerida.'}, status=400)

        # ── Validación de campos obligatorios del formulario ──────────────
        nombre_completo     = str(data.get('nombre_completo', '')).strip()
        correo_electronico  = str(data.get('correo_electronico', '')).strip()
        descripcion         = str(data.get('descripcion', '')).strip()
        id_categoria_check  = data.get('id_categoria')
        id_subcategoria_ck  = data.get('id_subcategoria')
        # CO en mv_Requerimientos es varchar(5): guarda el CÓDIGO del centro
        # (ej. "AM1"), no el nombre descriptivo — por eso se usa id_co, no
        # co_texto (que sí sigue viajando en el body, solo para mostrarlo).
        id_co_dato          = str(data.get('id_co', '')).strip()

        faltantes = []
        if not nombre_completo:
            faltantes.append('Nombre completo')
        if not id_co_dato:
            faltantes.append('Centro de operación')
        if not id_categoria_check:
            faltantes.append('Categoría')
        if not id_subcategoria_ck:
            faltantes.append('Subcategoría')
        if not correo_electronico:
            faltantes.append('Correo electrónico')
        if not descripcion:
            faltantes.append('Descripción')

        if faltantes:
            return JsonResponse({
                'ok': False,
                'error': 'Faltan campos obligatorios: ' + ', '.join(faltantes) + '.'
            }, status=400)

        try:
            usuario = Usuario.objects.using(DB).get(Cedula=cedula, Estado=1)
        except Usuario.DoesNotExist:
            return JsonResponse({'ok': False, 'error': 'Cédula no registrada.'}, status=403)

        # ── Bloqueo: no permitir crear si tiene requerimientos ya
        # solucionados (Cerrado, IdEstado=4) pendientes de calificar ──────
        pendientes_calificar = list(
            Requerimiento.objects
            .using(DB)
            .filter(CedulaUsuario=cedula, IdEstado=4,
                    FechaRealSoluci__gte=FECHA_INICIO_PENDIENTES_CALIFICAR)
            .order_by('-FechaRealSoluci')
        )
        if pendientes_calificar:
            codigos = [r.codigo() for r in pendientes_calificar]
            if len(codigos) == 1:
                detalle = f'tienes el requerimiento {codigos[0]} pendiente por calificar'
            else:
                detalle = f'tienes {len(codigos)} requerimientos pendientes por calificar ({", ".join(codigos)})'
            return JsonResponse({
                'ok': False,
                'codigo_error': 'PENDIENTE_CALIFICACION',
                'pendientes': codigos,
                'error': f'Antes de crear un nuevo requerimiento, por favor califica el servicio recibido: {detalle}.'
            }, status=409)

        id_cat  = data.get('id_categoria')

        id_sub  = data.get('id_subcategoria')
        cat_txt = sub_txt = prioridad = ''
        tiempo_dias_cat = tiempo_dias_sub = None

        if id_cat:
            try:
                cat = Categoria.objects.using(DB).get(IdCategoria=id_cat)
                cat_txt = cat.Descripcion
                tiempo_dias_cat = cat.TiempoDias
            except Categoria.DoesNotExist:
                pass

        if id_sub:
            try:
                sub = SubCategoria.objects.using(DB).get(IdSubCategoria=id_sub)
                sub_txt   = sub.Descripcion
                prioridad = sub.Prioridad or 'Media'
                tiempo_dias_sub = sub.TiempoDias
            except SubCategoria.DoesNotExist:
                pass

        #  Resolver IdPrioridad (la columna no admite NULL) 
        id_prioridad = None
        if prioridad:
            prio_obj = Prioridad.objects.using(DB).filter(Descripcion__iexact=prioridad).first()
            id_prioridad = prio_obj.IdPrioridad if prio_obj else None

        if not id_prioridad:
            # Fallback: prioridad "Media" (o la primera disponible si no existe "Media")
            prio_obj = (Prioridad.objects.using(DB).filter(Descripcion__iexact='Media').first()
                        or Prioridad.objects.using(DB).order_by('IdPrioridad').first())
            id_prioridad = prio_obj.IdPrioridad if prio_obj else None

        if not id_prioridad:
            return JsonResponse({
                'ok': False,
                'error': 'No hay prioridades configuradas en el sistema. Contacta al administrador.'
            }, status=500)

        #  Validación de aprobación por jefe de área 
        es_categoria_correcta = _normaliza(cat_txt) == CATEGORIA_SOPORTE_EXTERNO
        sub_normalizada = _normaliza(sub_txt)
        es_subcategoria_sensible = any(
            sub_normalizada.startswith(s) for s in SUBCATEGORIAS_REQUIEREN_APROBACION
        )
        requiere_aprobacion = es_categoria_correcta and es_subcategoria_sensible
        es_jefe    = True
        area       = None
        token      = None
        id_jefe_us = 0
        jefe_usr   = None

        if requiere_aprobacion:
            if not usuario.IdArea:
                return JsonResponse({
                    'ok': False,
                    'error': 'Tu usuario no está vinculado a un área. Contacta al administrador para asignarte un área antes de crear este tipo de requerimiento.'
                }, status=400)

            try:
                area = Area.objects.using(DB).get(IdArea=usuario.IdArea)
            except Area.DoesNotExist:
                return JsonResponse({
                    'ok': False,
                    'error': 'El área asignada a tu usuario no existe. Contacta al administrador.'
                }, status=400)

            correo_usuario = _normaliza(usuario.Email)
            correo_jefe    = _normaliza(area.CorreoJefe)
            es_jefe = bool(correo_jefe) and correo_usuario == correo_jefe

            if not es_jefe:
                token = uuid.uuid4().hex
                jefe_usr = Usuario.objects.using(DB).filter(Email__iexact=area.CorreoJefe, Estado=1).first()
                if not jefe_usr:
                    return JsonResponse({
                        'ok': False,
                        'error': 'No se encontró un usuario activo para el jefe de área configurado. Contacta al administrador.'
                    }, status=400)
                id_jefe_us = jefe_usr.IdUsuario

        if not usuario.IdCargo:
            return JsonResponse({
                'ok': False,
                'error': 'Tu usuario no tiene un cargo asignado. Contacta al administrador para configurarlo antes de crear un requerimiento.'
            }, status=400)

        estado_inicial = 1 if (not requiere_aprobacion or es_jefe) else 7  # 7 = Pendiente Aprobación

        # ── Calcular FechaEstiSoluci: Fecha + TiempoDias (subcategoría, o categoría si no hay) ──
        tiempo_dias = tiempo_dias_sub if tiempo_dias_sub else tiempo_dias_cat
        fecha_hoy = datetime.date.today()
        fecha_esti_solucion = (
            fecha_hoy + datetime.timedelta(days=tiempo_dias) if tiempo_dias else None
        )

        req = Requerimiento(
            IdUsuario        = usuario.IdUsuario,
            CedulaUsuario    = cedula,
            NombreUsuario    = data.get('nombre_completo', ''),
            Cargo            = usuario.IdCargo,
            IdTipoReq        = ID_TIPO_REQ_SISTEMAS,
            IdCategoria      = id_cat or None,
            IdSubCategoria   = id_sub or None,
            IdPrioridad      = id_prioridad,
            Requerimiento    = data.get('descripcion', ''),
            Email            = data.get('correo_electronico', ''),
            CO               = id_co_dato,
            Fecha            = fecha_hoy,
            FechaEstiSoluci  = fecha_esti_solucion,
            IdEstado         = estado_inicial,
            IdJefeArea       = id_jefe_us,
            TokenAprobacion  = token,
        )
        req.save(using=DB)

        if requiere_aprobacion and not es_jefe:
            _enviar_correo_aprobacion(request, req, area)
            _enviar_correo_confirmacion(request, req, pendiente=True)
            return JsonResponse({
                'ok': True,
                'codigo': req.codigo(),
                'estado': 'pendiente_aprobacion',
                'mensaje': f'Tu requerimiento quedó pendiente de aprobación por el jefe de área "{area.NombreArea}". Te notificaremos cuando sea revisado.'
            })

        _enviar_correo_confirmacion(request, req, pendiente=False)
        return JsonResponse({'ok': True, 'codigo': req.codigo(), 'estado': 'creado'})
    except Exception as e:
        return JsonResponse({'ok': False, 'error': str(e)}, status=500)


def _enviar_correo_aprobacion(request, req, area):
    if not area.CorreoJefe:
        logger.error(
            "No se envió correo de aprobación: Area IdArea=%s (%s) no tiene CorreoJefe configurado.",
            area.IdArea, area.NombreArea
        )
        return

    base_url = request.build_absolute_uri('/').rstrip('/')
    link_aprobar  = f"{base_url}{PREFIJO_APP}/requerimiento/api/aprobar/{req.TokenAprobacion}/"
    link_rechazar = f"{base_url}{PREFIJO_APP}/requerimiento/api/rechazar/{req.TokenAprobacion}/"

    asunto = f"Aprobación requerida — Requerimiento {req.codigo()}"
    cuerpo_html = render_to_string('requerimientos/correo_aprobacion.html', {
        'req': req, 'area': area, 'link_aprobar': link_aprobar, 'link_rechazar': link_rechazar,
    })

    try:
        enviados = send_mail(
            subject=asunto,
            message=f"Debes aprobar o rechazar el requerimiento {req.codigo()}. Aprobar: {link_aprobar}  Rechazar: {link_rechazar}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[area.CorreoJefe],
            html_message=cuerpo_html,
            fail_silently=False,
        )
        logger.info(
            "Correo de aprobación -> %s (Requerimiento %s): send_mail devolvió %s",
            area.CorreoJefe, req.codigo(), enviados
        )
    except Exception:
        logger.exception(
            "FALLÓ el envío del correo de aprobación al jefe %s para el requerimiento %s",
            area.CorreoJefe, req.codigo()
        )


def _enviar_correo_confirmacion(request, req, pendiente=False):
    if not req.Email:
        logger.warning(
            "No se envió correo de confirmación: Requerimiento %s no tiene Email.",
            req.codigo()
        )
        return
    base_url = request.build_absolute_uri('/').rstrip('/')
    link_seguimiento = (f"{base_url}{PREFIJO_APP}/requerimiento/seguimiento/"
                         f"?codigo={req.codigo()}&t={_token_seguimiento(req)}")

    asunto = f"Confirmación de tu requerimiento — {req.codigo()}"
    cuerpo_html = render_to_string('requerimientos/correo_confirmacion.html', {
        'req': req, 'link_seguimiento': link_seguimiento, 'pendiente': pendiente,
    })

    try:
        enviados = send_mail(
            subject=asunto,
            message=(f"Tu requerimiento {req.codigo()} fue registrado. "
                      f"Ingresa este código en la sección de Seguimiento para ver su estado: {req.codigo()}. "
                      f"Link: {link_seguimiento}"),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[req.Email],
            html_message=cuerpo_html,
            fail_silently=False,
        )
        logger.info(
            "Correo de confirmación -> %s (Requerimiento %s): send_mail devolvió %s",
            req.Email, req.codigo(), enviados
        )
    except Exception:
        logger.exception(
            "FALLÓ el envío del correo de confirmación a %s para el requerimiento %s",
            req.Email, req.codigo()
        )


def _enviar_correo_aprobado(request, req):
    """Avisa al solicitante que su jefe de área APROBÓ el requerimiento."""
    if not req.Email:
        logger.warning(
            "No se envió correo de aprobado: Requerimiento %s no tiene Email.",
            req.codigo()
        )
        return
    base_url = request.build_absolute_uri('/').rstrip('/')
    link_seguimiento = (f"{base_url}{PREFIJO_APP}/requerimiento/seguimiento/"
                         f"?codigo={req.codigo()}&t={_token_seguimiento(req)}")

    asunto = f"Tu requerimiento fue aprobado — {req.codigo()}"
    cuerpo_html = render_to_string('requerimientos/correo_aprobado.html', {
        'req': req, 'link_seguimiento': link_seguimiento,
    })

    try:
        enviados = send_mail(
            subject=asunto,
            message=(f"Tu jefe de área aprobó el requerimiento {req.codigo()}. "
                      f"Ya quedó habilitado para que el área de Tecnología lo gestione. "
                      f"Seguimiento: {link_seguimiento}"),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[req.Email],
            html_message=cuerpo_html,
            fail_silently=False,
        )
        logger.info(
            "Correo de aprobado -> %s (Requerimiento %s): send_mail devolvió %s",
            req.Email, req.codigo(), enviados
        )
    except Exception:
        logger.exception(
            "FALLÓ el envío del correo de aprobado a %s para el requerimiento %s",
            req.Email, req.codigo()
        )


def _enviar_correo_rechazo(request, req):
    """Avisa al solicitante que su jefe de área RECHAZÓ el requerimiento."""
    if not req.Email:
        logger.warning(
            "No se envió correo de rechazo: Requerimiento %s no tiene Email.",
            req.codigo()
        )
        return
    base_url = request.build_absolute_uri('/').rstrip('/')
    link_seguimiento = (f"{base_url}{PREFIJO_APP}/requerimiento/seguimiento/"
                         f"?codigo={req.codigo()}&t={_token_seguimiento(req)}")

    asunto = f"Tu requerimiento fue rechazado — {req.codigo()}"
    cuerpo_html = render_to_string('requerimientos/correo_rechazo.html', {
        'req': req, 'link_seguimiento': link_seguimiento,
    })

    try:
        enviados = send_mail(
            subject=asunto,
            message=(f"Tu jefe de área rechazó el requerimiento {req.codigo()}. "
                      f"Comunícate con tu jefe de área para más información. "
                      f"Seguimiento: {link_seguimiento}"),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[req.Email],
            html_message=cuerpo_html,
            fail_silently=False,
        )
        logger.info(
            "Correo de rechazo -> %s (Requerimiento %s): send_mail devolvió %s",
            req.Email, req.codigo(), enviados
        )
    except Exception:
        logger.exception(
            "FALLÓ el envío del correo de rechazo a %s para el requerimiento %s",
            req.Email, req.codigo()
        )


def _obtener_link_base():
    """Dominio base para construir links en correos enviados desde Signals.py,
    donde NO hay objeto request disponible (post_save se dispara fuera del ciclo
    request/response). Configura SITE_URL en settings.py para producción."""
    return getattr(settings, 'SITE_URL', 'https://app.montacargasamym.com:3878').rstrip('/')


def _enviar_correo_solucion(req):
    """Avisa al solicitante que su requerimiento fue solucionado (estado -> Cerrado).
    Se dispara desde Signals.py (post_save), por eso NO recibe request."""
    if not req.Email:
        logger.warning(
            "No se envió correo de solución: Requerimiento %s no tiene Email.",
            req.codigo()
        )
        return

    base_url = _obtener_link_base()
    link_seguimiento = f"{base_url}{PREFIJO_APP}/requerimiento/?seg={req.codigo()}"
    link_calificar   = f"{base_url}/CalificacionRequerimiento/calificar/{req.Codigo}/"

    asunto = f"Requerimiento solucionado — {req.codigo()}"
    cuerpo_html = render_to_string('requerimientos/correo_solucion.html', {
        'req': req, 'link_seguimiento': link_seguimiento, 'link_calificar': link_calificar,
    })

    try:
        enviados = send_mail(
            subject=asunto,
            message=(f"Tu requerimiento {req.codigo()} fue solucionado. "
                      f"Solución: {req.Solucion or '(sin detalle)'}. "
                      f"Califica la atención aquí: {link_calificar}"),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[req.Email],
            html_message=cuerpo_html,
            fail_silently=False,
        )
        logger.info(
            "Correo de solución -> %s (Requerimiento %s): send_mail devolvió %s",
            req.Email, req.codigo(), enviados
        )
    except Exception:
        logger.exception(
            "FALLÓ el envío del correo de solución a %s para el requerimiento %s",
            req.Email, req.codigo()
        )


def _enviar_correo_asignacion(req, es_reasignacion=False):
    """Notifica al técnico que se le asignó (o reasignó) un requerimiento.
    Se dispara desde Signals.py (post_save), por eso NO recibe request."""
    if not req.IdUsuarioAsig:
        return

    try:
        tecnico = Usuario.objects.using(DB).get(IdUsuario=req.IdUsuarioAsig)
    except Usuario.DoesNotExist:
        logger.warning(
            "No se envió correo de asignación: Usuario IdUsuario=%s no existe (Requerimiento %s).",
            req.IdUsuarioAsig, req.codigo()
        )
        return

    if not tecnico.Email:
        logger.warning(
            "No se envió correo de asignación: técnico %s (IdUsuario=%s) no tiene Email (Requerimiento %s).",
            tecnico.NombreCompleto, tecnico.IdUsuario, req.codigo()
        )
        return

    base_url = _obtener_link_base()
    link_ver = f"{base_url}{PREFIJO_APP}/inventario/"

    asunto = (f"Requerimiento reasignado — {req.codigo()}" if es_reasignacion
              else f"Nuevo requerimiento asignado — {req.codigo()}")
    cuerpo_html = render_to_string('requerimientos/correo_asignacion.html', {
        'req': req, 'tecnico': tecnico, 'link_ver': link_ver, 'es_reasignacion': es_reasignacion,
    })

    try:
        enviados = send_mail(
            subject=asunto,
            message=(f"Se te {'reasignó' if es_reasignacion else 'asignó'} el requerimiento {req.codigo()}. "
                      f"Ver: {link_ver}"),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[tecnico.Email],
            html_message=cuerpo_html,
            fail_silently=False,
        )
        logger.info(
            "Correo de asignación -> %s (Requerimiento %s, reasignación=%s): send_mail devolvió %s",
            tecnico.Email, req.codigo(), es_reasignacion, enviados
        )
    except Exception:
        logger.exception(
            "FALLÓ el envío del correo de asignación a %s para el requerimiento %s",
            tecnico.Email, req.codigo()
        )


def _crear_notificacion_portal(req, tipo, titulo, mensaje):
    """Igual que Signals._crear_notificacion, pero para los eventos que se
    disparan desde una vista (aprobar/rechazar) en vez de un post_save.
    FechaCreacion no admite NULL en la BD — hay que fijarlo a mano."""
    try:
        Notificacion.objects.using(DB).create(
            CedulaUsuario=req.CedulaUsuario, Tipo=tipo, Codigo=req.Codigo,
            Titulo=titulo, Mensaje=mensaje, FechaCreacion=datetime.datetime.now(),
        )
    except Exception:
        logger.exception("No se pudo crear la notificación '%s' para %s", tipo, req.codigo())


@require_GET
def aprobar_requerimiento(request, token):
    try:
        req = Requerimiento.objects.using(DB).get(TokenAprobacion=token, IdEstado=7)
    except Requerimiento.DoesNotExist:
        return render(request, 'requerimientos/aprobacion_resultado.html', {'invalido': True})

    req.IdEstado        = 1  # Abierto
    req.FechaAprobacion = datetime.datetime.now()
    req.TokenAprobacion = None
    req.save(using=DB)
    _enviar_correo_aprobado(request, req)
    _crear_notificacion_portal(
        req, 'aprobado', f'{req.codigo()} fue aprobado',
        'Tu jefe de área lo aprobó. Ya quedó habilitado para que Tecnología lo gestione.'
    )
    return render(request, 'requerimientos/aprobacion_resultado.html', {'accion': 'aprobado', 'req': req})


@require_GET
def rechazar_requerimiento(request, token):
    try:
        req = Requerimiento.objects.using(DB).get(TokenAprobacion=token, IdEstado=7)
    except Requerimiento.DoesNotExist:
        return render(request, 'requerimientos/aprobacion_resultado.html', {'invalido': True})

    req.IdEstado        = 8  # Rechazado
    req.FechaAprobacion = datetime.datetime.now()
    req.TokenAprobacion = None
    req.save(using=DB)
    _enviar_correo_rechazo(request, req)
    _crear_notificacion_portal(
        req, 'rechazado', f'{req.codigo()} fue rechazado',
        'Tu jefe de área lo rechazó. Comunícate con él para más información.'
    )
    return render(request, 'requerimientos/aprobacion_resultado.html', {'accion': 'rechazado', 'req': req})


@csrf_exempt
@require_POST
def calificar_requerimiento(request):
    try:
        data       = json.loads(request.body)
        codigo     = str(data.get('codigo', '')).strip()
        cal        = int(data.get('calificacion', 0))
        comentario = str(data.get('comentario', '')).strip()

        if not (1 <= cal <= 5):
            return JsonResponse({'ok': False, 'error': 'Calificación debe ser 1-5.'})

        pk  = int(codigo.replace('REQ-', ''))
        req = Requerimiento.objects.using(DB).get(pk=pk)

        if req.IdEstado != 4:
            return JsonResponse({'ok': False, 'error': 'Solo puedes calificar requerimientos cerrados.'})

        ev, created = EvaluacionReq.objects.using(DB).get_or_create(
            IdReq=pk, defaults={'Evaluacion': cal, 'Comentario': comentario}
        )
        if not created:
            ev.Evaluacion = cal
            ev.Comentario = comentario
            ev.save(using=DB)

        req.IdEstado = 6  # Calificado
        req.save(using=DB)

        return JsonResponse({'ok': True})

    except Requerimiento.DoesNotExist:
        return JsonResponse({'ok': False, 'error': 'Requerimiento no encontrado.'}, status=404)
    except Exception as e:
        return JsonResponse({'ok': False, 'error': str(e)}, status=500)


# ────────────────────────── ADJUNTOS ──────────────────────────

@csrf_exempt
@require_POST
def api_adjuntar_archivo(request, codigo):
    """
    Sube UN archivo (cualquier tipo, máx 5 MB) y lo asocia al requerimiento
    `codigo`. Se llama justo después de crear_requerimiento, en un segundo
    paso, porque crear_requerimiento recibe JSON puro (no puede llevar
    binarios). Guarda la fila en la tabla ya existente mm_ImagenesAdjuntos
    (IdImagen, CodReq, NombreImagen) y el archivo físico en
    MEDIA_ROOT/requerimientos_adjuntos/{IdImagen}_{nombre_original}.
    """
    try:
        req = Requerimiento.objects.using(DB).get(pk=codigo)
    except Requerimiento.DoesNotExist:
        return JsonResponse({'ok': False, 'error': 'Requerimiento no encontrado.'}, status=404)

    archivo = request.FILES.get('archivo')
    if not archivo:
        return JsonResponse({'ok': False, 'error': 'No se recibió ningún archivo.'}, status=400)

    if archivo.size > ADJUNTO_MAX_BYTES:
        return JsonResponse({
            'ok': False,
            'error': f'El archivo supera el máximo permitido de {ADJUNTO_MAX_BYTES // (1024*1024)} MB.'
        }, status=400)

    try:
        imagen = ImagenAdjunta.objects.using(DB).create(
            CodReq=req.Codigo, NombreImagen=archivo.name
        )

        carpeta = os.path.join(settings.MEDIA_ROOT, ADJUNTO_CARPETA)
        os.makedirs(carpeta, exist_ok=True)
        nombre_disco = f'{imagen.IdImagen}_{archivo.name}'
        ruta_disco   = os.path.join(carpeta, nombre_disco)
        with open(ruta_disco, 'wb+') as destino:
            for chunk in archivo.chunks():
                destino.write(chunk)

        url = f'{settings.MEDIA_URL}{ADJUNTO_CARPETA}/{nombre_disco}'
        logger.info(
            "Adjunto guardado para Requerimiento %s: %s (IdImagen=%s)",
            req.codigo(), archivo.name, imagen.IdImagen
        )
        return JsonResponse({'ok': True, 'id_imagen': imagen.IdImagen, 'nombre': archivo.name, 'url': url})
    except Exception as e:
        logger.exception("Falló la subida del adjunto para el requerimiento %s", codigo)
        return JsonResponse({'ok': False, 'error': str(e)}, status=500)


# ────────────────────────── GESTIÓN DE USUARIOS ──────────────────────────

@login_required
@require_GET
def api_usuarios_req(request):
    search = request.GET.get('q', '').strip()
    page   = int(request.GET.get('page', 1))
    size   = int(request.GET.get('size', 10))

    qs = Usuario.objects.using(DB).filter(Estado=1).order_by('NombreCompleto')
    if search:
        qs = qs.filter(NombreCompleto__icontains=search) | \
             Usuario.objects.using(DB).filter(Estado=1, Cedula__icontains=search)

    total    = qs.count()
    usuarios = list(qs[(page-1)*size : page*size])

    cargo_ids  = [u.IdCargo     for u in usuarios if u.IdCargo]
    co_ids     = [u.IdCO        for u in usuarios if u.IdCO]
    tipo_ids   = [u.TipoUsuario for u in usuarios if u.TipoUsuario]
    cargos_map = {c.IdCargo: c.Descripcion       for c in Cargo.objects.using(DB).filter(IdCargo__in=cargo_ids)}
    cos_map    = {c.IdCo: c.Descripcion          for c in CentroOperacion.objects.using(DB).filter(IdCo__in=co_ids)}
    tipos_map  = {t.idTipoUsuario: t.Descripcion for t in TipoUsuario.objects.using(DB).filter(idTipoUsuario__in=tipo_ids)}

    data = [{
        'id':              u.IdUsuario,
        'cedula': str(u.Cedula),
        'nombre':          u.NombreCompleto,
        'cargo':           cargos_map.get(u.IdCargo, ''),
        'co':              cos_map.get(u.IdCO, ''),
        'correo':          u.Email or '',
        'fecha':           u.FechaCreacion.strftime('%Y-%m-%d') if u.FechaCreacion else '',
        'tipo_usuario':    tipos_map.get(u.TipoUsuario, '') if u.TipoUsuario else '',
        'tipo_usuario_id': u.TipoUsuario or '',
    } for u in usuarios]

    return JsonResponse({'ok': True, 'total': total, 'page': page, 'size': size, 'results': data})


@login_required
@csrf_exempt
@require_POST
def api_usuario_req_crear(request):
    try:
        body     = json.loads(request.body)
        cedula   = body.get('cedula', '').strip()
        nombre   = body.get('nombre', '').strip()
        correo   = body.get('correo', '').strip()
        password = body.get('password', '').strip()
        tipo     = body.get('tipo_usuario') or None
        co_id    = body.get('co_id') or None
        cargo_id = body.get('cargo_id') or None

        if not cedula or not nombre or not password:
            return JsonResponse({'ok': False, 'error': 'Cédula, nombre y contraseña son requeridos'}, status=400)
        if not tipo:
            return JsonResponse({'ok': False, 'error': 'El tipo de usuario es requerido'}, status=400)
        if Usuario.objects.using(DB).filter(Cedula=cedula).exists():
            return JsonResponse({'ok': False, 'error': 'Ya existe un usuario con esa cédula'}, status=400)

        co_id    = body.get('co_id') or None
        cargo_id = body.get('cargo_id') or None
        u = Usuario(
                Cedula         = cedula,
                NombreCompleto = nombre,
                Email          = correo,
                Contrasena     = make_password(password),
                TipoUsuario    = tipo,
                IdCO           = co_id,
                IdCargo        = cargo_id,
                FechaCreacion  = datetime.datetime.now(),
                Estado         = 1,
            )
        u.save(using=DB)
        return JsonResponse({'ok': True, 'id': u.IdUsuario})
    except Exception as e:
        return JsonResponse({'ok': False, 'error': str(e)}, status=500)


@login_required
@csrf_exempt
@require_POST
def api_usuario_req_editar(request, pk):
    try:
        u    = Usuario.objects.using(DB).get(IdUsuario=pk)
        body = json.loads(request.body)
        if body.get('nombre'):       u.NombreCompleto = body['nombre']
        if body.get('correo'):       u.Email          = body['correo']
        if body.get('tipo_usuario'): u.TipoUsuario    = body['tipo_usuario']
        if body.get('password'):     u.Contrasena     = make_password(body['password'])
        if body.get('co_id'):        u.IdCO           = body['co_id']
        if body.get('cargo_id'):     u.IdCargo        = body['cargo_id']
        u.save(using=DB)
        return JsonResponse({'ok': True})
    except Usuario.DoesNotExist:
        return JsonResponse({'ok': False, 'error': 'Usuario no encontrado'}, status=404)
    except Exception as e:
        return JsonResponse({'ok': False, 'error': str(e)}, status=500)


@login_required
@csrf_exempt
@require_POST
def api_usuario_req_eliminar(request, pk):
    try:
        u        = Usuario.objects.using(DB).get(IdUsuario=pk)
        u.Estado = 0   # baja lógica
        u.save(using=DB)
        return JsonResponse({'ok': True})
    except Usuario.DoesNotExist:
        return JsonResponse({'ok': False, 'error': 'Usuario no encontrado'}, status=404)
    except Exception as e:
        return JsonResponse({'ok': False, 'error': str(e)}, status=500)


@login_required
@require_GET
def api_req_tipos_usuario(request):
    tipos = TipoUsuario.objects.using(DB).order_by('Descripcion')
    data = [{'id': t.idTipoUsuario, 'nombre': t.Descripcion} for t in tipos]
    return JsonResponse({'ok': True, 'results': data})

# ────────────────────────── SEGUIMIENTO PÚBLICO (link del correo) ──────────────────────────

ESTADOS_PUBLICO = {
    1: 'Abierto', 2: 'Asignado', 3: 'En Proceso', 4: 'Cerrado',
    5: 'Eliminado', 6: 'Calificado', 7: 'Pendiente Aprobación', 8: 'Rechazado',
}


def seguimiento_publico(request):
    """
    Página pública (sin login, sin cédula) que abre desde el link de los
    correos de confirmación / aprobado / rechazado.
    Solo renderiza el cascarón; el contenido lo carga el JS con la API de abajo.
    """
    codigo = request.GET.get('codigo', '').strip()
    token  = request.GET.get('t', '').strip()
    return render(request, 'requerimientos/seguimiento_publico.html', {
        'codigo': codigo,
        'token': token,
    })


@require_GET
def api_seguimiento_publico(request):
    """
    Devuelve el detalle de UN requerimiento, sin cédula, validando el token
    calculado en _token_seguimiento. Mismo shape de datos que usa el modal
    en requerimientos.html (para reusar buildTripSteps/estBadge tal cual).
    """
    codigo = request.GET.get('codigo', '').strip()
    token  = request.GET.get('t', '').strip()

    if not codigo or not token:
        return JsonResponse({'ok': False, 'error': 'Link inválido.'}, status=400)

    try:
        pk = int(codigo.replace('REQ-', '').lstrip('0') or '0')
        req = Requerimiento.objects.using(DB).get(pk=pk)
    except (Requerimiento.DoesNotExist, ValueError):
        return JsonResponse({'ok': False, 'error': 'Requerimiento no encontrado.'}, status=404)

    if token != _token_seguimiento(req):
        return JsonResponse({'ok': False, 'error': 'Link inválido o vencido.'}, status=403)

    categoria_txt = ''
    if req.IdCategoria:
        try:
            categoria_txt = Categoria.objects.using(DB).get(IdCategoria=req.IdCategoria).Descripcion
        except Categoria.DoesNotExist:
            pass

    evaluacion = EvaluacionReq.objects.using(DB).filter(IdReq=req.Codigo).first()

    data = {
        'codigo':              req.codigo(),
        'fecha_creacion':      str(req.Fecha) if req.Fecha else '',
        'requerimiento':       req.Requerimiento or '',
        'area':                categoria_txt,
        'responsable':         req.NombreUsuariAsig or '',
        'plan_accion':         req.PlanAccion or '',
        'solucion':            req.Solucion or '',
        'fecha_solucion':      str(req.FechaRealSoluci) if req.FechaRealSoluci else '',
        'estado':              ESTADOS_PUBLICO.get(req.IdEstado, str(req.IdEstado or '')),
        'requiere_aprobacion': bool(req.IdJefeArea),
        'fecha_aprobacion':    str(req.FechaAprobacion) if req.FechaAprobacion else '',
        'calificacion':        evaluacion.Evaluacion if evaluacion else None,
        'comentario_evaluacion': evaluacion.Comentario if evaluacion else '',
    }
    return JsonResponse({'ok': True, 'data': data})


# ────────────────────────── NOTIFICACIONES (campanita) ──────────────────────────

# Estados en los que un requerimiento sigue "vivo" y por lo tanto puede
# considerarse vencido si ya pasó su FechaEstiSoluci.
ESTADOS_VENCIMIENTO_ACTIVO = [1, 2, 3, 7]  # Abierto, Asignado, En Proceso, Pendiente Aprobación


@require_GET
def mis_notificaciones(request):
    """
    Todo lo que debe verse en la campanita para un usuario, en un solo viaje:
      - notificaciones reales guardadas en BD (asignado/aprobado/rechazado/solucionado)
      - requerimientos solucionados sin calificar (estos además bloquean crear uno nuevo)
      - requerimientos vencidos por SLA (ya pasó FechaEstiSoluci y sigue abierto)
    """
    cedula = request.GET.get('cedula', '').strip()
    if not cedula:
        return JsonResponse({'ok': False, 'error': 'Cédula requerida.'}, status=400)

    notifs = list(
        Notificacion.objects
        .using(DB)
        .filter(CedulaUsuario=cedula)
        .order_by('Leida', '-FechaCreacion')[:30]
    )
    data_notifs = [{
        'id':     n.IdNotificacion,
        'tipo':   n.Tipo,
        'codigo': f'REQ-{n.Codigo:04d}' if n.Codigo else None,
        'titulo': n.Titulo,
        'mensaje': n.Mensaje,
        'leida':  n.Leida,
        'fecha':  n.FechaCreacion.strftime('%d/%m/%Y %H:%M') if n.FechaCreacion else '',
    } for n in notifs]

    hoy = datetime.date.today()
    vencidos = list(
        Requerimiento.objects
        .using(DB)
        .filter(CedulaUsuario=cedula, IdEstado__in=ESTADOS_VENCIMIENTO_ACTIVO, FechaEstiSoluci__lt=hoy)
    )
    data_vencidos = [{'codigo': r.codigo(), 'fecha_estimada': r.FechaEstiSoluci.strftime('%d/%m/%Y') if r.FechaEstiSoluci else ''} for r in vencidos]

    pendientes_calificar = list(
        Requerimiento.objects.using(DB).filter(
            CedulaUsuario=cedula, IdEstado=4,
            FechaRealSoluci__gte=FECHA_INICIO_PENDIENTES_CALIFICAR)
    )
    data_pendientes = [r.codigo() for r in pendientes_calificar]

    no_leidas     = sum(1 for n in notifs if not n.Leida)
    total_alertas = no_leidas + len(data_vencidos) + len(data_pendientes)

    return JsonResponse({
        'ok': True,
        'notificaciones':       data_notifs,
        'vencidos':             data_vencidos,
        'pendientes_calificar': data_pendientes,
        'total_alertas':        total_alertas,
    })


@csrf_exempt
@require_POST
def marcar_notificacion_leida(request, pk):
    try:
        n = Notificacion.objects.using(DB).get(IdNotificacion=pk)
        n.Leida = True
        n.save(using=DB)
        return JsonResponse({'ok': True})
    except Notificacion.DoesNotExist:
        return JsonResponse({'ok': False, 'error': 'Notificación no encontrada.'}, status=404)
    except Exception as e:
        return JsonResponse({'ok': False, 'error': str(e)}, status=500)


@csrf_exempt
@require_POST
def marcar_notificaciones_leidas(request):
    """Marca como leídas TODAS las notificaciones de un usuario (se usa al
    abrir el panel de la campanita)."""
    try:
        data   = json.loads(request.body)
        cedula = str(data.get('cedula', '')).strip()
        if not cedula:
            return JsonResponse({'ok': False, 'error': 'Cédula requerida.'}, status=400)
        Notificacion.objects.using(DB).filter(CedulaUsuario=cedula, Leida=False).update(Leida=True)
        return JsonResponse({'ok': True})
    except Exception as e:
        return JsonResponse({'ok': False, 'error': str(e)}, status=500)


# ────────────────────────── MICROSOFT TEAMS — botón de ayuda ──────────────────────────
# Presencia en vivo (Disponible/Ocupado/Ausente/Desconectado) del contacto
# de soporte configurado en TEAMS_SUPPORT_EMAIL, para el botón "¿Necesitas
# ayuda?" del portal. Se autentica contra Microsoft Graph con un token de
# APLICACIÓN (client_credentials) — no depende de que el visitante inicie
# sesión con ninguna cuenta. Requiere permiso Presence.Read.All (aplicación,
# con consentimiento de administrador) en el registro de Azure AD.

_teams_token_cache = {'token': None, 'expira': 0}

# Traducción de los estados de presencia de Teams a español + color, con el
# mismo lenguaje visual (verde/rojo/amarillo/gris) que usa Teams.
TEAMS_ESTADOS = {
    'Available':       ('Disponible',            'green'),
    'AvailableIdle':    ('Disponible (inactivo)', 'green'),
    'Busy':             ('Ocupado',               'red'),
    'BusyIdle':         ('Ocupado (inactivo)',    'red'),
    'DoNotDisturb':     ('No molestar',           'red'),
    'BeRightBack':      ('Vuelvo enseguida',      'yellow'),
    'Away':             ('Ausente',               'yellow'),
    'Offline':          ('Desconectado',          'gray'),
    'PresenceUnknown':  ('Desconocido',           'gray'),
}


def _obtener_token_graph():
    """Token de aplicación para Microsoft Graph, cacheado en memoria del
    proceso hasta 5 minutos antes de vencer (normalmente dura 1 hora)."""
    ahora = time.time()
    if _teams_token_cache['token'] and ahora < _teams_token_cache['expira']:
        return _teams_token_cache['token']

    if not (settings.TEAMS_TENANT_ID and settings.TEAMS_CLIENT_ID and settings.TEAMS_CLIENT_SECRET):
        raise RuntimeError('Microsoft Teams no está configurado (faltan TEAMS_TENANT_ID/CLIENT_ID/CLIENT_SECRET).')

    resp = requests.post(
        f'https://login.microsoftonline.com/{settings.TEAMS_TENANT_ID}/oauth2/v2.0/token',
        data={
            'client_id':     settings.TEAMS_CLIENT_ID,
            'client_secret': settings.TEAMS_CLIENT_SECRET,
            'scope':         'https://graph.microsoft.com/.default',
            'grant_type':    'client_credentials',
        },
        timeout=10,
    )
    resp.raise_for_status()
    data  = resp.json()
    token = data['access_token']
    _teams_token_cache['token']  = token
    _teams_token_cache['expira'] = ahora + data.get('expires_in', 3600) - 300  # 5 min de margen
    return token


_agente_nombre_cache = {'nombre': None, 'expira': 0}


def _obtener_nombre_agente(correo, token):
    """Nombre para mostrar del agente de soporte, cacheado en memoria del
    proceso 1 hora (cambia muy rara vez, no vale la pena consultarlo en
    cada poll de presencia)."""
    ahora = time.time()
    if _agente_nombre_cache['nombre'] is not None and ahora < _agente_nombre_cache['expira']:
        return _agente_nombre_cache['nombre']

    nombre = ''
    try:
        resp = requests.get(
            f'https://graph.microsoft.com/v1.0/users/{correo}',
            headers={'Authorization': f'Bearer {token}'},
            params={'$select': 'displayName'},
            timeout=10,
        )
        resp.raise_for_status()
        nombre = resp.json().get('displayName', '') or ''
    except Exception:
        logger.exception('No se pudo consultar el nombre del agente de Teams para %s', correo)

    _agente_nombre_cache['nombre'] = nombre
    _agente_nombre_cache['expira'] = ahora + 3600
    return nombre


@require_GET
def api_teams_presence(request):
    """
    Presencia en tiempo real del contacto de soporte. Si Teams no está
    configurado todavía, o falla la consulta (token, permisos, red), NUNCA
    rompe la página — responde 'Desconocido' y el botón de abrir chat en
    Teams sigue funcionando igual, solo sin el indicador de estado.
    """
    correo = settings.TEAMS_SUPPORT_EMAIL
    if not correo:
        return JsonResponse({'ok': True, 'estado': 'Desconocido', 'color': 'gray', 'correo': '', 'nombre': ''})

    try:
        token = _obtener_token_graph()
        resp = requests.get(
            f'https://graph.microsoft.com/v1.0/users/{correo}/presence',
            headers={'Authorization': f'Bearer {token}'},
            timeout=10,
        )
        resp.raise_for_status()
        disponibilidad = resp.json().get('availability', 'PresenceUnknown')
        etiqueta, color = TEAMS_ESTADOS.get(disponibilidad, ('Desconocido', 'gray'))
        nombre = _obtener_nombre_agente(correo, token)
        return JsonResponse({'ok': True, 'estado': etiqueta, 'color': color, 'correo': correo, 'nombre': nombre})
    except Exception:
        logger.exception('No se pudo consultar la presencia de Teams para %s', correo)
        return JsonResponse({'ok': True, 'estado': 'Desconocido', 'color': 'gray', 'correo': correo, 'nombre': ''})


@require_GET
def api_teams_agente_foto(request):
    """
    Foto de perfil (Microsoft 365) del agente de soporte, servida como
    proxy — el navegador nunca ve el token de Graph. Si el agente no tiene
    foto configurada, o falla la consulta, responde 404 y el frontend
    simplemente no muestra imagen (queda el círculo vacío).
    """
    correo = settings.TEAMS_SUPPORT_EMAIL
    if not correo:
        return HttpResponse(status=404)
    try:
        token = _obtener_token_graph()
        resp = requests.get(
            f'https://graph.microsoft.com/v1.0/users/{correo}/photo/$value',
            headers={'Authorization': f'Bearer {token}'},
            timeout=10,
        )
        if resp.status_code != 200:
            logger.warning(
                'Graph rechazó la foto del agente de Teams (%s): status=%s body=%s',
                correo, resp.status_code, resp.text[:500],
            )
            return HttpResponse(status=404)
        return HttpResponse(resp.content, content_type=resp.headers.get('Content-Type', 'image/jpeg'))
    except Exception:
        logger.exception('No se pudo consultar la foto del agente de Teams para %s', correo)
        return HttpResponse(status=404)