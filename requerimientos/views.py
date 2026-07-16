import json, uuid, unicodedata, datetime, logging
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.http import require_POST, require_GET
from django.views.decorators.csrf import csrf_exempt
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.contrib.auth.hashers import make_password
from .models import (
    Usuario, Requerimiento, Categoria, SubCategoria, CentroOperacion,
    Cargo, TipoUsuario, Area, Prioridad, Clasificacion, EvaluacionReq, TipoRequerimiento
)

DB = 'requerimientos'

logger = logging.getLogger('requerimientos')


PREFIJO_APP = '/SYSTRACK'

ID_TIPO_REQ_SISTEMAS = 4  # Requerimiento Sistemas — único tipo que usa este formulario

# Categoría bajo la cual viven las subcategorías que exigen aprobación.
CATEGORIA_SOPORTE_EXTERNO = 'soporte tecnico externo'

# Subcategorías (dentro de esa categoría) que exigen aprobación del jefe de área.
SUBCATEGORIAS_REQUIEREN_APROBACION = ['compras']


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
    })


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
            'fecha_creacion':  str(r.Fecha) if r.Fecha else '',
            'requerimiento':   r.Requerimiento or '',
            'area':            categoria_map.get(r.IdCategoria, ''),
            'subcategoria':    subcategoria_map.get(r.IdSubCategoria, ''),
            'prioridad':       prioridad_map.get(r.IdPrioridad, ''),
            'vencimiento':     str(r.FechaEstiSoluci) if r.FechaEstiSoluci else '',
            'responsable':     r.NombreUsuariAsig or '',
            'plan_accion':     r.PlanAccion or '',
            'solucion':        r.Solucion or '',
            'fecha_solucion':  str(r.FechaRealSoluci) if r.FechaRealSoluci else '',
            'clasificacion':   clasif_map.get(r.Clasificacion, ''),
            'evaluacion':      evaluacion_map.get(r.Codigo, None),
            'estado':          ESTADOS.get(r.IdEstado, str(r.IdEstado or '')),
            'requiere_aprobacion': bool(r.IdJefeArea),
            'fecha_aprobacion':    str(r.FechaAprobacion) if r.FechaAprobacion else '',
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

        try:
            usuario = Usuario.objects.using(DB).get(Cedula=cedula, Estado=1)
        except Usuario.DoesNotExist:
            return JsonResponse({'ok': False, 'error': 'Cédula no registrada.'}, status=403)

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

        # ── Resolver IdPrioridad (la columna no admite NULL) ──────────────
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

        # ── Validación de aprobación por jefe de área ─────────────────────
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
                id_jefe_us = jefe_usr.IdUsuario if jefe_usr else None

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
            CO               = data.get('co_texto', ''),
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
    link_seguimiento = f"{base_url}{PREFIJO_APP}/requerimiento/?seg={req.codigo()}"

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
    return render(request, 'requerimientos/aprobacion_resultado.html', {'accion': 'rechazado', 'req': req})


@csrf_exempt
@require_POST
def calificar_requerimiento(request):
    try:
        data   = json.loads(request.body)
        codigo = str(data.get('codigo', '')).strip()
        cal    = int(data.get('calificacion', 0))

        if not (1 <= cal <= 5):
            return JsonResponse({'ok': False, 'error': 'Calificación debe ser 1-5.'})

        pk  = int(codigo.replace('REQ-', ''))
        req = Requerimiento.objects.using(DB).get(pk=pk)

        if req.IdEstado != 4:
            return JsonResponse({'ok': False, 'error': 'Solo puedes calificar requerimientos cerrados.'})

        ev, created = EvaluacionReq.objects.using(DB).get_or_create(
            IdReq=pk, defaults={'Evaluacion': cal}
        )
        if not created:
            ev.Evaluacion = cal
            ev.save(using=DB)

        return JsonResponse({'ok': True})

    except Requerimiento.DoesNotExist:
        return JsonResponse({'ok': False, 'error': 'Requerimiento no encontrado.'}, status=404)
    except Exception as e:
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