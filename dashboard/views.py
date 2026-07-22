"""
views.py — SYSTRAKER
APIs REST para el dashboard de inventario.
Todas las respuestas son JSON para consumo del frontend.
"""

import json
from django.http import JsonResponse
from requerimientos.models import Usuario,CentroOperacion,Cargo,TipoUsuario,Requerimiento

from django.views.decorators.http import require_GET,require_POST
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render, get_object_or_404
from django.db import transaction
from django.db.models import Count, Q ,F
from django.utils import timezone
from django.contrib.auth.decorators import login_required
from .models import (
    TipoDispositivo, Estado, Marca, Propietario, Departamento,
    Municipio, TipoDocumento, CentroOperaciones, Antivirus, Procesador,
    SistemaOperativo, LicenciaOffice, Opciones, Almacenamiento,
    TipoNovedad, Operador, Dispositivo, CaracteristicaPC,
    CaracteristicaMovil, CaracteristicaPantalla, CaracteristicaImpresora,
    CaracteristicaPeriferico, CaracteristicaLicencia,
    DispositivoInactivo, HistorialEquipo, Colaborador,
    AsignacionColaborador, Acta, CentroCosto, TipoImpresora,
    RAM, TipoDisco ,CaracteristicasVideoBeam
)
import base64
import os
from django.conf import settings

# ─────────────────────────────────────────────────────────────
#  UTILIDADES — Generación PDF y envío de correo del Acta
# ─────────────────────────────────────────────────────────────
import smtplib
import threading
from email.mime.multipart import MIMEMultipart
from email.mime.text       import MIMEText
from email.mime.base       import MIMEBase
from email                 import encoders
from xhtml2pdf import pisa
from io import BytesIO


# VISTA PRINCIPAL  Renderiza el dashboard HTML
@login_required(login_url='login')
def dashboard(request):
   
    return render(request, 'dashboard/dashboard.html')


# ─────────────────────────────────────────────────────
# UTILIDADES
# ─────────────────────────────────────────────────────
def _json_ok(data):
    return JsonResponse({'ok': True, 'data': data})

def _json_err(msg, status=400):
    return JsonResponse({'ok': False, 'error': msg}, status=status)


# ═══════════════════════════════════════════════════
#  CATÁLOGOS — GET para poblar los <select> del HTML
# ═══════════════════════════════════════════════════
@login_required(login_url='login')
@require_http_methods(['GET'])
def api_catalogos(request):
    """
    Retorna todos los catálogos necesarios para poblar los
    <select> del formulario de inventario y demás modales.
    Un solo endpoint para reducir round-trips al cargar la página.
    """
    data = {
        # Catálogos básicos
        'tipos_dispositivo': list(
            TipoDispositivo.objects.filter(g200_estado=True)
            .values('g200_id', 'g200_tipo_dispositivo')
        ),
        'estados': list(
            Estado.objects.filter(g201_estado=True)
            .values('g201_id', 'g201_descripcion')
        ),
        'marcas': list(
            Marca.objects.filter(g202_estado=True)
            .values('g202_id', 'g202_marca')
        ),
        'propietarios': list(
            Propietario.objects.filter(g203_estado=True)
            .values('g203_id', 'g203_propietario', 'g203_documento')
        ),
        'departamentos': list(
            Departamento.objects.filter(g204_estado=True)
            .values('g204_id', 'g204_departamento')
        ),
        'centros_costo': list(
            CentroCosto.objects.filter(g228_estado=True)
            .values('g228_id', 'g228_nombre')
        ),
        'centros_operaciones': list(
            CentroOperaciones.objects.filter(g207_estado=True)
            .values('g207_id', 'g207_co', 'g207_descripcion_co')
        ),
        'tipos_novedad': list(
            TipoNovedad.objects.filter(g220_estado=True)
            .values('g220_id', 'g220_novedad')
        ),
        'tipos_documento': list(
            TipoDocumento.objects.filter(g206_estado=True)
            .values('g206_id', 'g206_tipo_documento')
        ),

        # Catálogos de características PC
        'antivirus': list(
            Antivirus.objects.filter(g208_estado=True)
            .values('g208_id', 'g208_antivirus')
        ),
        'procesadores': list(
            Procesador.objects.filter(g209_estado=True)
            .values('g209_id', 'g209_procesador')
        ),
        'sistemas_operativos': list(
            SistemaOperativo.objects.filter(g210_estado=True)
            .values('g210_id', 'g210_so')
        ),
        'licencias_office': list(
            LicenciaOffice.objects.filter(g211_estado=True)
            .values('g211_id', 'g211_office')
        ),
        'opciones': list(
            Opciones.objects.filter(g218_estado=True)
            .values('g218_id', 'g218_opciones')
        ),
        'almacenamientos': list(
            Almacenamiento.objects.filter(g219_estado=True)
            .values('g219_id', 'g219_almacenamiento')
        ),

        # Catálogos móviles
        'operadores': list(
            Operador.objects.filter(g221_estado=True)
            .values('g221_id', 'g221_operador')
        ),
        'tipos_impresora':list(
          TipoImpresora.objects.filter(g229_estado=True).
          values('g229_id','g229_tipo_impresora')  
        ),
        'rams': list(
            RAM.objects.filter(g230_estado=True)
            .values('g230_id', 'g230_ram')
        ),
        'tipos_disco': list(
            TipoDisco.objects.filter(g231_estado=True)
            .values('g231_id', 'g231_tipo_disco')
        ),



        
    }
    return _json_ok(data)

@login_required(login_url='login')
@require_http_methods(['GET'])
def api_municipios_por_dpto(request, dpto_id):
    """Retorna los municipios de un departamento específico."""
    municipios = list(
        Municipio.objects.filter(
            g205_departamento_id=dpto_id,
            g205_estado=True
        ).values('g205_id', 'g205_municipio')
    )
    return _json_ok(municipios)


# ═══════════════════════════════════════════════════
#  INVENTARIO — DISPOSITIVOS ACTIVOS
# ═══════════════════════════════════════════════════
@login_required(login_url='login')
@require_http_methods(['GET'])
def api_dispositivos(request):
    """
    Lista de dispositivos activos con filtros opcionales:
      ?q=       búsqueda libre (serial, propietario, marca)
      ?tipo=    id del TipoDispositivo
      ?estado=  id del Estado
    """
    qs = Dispositivo.objects.select_related(
        'g212_tipo', 'g212_marca', 'g212_propietario',
        'g212_estado', 'g212_co', 'g212_departamento', 'g212_municipio'
    )

    q = request.GET.get('q', '').strip()
    if q:
        qs = qs.filter(
            Q(g212_serial__icontains=q) |
            Q(g212_propietario__g203_propietario__icontains=q) |
            Q(g212_marca__g202_marca__icontains=q)
        )

    tipo_id = request.GET.get('tipo')
    if tipo_id:
        qs = qs.filter(g212_tipo_id=tipo_id)

    estado_id = request.GET.get('estado')
    if estado_id:
        qs = qs.filter(g212_estado_id=estado_id)

    # Excluir dispositivos ya asignados a OTROS colaboradores.
    # Si se pasa ?colaborador_id=X se permite mostrar también los ya asignados
    # al propio colaborador X (para que el modal no los oculte).
    if request.GET.get('solo_disponibles'):
        colaborador_id = request.GET.get('colaborador_id')
        ya_asignados_qs = AsignacionColaborador.objects.values_list('g216_dispositivo_id', flat=True)
        if colaborador_id:
            # Excluir solo los asignados a OTROS colaboradores distintos a este
            ya_asignados_qs = ya_asignados_qs.exclude(g216_colaborador_id=colaborador_id)
        qs = qs.exclude(g212_id__in=ya_asignados_qs)

    dispositivos = []
    for d in qs.order_by('g212_serial'):
        dispositivos.append({
            'id':          d.g212_id,
            'serial':      d.g212_serial,
            'tipo':        d.g212_tipo.g200_tipo_dispositivo if d.g212_tipo else '—',
            'tipo_id':     d.g212_tipo_id,
            'marca':       d.g212_marca.g202_marca if d.g212_marca else '—',
            'marca_id':    d.g212_marca_id,
            'propietario': d.g212_propietario.g203_propietario if d.g212_propietario else '—',
            'propietario_id': d.g212_propietario_id,
            'estado':      d.g212_estado.g201_descripcion if d.g212_estado else '—',
            'estado_id':   d.g212_estado_id,
            'co':          f"{d.g212_co.g207_co} — {d.g212_co.g207_descripcion_co}" if d.g212_co else '—',
            'co_id':       d.g212_co_id,
            'nombre_equipo': d.g212_nombre_equipo or '—',
            'valor_promedio':      str(d.g212_valor_promedio) if d.g212_valor_promedio else None,
            'valor_arrendamiento': str(d.g212_valor_arrendamiento) if d.g212_valor_arrendamiento else None,
            'departamento':    d.g212_departamento.g204_departamento if d.g212_departamento else '—',
            'departamento_id': d.g212_departamento_id,
            'municipio':       d.g212_municipio.g205_municipio if d.g212_municipio else '—',
            'municipio_id':    d.g212_municipio_id,
            'observaciones':   d.g212_observaciones or '',
            'fecha_registro':  d.g212_fecha_registro.strftime('%d/%m/%Y %H:%M'),
        })

    # Estadísticas rápidas: total + conteo por CADA estado existente
    total = Dispositivo.objects.count()
    estados_conteo = list(
        Dispositivo.objects
        .values('g212_estado__g201_descripcion')
        .annotate(cantidad=Count('g212_id'))
        .order_by('g212_estado__g201_descripcion')
    )
    stats = {
        'total': total,
        'por_estado': [
            {
                'estado': row['g212_estado__g201_descripcion'] or 'SIN ESTADO',
                'cantidad': row['cantidad'],
            }
            for row in estados_conteo
        ],
    }

    return _json_ok({'dispositivos': dispositivos, 'stats': stats})

@login_required(login_url='login')
@require_http_methods(['GET'])
def api_dispositivo_detalle(request, pk):
    """Detalle completo de un dispositivo incluyendo sus características."""
    d = get_object_or_404(
        Dispositivo.objects.select_related(
            'g212_tipo', 'g212_marca', 'g212_propietario',
            'g212_estado', 'g212_co', 'g212_departamento', 'g212_municipio'
        ),
        pk=pk
    )
    data = {
        'id':          d.g212_id,
        'serial':      d.g212_serial,
        'tipo':        d.g212_tipo.g200_tipo_dispositivo if d.g212_tipo else '—',
        'tipo_id':     d.g212_tipo_id,
        'marca':       d.g212_marca.g202_marca if d.g212_marca else '—',
        'marca_id':    d.g212_marca_id,

        'propietario': d.g212_propietario.g203_propietario if d.g212_propietario else '—',
        'propietario_id': d.g212_propietario_id,
        'estado':      d.g212_estado.g201_descripcion if d.g212_estado else '—',
        'estado_id':   d.g212_estado_id,
        'co':          f"{d.g212_co.g207_co} — {d.g212_co.g207_descripcion_co}" if d.g212_co else '—',
        'co_id':       d.g212_co_id,
        'nombre_equipo': d.g212_nombre_equipo or '',
        'valor_promedio':      str(d.g212_valor_promedio) if d.g212_valor_promedio else '',
        'valor_arrendamiento': str(d.g212_valor_arrendamiento) if d.g212_valor_arrendamiento else '',
        'departamento_id': d.g212_departamento_id,
        'municipio_id':    d.g212_municipio_id,
        'observaciones':   d.g212_observaciones or '',
        'departamento':    d.g212_departamento.g204_departamento if d.g212_departamento else '—',
        'municipio':       d.g212_municipio.g205_municipio if d.g212_municipio else '—',
        'caracteristicas': _get_caracteristicas(d),
        'asignado_a':  AsignacionColaborador.objects.filter(g216_dispositivo=d).select_related('g216_colaborador').first().__class__ and (lambda a: a.g216_colaborador.g215_nombre if a else None)(AsignacionColaborador.objects.filter(g216_dispositivo=d).select_related('g216_colaborador').first()),
    }
    return _json_ok(data)


def _get_caracteristicas(d):
    """Retorna las características específicas según el tipo de dispositivo."""
    tipo = d.g212_tipo.g200_tipo_dispositivo if d.g212_tipo else ''

    if tipo in ('TORRE DE ESCRITORIO', 'PORTATIL'):
        try:
            pc = d.caract_pc
            return {
                'grupo': 'pc',
                'procesador_id':    pc.g222_procesador_id,
                'so_id':            pc.g222_so_id,
                'antivirus_id':     pc.g222_antivirus_id,
                'licencia_id':      pc.g222_licencia_id,
                'correo_office':    pc.g222_correo_office or '',
                'key_office':       pc.g222_key_office or '',
                'ram':              pc.g222_ram,
                'tipo_disco_id':    pc.g222_tipo_disco_id,
                'almacenamiento_id': pc.g222_almacenamiento_id,
                'activo':           pc.g222_activo or '',
                'pulgadas':         str(pc.g222_pulgadas) if pc.g222_pulgadas else '',
            }
        except Exception:
            return {'grupo': 'pc'}

    elif tipo in ('CELULAR', 'TABLET', 'MODEM WIFI', 'SIMCARD', 'TELEFONO FIJO'):
        try:
            mov = d.caract_movil
            return {
                'grupo':            'movil',
                'numero_linea':     mov.g223_numero_linea or '',
                'operador_id':      mov.g223_operador_id,
                'operador':         mov.g223_operador.g221_operador if mov.g223_operador else '',
                'plan_datos':       mov.g223_plan_datos or '',
                'imei1':            mov.g223_imei1 or '',
                'imei2':            mov.g223_imei2 or '',
                'cuenta_gmail':     mov.g223_cuenta_gmail or '',
                'contrasena_gmail': mov.g223_contrasena_gmail or '',
                'pulgadas':         str(mov.g223_pulgadas) if mov.g223_pulgadas else '',
                'almacenamiento_id':  mov.g223_almacenamiento_id,
                'almacenamiento':     mov.g223_almacenamiento.g219_almacenamiento if mov.g223_almacenamiento else '',
                'valor_promedio':     str(d.g212_valor_promedio) if d.g212_valor_promedio else '',
                'valor_arrendamiento': str(d.g212_valor_arrendamiento) if d.g212_valor_arrendamiento else '',
            }
        except Exception:
            return {'grupo': 'movil'}

    elif tipo == 'PANTALLA':
        try:
            pan = d.caract_pantalla
            return {
                'grupo':     'pantalla',
                'pulgadas':  str(pan.g224_pulgadas) if pan.g224_pulgadas else '',
                'resolucion': pan.g224_resolucion or '',
            }
        except Exception:
            return {'grupo': 'pantalla'}

    elif tipo == 'IMPRESORA':
        try:
            imp = d.caract_impresora
            return {
                'grupo':            'impresora',
                'tipo_impresora_id': imp.g225_tipo_impresora_id,
                'funcion':          imp.g225_funcion or '',
            }
        except Exception:
            return {'grupo': 'impresora'}

    elif tipo == 'PERIFERICO':
        try:
            per = d.caract_periferico
            return {
                'grupo':              'periferico',
                'incluye_base':       per.g226_incluye_base,
                'incluye_teclado':    per.g226_incluye_teclado,
                'incluye_mouse':      per.g226_incluye_mouse,
                'incluye_auriculares': per.g226_incluye_auriculares,
                'incluye_cargador':   per.g226_incluye_cargador,
                'descripcion_adicional': per.g226_descripcion_adicional or '',
            }
        except Exception:
            return {'grupo': 'periferico'}

    elif tipo == 'LICENCIA OFFICE':
        try:
            lic = d.caract_licencia
            return {
                'grupo':    'licencia',
                'software': lic.g227_software or '',
                'version':  lic.g227_version or '',
                'key':      lic.g227_key or '',
                'correo':   lic.g227_correo or '',
                'fecha_vencimiento': str(lic.g227_fecha_vencimiento) if lic.g227_fecha_vencimiento else '',
            }
        except Exception:
            return {'grupo': 'licencia'}
        
        
    elif tipo== 'VIDEO BEAM':
        try:
            vb= d.caract_videobeam
            return{
                'grupo':            'videobeam',
                'lumenes':          str(vb.g232_lumenes) if vb.g232_lumenes else '',
                
                
                }
        except Exception:
            return {'grupo': 'videobeam'}
    return {}


@login_required(login_url='login')
@require_http_methods(['GET'])
def api_verificar_serial(request):
    serial = request.GET.get('serial', '').strip()
    if not serial:
        return _json_err('Serial requerido', 400)
    d = Dispositivo.objects.filter(g212_serial=serial).first()
    if not d:
        return _json_ok({'existe': False, 'asignado_a': None})
    asig = AsignacionColaborador.objects.filter(
        g216_dispositivo=d
    ).select_related('g216_colaborador').first()
    return _json_ok({
        'existe':         True,
        'asignado_a':     asig.g216_colaborador.g215_nombre if asig else None,
        'colaborador_id': asig.g216_colaborador.g215_id if asig else None,
    })


@login_required(login_url='login')
@require_http_methods(['POST'])
def api_dispositivo_crear(request):
    """Crea un nuevo dispositivo con sus características."""
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return _json_err('JSON inválido')

    required = ['tipo_id', 'propietario_id', 'co_id', 'estado_id',
                'departamento_id', 'municipio_id']
    for field in required:
        if not body.get(field):
            return _json_err(f'Campo requerido: {field}')

    try:
        with transaction.atomic():
            # Generar serial automático si no viene
            serial = body.get('serial', '').strip()
            if not serial:
                ultimo = Dispositivo.objects.order_by('-g212_id').first()
                siguiente_id = (ultimo.g212_id + 1) if ultimo else 1
                serial = str(siguiente_id).zfill(5)

            d = Dispositivo.objects.create(
                g212_serial=serial,
                g212_tipo_id=body['tipo_id'],
                g212_marca_id=body.get('marca_id') or None,
                g212_propietario_id=body['propietario_id'],
                g212_estado_id=body['estado_id'],
                g212_co_id=body['co_id'],
                g212_nombre_equipo=body.get('nombre_equipo', ''),
                g212_valor_promedio=body.get('valor_promedio') or None,
                g212_valor_arrendamiento=body.get('valor_arrendamiento') or None,
                g212_departamento_id=body['departamento_id'],
                g212_municipio_id=body['municipio_id'],
                g212_observaciones=body.get('observaciones', ''),
            )
            _save_caracteristicas(d, body)

    except Exception as e:
        return _json_err(str(e))

    return _json_ok({'id': d.g212_id, 'serial': d.g212_serial})

@login_required(login_url='login')
@require_http_methods(['PUT'])
def api_dispositivo_editar(request, pk):
    """Edita un dispositivo existente."""
    d = get_object_or_404(Dispositivo, pk=pk)
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return _json_err('JSON inválido')

    try:
        with transaction.atomic():
            d.g212_serial = body.get('serial', d.g212_serial).strip()
            d.g212_tipo_id = body.get('tipo_id', d.g212_tipo_id)
            d.g212_marca_id = body.get('marca_id') or None
            d.g212_propietario_id = body.get('propietario_id', d.g212_propietario_id)
            d.g212_estado_id = body.get('estado_id', d.g212_estado_id)
            d.g212_co_id = body.get('co_id') or None
            d.g212_nombre_equipo = body.get('nombre_equipo', d.g212_nombre_equipo)
            d.g212_valor_promedio = body.get('valor_promedio') or None
            d.g212_valor_arrendamiento = body.get('valor_arrendamiento') or None
            d.g212_departamento_id = body.get('departamento_id') or None
            d.g212_municipio_id = body.get('municipio_id') or None
            d.g212_observaciones = body.get('observaciones', d.g212_observaciones)
            d.save()
            _save_caracteristicas(d, body)
    except Exception as e:
        return _json_err(str(e))

    return _json_ok({'id': d.g212_id, 'serial': d.g212_serial})


def _save_caracteristicas(d, body):
    """
    Guarda o actualiza las características según el grupo que venga en body['caract'].
    body['caract'] = {'grupo': 'pc'|'movil'|'pantalla'|..., ...campos}
    """
    caract = body.get('caract', {})
    grupo = caract.get('grupo')

    if grupo == 'pc':
        CaracteristicaPC.objects.update_or_create(
            g222_dispositivo=d,
            defaults={
                'g222_procesador_id':    caract.get('procesador_id') or None,
                'g222_so_id':            caract.get('so_id') or None,
                'g222_antivirus_id':     caract.get('antivirus_id') or None,
                'g222_licencia_id':      caract.get('licencia_id') or None,
                'g222_correo_office':    caract.get('correo_office', ''),
                'g222_key_office':       caract.get('key_office', ''),
                'g222_ram': caract.get('ram') or None,
                'g222_tipo_disco_id':    caract.get('tipo_disco_id') or None,
                'g222_almacenamiento_id': caract.get('almacenamiento_id') or None,
                'g222_activo':           caract.get('activo', ''),
                'g222_pulgadas':         caract.get('pulgadas') or None,
            }
        )

    elif grupo == 'movil':
        CaracteristicaMovil.objects.update_or_create(
            g223_dispositivo=d,
            defaults={
                'g223_numero_linea':   caract.get('numero_linea', ''),
                'g223_operador_id':    caract.get('operador_id') or None,
                'g223_plan_datos':     caract.get('plan_datos', ''),
                'g223_imei1':          caract.get('imei1', ''),
                'g223_imei2':          caract.get('imei2', ''),
                'g223_cuenta_gmail':   caract.get('cuenta_gmail', ''),
                'g223_contrasena_gmail': caract.get('contrasena_gmail', ''),
                'g223_pulgadas':       caract.get('pulgadas') or None,
                'g223_almacenamiento_id': caract.get('almacenamiento_id') or None,
            }
        )
        # Guardar valor_promedio y valor_arrendamiento si vienen en caract (MODEM, SIMCARD, TABLET)
        vp = caract.get('valor_promedio') or None
        va = caract.get('valor_arrendamiento') or None
        if vp is not None or va is not None:
            if vp is not None:
                d.g212_valor_promedio = vp
            if va is not None:
                d.g212_valor_arrendamiento = va
            d.save()

    elif grupo == 'pantalla':
        CaracteristicaPantalla.objects.update_or_create(
            g224_dispositivo=d,
            defaults={
                'g224_pulgadas':   caract.get('pulgadas') or None,
                'g224_resolucion': caract.get('resolucion', ''),
            }
        )
        # Guardar valor_promedio y valor_arrendamiento si vienen en caract (PANTALLA)
        vp = caract.get('valor_promedio') or None
        va = caract.get('valor_arrendamiento') or None
        if vp is not None or va is not None:
            if vp is not None:
                d.g212_valor_promedio = vp
            if va is not None:
                d.g212_valor_arrendamiento = va
            d.save()

    elif grupo == 'impresora':
        CaracteristicaImpresora.objects.update_or_create(
            g225_dispositivo=d,
            defaults={
                'g225_tipo_impresora_id': caract.get('tipo_impresora_id') or None,
                'g225_funcion':           caract.get('funcion', ''),
            }
        )

    elif grupo == 'periferico':
        CaracteristicaPeriferico.objects.update_or_create(
            g226_dispositivo=d,
            defaults={
                'g226_incluye_base':         caract.get('incluye_base', False),
                'g226_incluye_teclado':      caract.get('incluye_teclado', False),
                'g226_incluye_mouse':        caract.get('incluye_mouse', False),
                'g226_incluye_auriculares':  caract.get('incluye_auriculares', False),
                'g226_incluye_cargador':     caract.get('incluye_cargador', False),
                'g226_descripcion_adicional': caract.get('descripcion_adicional', ''),
            }
        )

    elif grupo == 'licencia':
        CaracteristicaLicencia.objects.update_or_create(
            g227_dispositivo=d,
            defaults={
                'g227_software': caract.get('software', ''),
                'g227_version':  caract.get('version', ''),
                'g227_key':      caract.get('key', ''),
                'g227_correo':   caract.get('correo', ''),
                'g227_fecha_vencimiento': caract.get('fecha_vencimiento') or None,
            }
        )
        
    elif grupo== 'videobeam':
        
        
        CaracteristicasVideoBeam.objects.update_or_create(
            g232_dispositivo=d,
            defaults={
                
                 'g232_lumenes':             caract.get('lumenes') or None,
                
            }
            
           
        )
        
        

@login_required(login_url='login')
@require_http_methods(['DELETE'])
def api_dispositivo_eliminar(request, pk):
    """Elimina un dispositivo permanentemente."""
    d = get_object_or_404(Dispositivo, pk=pk)
    serial = d.g212_serial
    d.delete()
    return _json_ok({'serial': serial})


# ═══════════════════════════════════════════════════
#  HISTORIAL DE EQUIPOS
# ═══════════════════════════════════════════════════
@login_required(login_url='login')
@require_http_methods(['GET'])
def api_historial(request):
    """
    Retorna historial filtrable por tipo y/o serial.
      ?tipo_id=  id del TipoDispositivo
      ?serial=   texto parcial del serial
    """
    qs = HistorialEquipo.objects.select_related(
    'g214_dispositivo__g212_tipo',
    'g214_dispositivo__g212_marca',
    'g214_dispositivo__g212_propietario',
    'g214_dispositivo__g212_estado',
    'g214_dispositivo__g212_co',
    'g214_novedad',
    'g214_co',
    ).order_by('-g214_fecha', '-g214_hora')

    tipo_id = request.GET.get('tipo_id')
    if tipo_id:
        qs = qs.filter(g214_dispositivo__g212_tipo_id=tipo_id)

    serial = request.GET.get('serial', '').strip()
    if serial:
        qs = qs.filter(g214_dispositivo__g212_serial__icontains=serial)

    registros = []
    for h in qs:
        registros.append({
            'id':          h.g214_id,
            'serial':      h.g214_dispositivo.g212_serial,
            'tipo':        h.g214_dispositivo.g212_tipo.g200_tipo_dispositivo if h.g214_dispositivo.g212_tipo else '—',
            'marca':       h.g214_dispositivo.g212_marca.g202_marca if h.g214_dispositivo.g212_marca else '—',   
            'propietario': h.g214_dispositivo.g212_propietario.g203_propietario if h.g214_dispositivo.g212_propietario else '—',
            'estado':      h.g214_dispositivo.g212_estado.g201_descripcion if h.g214_dispositivo.g212_estado else '—',
            'co_equipo':   f"{h.g214_dispositivo.g212_co.g207_co}" if h.g214_dispositivo.g212_co else '—',          
            'novedad':     h.g214_novedad.g220_novedad if h.g214_novedad else '—',
            'novedad_id':  h.g214_novedad_id,
            'fecha':       h.g214_fecha.strftime('%Y-%m-%d'),
            'hora':        h.g214_hora.strftime('%H:%M'),
            'responsable': h.g214_responsable,
            'co':          f"{h.g214_co.g207_co} — {h.g214_co.g207_descripcion_co}" if h.g214_co else '—',
            'observaciones': h.g214_observaciones or '',
        })

    return _json_ok(registros)



#  Registrar historial automático

def _registrar_historial_auto(dispositivo, nombre_novedad, responsable, observaciones='', co=None):
    """
    Crea un registro en HistorialEquipo automáticamente.
    Crea el TipoNovedad si no existe.
    """
    from datetime import date, datetime
    novedad_obj, _ = TipoNovedad.objects.get_or_create(
        g220_novedad__iexact=nombre_novedad,
        defaults={'g220_novedad': nombre_novedad, 'g220_estado': True}
    )
    HistorialEquipo.objects.create(
        g214_dispositivo   = dispositivo,
        g214_novedad       = novedad_obj,
        g214_fecha         = date.today(),
        g214_hora          = datetime.now().time(),
        g214_responsable   = responsable or 'Sistema',
        g214_co            = co,
        g214_observaciones = observaciones,
    )





@login_required(login_url='login')
@require_http_methods(['GET'])
def api_historial_por_dispositivo(request, dispositivo_id):
    dispositivo = get_object_or_404(Dispositivo, pk=dispositivo_id)
    registros = HistorialEquipo.objects.select_related(
        'g214_novedad', 'g214_co'
    ).filter(g214_dispositivo=dispositivo).order_by('-g214_fecha', '-g214_hora')

    historial = []
    for h in registros:
        historial.append({
            'id':            h.g214_id,
            'novedad':       h.g214_novedad.g220_novedad if h.g214_novedad else '—',
            'fecha':         h.g214_fecha.strftime('%d/%m/%Y'),
            'hora':          h.g214_hora.strftime('%H:%M'),
            'responsable':   h.g214_responsable,
            'co':            f"{h.g214_co.g207_co} — {h.g214_co.g207_descripcion_co}" if h.g214_co else '—',
            'observaciones': h.g214_observaciones or '',
            'fecha_registro': h.g214_fecha_registro.strftime('%d/%m/%Y %H:%M'),
        })

    return _json_ok({
        'dispositivo': {
            'id':          dispositivo.g212_id,
            'serial':      dispositivo.g212_serial,
            'tipo':        dispositivo.g212_tipo.g200_tipo_dispositivo if dispositivo.g212_tipo else '—',
            'marca':       dispositivo.g212_marca.g202_marca if dispositivo.g212_marca else '—',
            'propietario': dispositivo.g212_propietario.g203_propietario if dispositivo.g212_propietario else '—',
            'estado':      dispositivo.g212_estado.g201_descripcion if dispositivo.g212_estado else '—',
            'co':          dispositivo.g212_co.g207_co if dispositivo.g212_co else '—',
        },
        'historial': historial,
        'total':     len(historial),
    })


@login_required(login_url='login')
@require_http_methods(['POST'])
def api_historial_crear(request):
    """Crea un nuevo registro de historial."""
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return _json_err('JSON inválido')

    required = ['dispositivo_id', 'novedad_id', 'fecha', 'hora', 'responsable']
    for f in required:
        if not body.get(f):
            return _json_err(f'Campo requerido: {f}')

    try:
        h = HistorialEquipo.objects.create(
            g214_dispositivo_id=body['dispositivo_id'],
            g214_novedad_id=body['novedad_id'],
            g214_fecha=body['fecha'],
            g214_hora=body['hora'],
            g214_responsable=body['responsable'],
            g214_co_id=body.get('co_id') or None,
            g214_observaciones=body.get('observaciones', ''),
        )
    except Exception as e:
        return _json_err(str(e))

    return _json_ok({'id': h.g214_id})



#  CENTRO DE COSTOS — Estadísticas agrupadas

@login_required(login_url='login')
@require_http_methods(['GET'])
def api_centro_operaciones(request):
    """
    Consulta de dispositivos agrupados por tipo para Centro de Costos.
    El área real está en el COLABORADOR (g215_Area_id), no en el dispositivo.
    Flujo: Área -> Colaboradores de esa área -> Dispositivos asignados (j216)
      ?co_id=     id del Area / CentroCosto (j228_area)
      ?prop_id=   id del Propietario
      ?tipo_id=   id del TipoDispositivo
    """
    co_id   = request.GET.get('co_id')
    prop_id = request.GET.get('prop_id')
    tipo_id = request.GET.get('tipo_id')

    asign_qs = AsignacionColaborador.objects.select_related('g216_colaborador', 'g216_dispositivo')
    if co_id:
        asign_qs = asign_qs.filter(g216_colaborador__g215_Area_id=co_id)
    if prop_id:
        asign_qs = asign_qs.filter(g216_dispositivo__g212_propietario_id=prop_id)
    if tipo_id:
        asign_qs = asign_qs.filter(g216_dispositivo__g212_tipo_id=tipo_id)

    dispositivo_ids = asign_qs.values_list('g216_dispositivo_id', flat=True)

    qs = Dispositivo.objects.filter(g212_id__in=dispositivo_ids).select_related(
        'g212_tipo', 'g212_estado', 'g212_propietario'
    )

    from django.db.models import Sum
    from decimal import Decimal

    # Tipos que aplican BitDefender (solo PORTÁTIL y TORRE DE ESCRITORIO)
    TIPOS_CON_BITDEFENDER = {'PORTATIL', 'PORTÁTIL', 'TORRE DE ESCRITORIO'}
    COSTO_BITDEFENDER_POR_EQUIPO = Decimal('6000')

    # Totales generales
    total       = qs.count()
    habilitados = qs.filter(g212_estado__g201_descripcion='HABILITADO').count()
    otros       = total - habilitados

    # Agrupar por tipo — cantidad + suma de costos
    grupos_raw = (
        qs.values('g212_tipo__g200_tipo_dispositivo', 'g212_estado__g201_descripcion')
        .annotate(
            cantidad=Count('g212_id'),
            suma_arrendamiento=Sum('g212_valor_arrendamiento'),
            suma_promedio=Sum('g212_valor_promedio'),
        )
    )

    grupos = {}
    for row in grupos_raw:
        tipo_nombre   = row['g212_tipo__g200_tipo_dispositivo'] or 'SIN TIPO'
        estado_nombre = row['g212_estado__g201_descripcion'] or 'SIN ESTADO'
        cant          = row['cantidad']
        arr           = row['suma_arrendamiento'] or Decimal('0')
        prom          = row['suma_promedio'] or Decimal('0')

        if tipo_nombre not in grupos:
            grupos[tipo_nombre] = {
                'tipo': tipo_nombre,
                'cantidad': 0,
                'habilitados': 0, 'inhabilitados': 0, 'asignados': 0,
                'costo_mensual': Decimal('0'),
                'costo_promedio': Decimal('0'),
                'aplica_bitdefender': tipo_nombre.upper() in TIPOS_CON_BITDEFENDER,
            }
        grupos[tipo_nombre]['cantidad']       += cant
        grupos[tipo_nombre]['costo_mensual']  += arr
        grupos[tipo_nombre]['costo_promedio'] += prom
        if estado_nombre == 'HABILITADO':
            grupos[tipo_nombre]['habilitados'] += cant
        elif estado_nombre == 'INHABILITADO':
            grupos[tipo_nombre]['inhabilitados'] += cant
        elif estado_nombre == 'ASIGNADO':
            grupos[tipo_nombre]['asignados'] += cant

    # Calcular totales
    total_arrendamiento      = sum(g['costo_mensual'] for g in grupos.values())
    total_promedio           = sum(g['costo_promedio'] for g in grupos.values())
    total_bitdefender_global = Decimal('0')

    grupos_list = []
    for g in sorted(grupos.values(), key=lambda x: x['tipo']):
        bd_grupo = COSTO_BITDEFENDER_POR_EQUIPO * g['cantidad'] if g['aplica_bitdefender'] else Decimal('0')
        total_bitdefender_global += bd_grupo
        grupos_list.append({
            'tipo':               g['tipo'],
            'cantidad':           g['cantidad'],
            'habilitados':        g['habilitados'],
            'inhabilitados':      g['inhabilitados'],
            'asignados':          g['asignados'],
            'costo_mensual':      float(g['costo_mensual']),
            'costo_promedio':     float(g['costo_promedio']),
            'costo_bitdefender':  float(bd_grupo),
            'aplica_bitdefender': g['aplica_bitdefender'],
            'total':              float(g['costo_mensual'] + bd_grupo),
        })

    total_general = total_arrendamiento + total_bitdefender_global

    # Colaboradores del área (con su cantidad de dispositivos y costo)
    colaboradores_resumen = (
        asign_qs.values(
            'g216_colaborador__g215_id',
            'g216_colaborador__g215_nombre',
            'g216_colaborador__g215_documento',
        )
        .annotate(
            cantidad=Count('g216_dispositivo_id'),
            costo_arrendamiento=Sum('g216_dispositivo__g212_valor_arrendamiento'),
        )
        .order_by('g216_colaborador__g215_nombre')
    )
    colaboradores_list = [{
        'id':                    row['g216_colaborador__g215_id'],
        'nombre':                row['g216_colaborador__g215_nombre'],
        'documento':             row['g216_colaborador__g215_documento'],
        'cantidad_dispositivos': row['cantidad'],
        'costo_arrendamiento':   float(row['costo_arrendamiento'] or Decimal('0')),
    } for row in colaboradores_resumen]

    return _json_ok({
        'total':         total,
        'habilitados':   habilitados,
        'otros':         otros,
        'grupos':        grupos_list,
        'colaboradores': colaboradores_list,
        'resumen': {
            'costo_arrendamiento': float(total_arrendamiento),
            'costo_promedio':      float(total_promedio),
            'costo_bitdefender':   float(total_bitdefender_global),
            'total':               float(total_general),
        },
    })


#  INACTIVOS

@login_required(login_url='login')
@require_http_methods(['GET'])
def api_inactivos(request):
    """Lista de dispositivos inactivos con filtros opcionales."""
    qs = DispositivoInactivo.objects.select_related(
        'g213_tipo', 'g213_marca', 'g213_propietario',
        'g213_estado', 'g213_co'
    )

    q = request.GET.get('q', '').strip()
    if q:
        qs = qs.filter(
            Q(g213_serial__icontains=q) |
            Q(g213_propietario__g203_propietario__icontains=q) |
            Q(g213_marca__g202_marca__icontains=q)
        )

    tipo_id = request.GET.get('tipo_id')
    if tipo_id:
        qs = qs.filter(g213_tipo_id=tipo_id)

    estado_id = request.GET.get('estado_id')
    if estado_id:
        qs = qs.filter(g213_estado_id=estado_id)

    inactivos = []
    for d in qs.order_by('g213_serial'):
        inactivos.append({
            'id':          d.g213_id,
            'serial':      d.g213_serial or '—',
            'tipo':        d.g213_tipo.g200_tipo_dispositivo if d.g213_tipo else '—',
            'tipo_id':     d.g213_tipo_id,
            'marca':       d.g213_marca.g202_marca if d.g213_marca else '—',
            'marca_id':    d.g213_marca_id,
            'modelo':      d.g213_modelo or '—',
            'propietario': d.g213_propietario.g203_propietario if d.g213_propietario else '—',
            'propietario_id': d.g213_propietario_id,
            'estado':      d.g213_estado.g201_descripcion if d.g213_estado else '—',
            'estado_id':   d.g213_estado_id,
            'co':          f"{d.g213_co.g207_co} — {d.g213_co.g207_descripcion_co}" if d.g213_co else '—',
            'co_id':       d.g213_co_id,
            'observaciones': d.g213_observaciones or '',
            'fecha_registro': d.g213_fecha_registro.strftime('%d/%m/%Y'),
        })

    # Stats
    total = DispositivoInactivo.objects.count()
    stats = {
        'total':     total,
        'eliminados': DispositivoInactivo.objects.filter(g213_estado__g201_descripcion='ELIMINADO').count(),
        'obsoletos':  DispositivoInactivo.objects.filter(g213_estado__g201_descripcion='OBSOLETO').count(),
        'devueltos':  DispositivoInactivo.objects.filter(g213_estado__g201_descripcion='DEVUELTO').count(),
    }

    return _json_ok({'inactivos': inactivos, 'stats': stats})

@login_required(login_url='login')
@require_http_methods(['PUT'])
def api_inactivo_editar(request, pk):
    """Edita un dispositivo inactivo."""
    d = get_object_or_404(DispositivoInactivo, pk=pk)
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return _json_err('JSON inválido')

    required = ['propietario_id', 'estado_id']
    for f in required:
        if not body.get(f):
            return _json_err(f'Campo requerido: {f}')

    d.g213_serial       = body.get('serial', d.g213_serial)
    d.g213_tipo_id      = body.get('tipo_id') or None
    d.g213_marca_id     = body.get('marca_id') or None
    d.g213_propietario_id = body['propietario_id']
    d.g213_estado_id    = body['estado_id']
    d.g213_co_id        = body.get('co_id') or None
    d.g213_observaciones = body.get('observaciones', '')
    d.save()

    return _json_ok({'id': d.g213_id})



# COLABORADORES

@login_required(login_url='login')
@require_http_methods(['GET'])
def api_colaboradores(request):
    """Lista de colaboradores con paginación en el backend."""
    qs = Colaborador.objects.select_related('g215_co', 'g215_estado')

    q = request.GET.get('q', '').strip()
    if q:
        qs = qs.filter(
            Q(g215_documento__icontains=q) |
            Q(g215_nombre__icontains=q) |
            Q(g215_cargo__icontains=q)
        )

    qs = qs.order_by('g215_nombre')
    total = qs.count()

    # Paginación
    try:
        page      = max(1, int(request.GET.get('page', 1)))
        page_size = min(100, max(10, int(request.GET.get('page_size', 25))))
    except (ValueError, TypeError):
        page, page_size = 1, 25

    offset = (page - 1) * page_size
    qs_page = qs[offset: offset + page_size]

    # IDs de la página para obtener asignaciones y actas de golpe
    ids_page = [c.g215_id for c in qs_page]

    # Asignaciones de todos los colaboradores de la página en 1 query
    asig_map = {}
    for a in AsignacionColaborador.objects.filter(
        g216_colaborador_id__in=ids_page
    ).select_related('g216_dispositivo__g212_tipo', 'g216_dispositivo__g212_marca'):
        asig_map.setdefault(a.g216_colaborador_id, []).append({
            'id':     a.g216_dispositivo.g212_id,
            'tipo':   a.g216_dispositivo.g212_tipo.g200_tipo_dispositivo if a.g216_dispositivo.g212_tipo else '—',
            'marca':  a.g216_dispositivo.g212_marca.g202_marca if a.g216_dispositivo.g212_marca else '—',
            'serial': a.g216_dispositivo.g212_serial,
        })

    # Actas de todos los colaboradores de la página en 1 query
    actas_map = {}
    for a in Acta.objects.filter(g217_colaborador_id__in=ids_page).order_by('-g217_fecha'):
        actas_map.setdefault(a.g217_colaborador_id, []).append({
            'id':      a.g217_id,
            'tipo':    a.g217_tipo,
            'proceso': a.g217_proceso,
            'fecha':   a.g217_fecha.strftime('%d/%m/%Y %H:%M') if a.g217_fecha else '—',
        })

    colaboradores = []
    for c in qs_page:
        colaboradores.append({
            'id':           c.g215_id,
            'documento':    c.g215_documento,
            'nombre':       c.g215_nombre,
            'co':           f"{c.g215_co.g207_co} — {c.g215_co.g207_descripcion_co}" if c.g215_co else '—',
            'co_id':        c.g215_co_id,
            'cargo':        c.g215_cargo,
            'estado':       c.g215_estado.g201_descripcion if c.g215_estado else '—',
            'estado_id':    c.g215_estado_id,
            'correo':       c.g215_correo or '',   
            'dispositivos': asig_map.get(c.g215_id, []),
            'actas':        actas_map.get(c.g215_id, []),
            
        })

    return _json_ok({
        'colaboradores': colaboradores,
        'total':         total,
        'page':          page,
        'page_size':     page_size,
        'total_pages':   (total + page_size - 1) // page_size,
    })

@login_required(login_url='login')
@require_http_methods(['POST'])
def api_asignacion_guardar(request, colaborador_id):
    """
    Guarda la asignación de dispositivos a un colaborador.
    body = {'dispositivos': [id1, id2, ...]}
    Comportamiento: los IDs enviados reemplazan la lista completa vigente
    SOLO si se envía el parámetro 'reemplazar': true. Por defecto (false),
    se AGREGAN a las asignaciones existentes sin eliminar las anteriores.
    Así, al agregar una nueva asignación las viejas se conservan.

    Cambios de estado automáticos:
      - Dispositivo asignado  → estado ASIGNADO (id=3)
      - Colaborador con ≥1 dispositivo → estado DISPOSITIVOS OTORGADOS (id=6)
      - En modo reemplazar, dispositivos removidos → estado HABILITADO (id=1)
    """
    #  IDs de estado (tabla j201_estado) 
    ESTADO_DISP_LIBRE       = 1   # HABILITADO  (dispositivo libre)
    ESTADO_DISP_ASIGNADO    = 3   # ASIGNADO    (dispositivo en uso)
    ESTADO_COLAB_CON_DISP   = 6   # DISPOSITIVOS OTORGADOS
    ESTADO_COLAB_SIN_DISP   = 10  # SIN ASIGNACIONES
    

    c = get_object_or_404(Colaborador, pk=colaborador_id)
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return _json_err('JSON inválido')

    dispositivo_ids = body.get('dispositivos', [])
    reemplazar = body.get('reemplazar', False)

    with transaction.atomic():
        if reemplazar:
            # Guardar IDs que se van a quitar para revertir su estado
            ids_anteriores = set(
                AsignacionColaborador.objects.filter(g216_colaborador=c)
                .values_list('g216_dispositivo_id', flat=True)
            )
            ids_nuevos = set(dispositivo_ids)
            ids_removidos = ids_anteriores - ids_nuevos

            # Eliminar asignaciones anteriores
            AsignacionColaborador.objects.filter(g216_colaborador=c).delete()
            # Historial automático — desasignación de los removidos
            for rid in ids_removidos:
                dev_rem = Dispositivo.objects.filter(pk=rid).first()
                if dev_rem:
                    _registrar_historial_auto(
                        dispositivo   = dev_rem,
                        nombre_novedad = 'DESASIGNACIÓN DE COLABORADOR',
                        responsable   = request.user.get_full_name() or request.user.username,
                        observaciones = f'Removido de: {c.g215_nombre}',
                        co            = dev_rem.g212_co,
                    )

            # Revertir estado de los dispositivos removidos → HABILITADO
            if ids_removidos:
                Dispositivo.objects.filter(pk__in=ids_removidos).update(
                    g212_estado_id=ESTADO_DISP_LIBRE
                )

            # Crear nuevas asignaciones y marcar dispositivos como ASIGNADO
            for dev_id in dispositivo_ids:
                dev = Dispositivo.objects.filter(pk=dev_id).first()
                if dev:
                    AsignacionColaborador.objects.create(
                        g216_colaborador=c,
                        g216_dispositivo_id=dev_id,
                    )
                    dev.g212_estado_id = ESTADO_DISP_ASIGNADO
                    dev.save(update_fields=['g212_estado_id'])
                     # Historial automático — asignación
                    _registrar_historial_auto(
                        dispositivo   = dev,
                        nombre_novedad = 'ASIGNACIÓN A COLABORADOR',
                        responsable   = request.user.get_full_name() or request.user.username,
                        observaciones = f'Asignado a: {c.g215_nombre}',
                        co            = dev.g212_co,
                    )
        else:
            # Modo acumulativo (default): agrega solo los nuevos, conserva los anteriores
            ya_asignados = set(
                AsignacionColaborador.objects.filter(g216_colaborador=c)
                .values_list('g216_dispositivo_id', flat=True)
            )
            for dev_id in dispositivo_ids:
                if dev_id not in ya_asignados:
                    dev = Dispositivo.objects.filter(pk=dev_id).first()
                    if dev:
                        # Bloquear si está asignado a OTRO colaborador
                        conflicto = AsignacionColaborador.objects.filter(
                            g216_dispositivo_id=dev_id
                        ).exclude(g216_colaborador=c).select_related('g216_colaborador').first()
                        if conflicto:
                            return _json_err(
                                f'El serial {dev.g212_serial} ya está asignado a '
                                f'{conflicto.g216_colaborador.g215_nombre}. '
                                f'Debes desasignarlo primero.'
                            )
                        AsignacionColaborador.objects.create(
                            g216_colaborador=c,
                            g216_dispositivo_id=dev_id,
                        )
                        ya_asignados.add(dev_id)
                        # Marcar dispositivo como ASIGNADO
                        dev.g212_estado_id = ESTADO_DISP_ASIGNADO
                        dev.save(update_fields=['g212_estado_id'])
                        
                        
                        # Historial automático
                        _registrar_historial_auto(
                            dispositivo   = dev,
                            nombre_novedad = 'ASIGNACIÓN A COLABORADOR',
                            responsable   = request.user.get_full_name() or request.user.username,
                            observaciones = f'Asignado a: {c.g215_nombre}',
                            co            = dev.g212_co,
                        )
                        
                        
                        

        # Actualizar estado del colaborador según si tiene dispositivos o no
        total_asignados = AsignacionColaborador.objects.filter(g216_colaborador=c).count()
        c.g215_estado_id = ESTADO_COLAB_CON_DISP if total_asignados > 0 else ESTADO_COLAB_SIN_DISP
        c.save(update_fields=['g215_estado_id'])

    return _json_ok({
        'colaborador_id': c.g215_id,
        'asignados': total_asignados,
    })
    
def _construir_html_acta(acta, colaborador, dispositivos, logo_b64):
    from datetime import datetime
    fecha_str = acta.g217_fecha.strftime('%d/%m/%Y %H:%M') if acta.g217_fecha else datetime.now().strftime('%d/%m/%Y %H:%M')

    tipo_upper = (acta.g217_tipo or '').upper()
    titulo_acta = 'ACTA DE DEVOLUCIÓN DE EQUIPOS TECNOLÓGICOS' if 'DEVOLU' in tipo_upper else 'ACTA DE ENTREGA DE EQUIPOS TECNOLÓGICOS'

    filas_dispositivos = ''
    for i, d in enumerate(dispositivos):
        carac_items = ''.join(
            f'<b>{k}:</b> {v}<br/>'
            for k, v in (d['caracteristicas'] or {}).items()
        )
        bg = '#ffffff' if i % 2 == 0 else '#f8fafc'
        filas_dispositivos += f"""
        <tr style="background:{bg}">
          <td style="padding:4px 6px;border:1px solid #e5e7eb;text-align:center;font-weight:bold">{i+1}</td>
          <td style="padding:4px 6px;border:1px solid #e5e7eb;font-weight:bold">{d['tipo']}</td>
          <td style="padding:4px 6px;border:1px solid #e5e7eb;font-size:10px">{d['serial']}</td>
          <td style="padding:4px 6px;border:1px solid #e5e7eb;font-size:10px;line-height:1.4">{carac_items}</td>
        </tr>"""

    if not filas_dispositivos:
        filas_dispositivos = '<tr><td colspan="4" style="padding:8px;text-align:center;color:#6b7280">Sin dispositivos asignados</td></tr>'

    firma_recibe_html  = f'<img src="{acta.g217_firma_recibe}" style="max-width:180px;max-height:60px"/>'  if acta.g217_firma_recibe  else '&nbsp;'
    firma_entrega_html = f'<img src="{acta.g217_firma_entrega}" style="max-width:180px;max-height:60px"/>' if acta.g217_firma_entrega else '&nbsp;'

    logo_html = f'<img src="{logo_b64}" style="max-height:70px;max-width:120px"/>' if logo_b64 else '<b style="font-size:16px;color:#1e3a5f">AM&amp;M</b>'

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  body {{
    margin: 0;
    padding: 0;
    font-family: Arial, sans-serif;
    font-size: 11px;
    color: #111;
  }}
  @page {{
    margin: 10mm 12mm 10mm 12mm;
  }}
  table {{ border-collapse: collapse; width: 100%; }}
  td, th {{ font-size: 11px; }}
</style>
</head>
<body>

<!-- ENCABEZADO -->
<table style="width:100%;margin-bottom:6px;border-bottom:2px solid #111;padding-bottom:6px">
  <tr>
    <td style="width:140px;vertical-align:middle">{logo_html}</td>
    <td style="text-align:center;vertical-align:middle;padding:0 10px">
      <div style="font-size:13px;font-weight:bold;text-transform:uppercase">{titulo_acta}</div>
      <div style="font-size:11px;font-weight:bold;margin-top:3px">GESTIÓN DE TECNOLOGÍA DE LA INFORMACIÓN Y LA COMUNICACIÓN</div>
    </td>
    <td style="width:110px;text-align:right;vertical-align:middle;font-size:10px;font-weight:bold;line-height:1.6">
      CÓDIGO: TIC-INF-F-2<br/>VERSIÓN: 6
    </td>
  </tr>
</table>

<!-- INFO COLABORADOR -->
<table style="width:100%;margin-bottom:6px;font-size:11px">
  <tr>
    <td style="width:180px;padding:2px 0"><b>FECHA:</b></td>
    <td style="padding:2px 0">{fecha_str}</td>
  </tr>
  <tr>
    <td style="padding:2px 0"><b>NOMBRE COLABORADOR:</b></td>
    <td style="padding:2px 0">{colaborador.g215_nombre}</td>
  </tr>
  <tr>
    <td style="padding:2px 0"><b>CARGO COLABORADOR:</b></td>
    <td style="padding:2px 0">{colaborador.g215_cargo}</td>
  </tr>
  <tr>
    <td style="padding:2px 0"><b>PROCESO/ÁREA COLABORADOR:</b></td>
    <td style="padding:2px 0">{acta.g217_proceso}</td>
  </tr>
</table>

<!-- TABLA DISPOSITIVOS -->
<table style="width:100%;margin-bottom:6px;font-size:10px">
  <thead>
    <tr style="background:#1e3a5f;color:#ffffff">
      <th style="padding:6px 8px;border:1px solid #1e3a5f;text-align:center;width:25px">#</th>
      <th style="padding:6px 8px;border:1px solid #1e3a5f;text-align:left;width:110px">TIPO DISPOSITIVO</th>
      <th style="padding:6px 8px;border:1px solid #1e3a5f;text-align:left;width:100px">SERIAL</th>
      <th style="padding:6px 8px;border:1px solid #1e3a5f;text-align:left">CARACTERÍSTICAS</th>
    </tr>
  </thead>
  <tbody>{filas_dispositivos}</tbody>
</table>

<!-- TEXTO LEGAL -->
<div style="font-size:9px;color:#222;text-align:justify;line-height:1.5;margin-bottom:8px;border-top:1px solid #ccc;padding-top:6px">
Certifico que los elementos detallados en el presente documento, me han sido entregados en las condiciones descritas y en buenas condiciones, operativas, funcionales y físicas para mi cuidado y custodia con el propósito de cumplir con las tareas y asignaciones propias de mi cargo en la empresa, siendo estas de mi única y exclusiva responsabilidad. Si la parte o equipo tecnológico presentase fallas o mal funcionamiento reportarlo al área de sistemas en un tiempo no mayor a 30 días para el trámite de las garantías correspondientes si las cubriese. Me comprometo a usar correctamente los recursos, y solo para los fines establecidos, a no instalar ni permitir la instalación de software para uso personal ajeno al personal de Gestión de Tecnología e Informática. Todo daño físico causado por maltrato o por el uso inapropiado de los equipos asignados y de los planes corporativos el robo o pérdida de éstos es de mi única y exclusiva responsabilidad, por lo cual autorizo el descuento del valor correspondiente del pago de nómina; así mismo al finalizar mi contrato laboral me comprometo a realizar la devolución a la totalidad de los equipos asignados y autorizo el descuento de salarios, prestaciones sociales, vacaciones, indemnizaciones, bonificaciones, auxilios y demás derechos que me correspondan el valor correspondiente a daños, pérdida o robo de los equipos en mención.
<br/><br/>
De igual manera, certifico que con el equipo tecnológico recibido daré buen uso a los recursos informáticos, conforme lo establecido en el documento TI-P-005 Política uso de recursos informáticos.
</div>

<!-- FIRMAS -->
<table style="width:100%;margin-top:8px">
  <tr>
    <td style="width:50%;text-align:center;padding-right:20px;vertical-align:bottom">
      {firma_recibe_html}
      <hr style="border:none;border-top:1px solid #333;margin:4px 0"/>
      <div style="font-weight:bold;font-size:11px">{colaborador.g215_nombre}</div>
      <div style="font-size:10px;color:#555">FIRMA QUIEN RECIBE</div>
    </td>
    <td style="width:50%;text-align:center;padding-left:20px;vertical-align:bottom">
      {firma_entrega_html}
      <hr style="border:none;border-top:1px solid #333;margin:4px 0"/>
      <div style="font-weight:bold;font-size:11px">TECNOLOGÍA DE LA INFORMACIÓN</div>
      <div style="font-size:10px;color:#555">FIRMA QUIEN ENTREGA</div>
    </td>
  </tr>
</table>

</body>
</html>"""
def _enviar_correo_acta(destinatario, nombre_colaborador, pdf_bytes, nombre_archivo):
    """
    Envía el correo con el PDF adjunto.
    Se ejecuta en un hilo separado para no bloquear la respuesta HTTP.
    """
    remitente = settings.EMAIL_HOST_USER
    password  = settings.EMAIL_HOST_PASSWORD
    host      = settings.EMAIL_HOST
    port      = settings.EMAIL_PORT

    # ── Armar el mensaje ──────────────────────────────────
    msg = MIMEMultipart('mixed')
    msg['Subject'] = 'ACTA DE DISPOSITIVOS TECNOLÓGICOS'
    msg['From']    = remitente
    msg['To']      = destinatario

    # ── Cuerpo HTML del correo ────────────────────────────
    cuerpo_html = f"""
    <html><body style="font-family:Arial,sans-serif;font-size:14px;color:#222;line-height:1.6">

      <div style="max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">

        <!-- Cabecera azul -->
        <div style="background:#1e3a5f;padding:24px 30px">
          <h2 style="margin:0;color:#fff;font-size:18px">
            📄 Acta de Dispositivos Tecnológicos
          </h2>
        </div>

        <!-- Cuerpo -->
        <div style="padding:30px">
          <p>Cordial saludo,</p>
          <p>
            Adjunto encontrará el acta de entrega/devolución de equipos tecnológicos
            correspondiente al colaborador <strong>{nombre_colaborador}</strong>,
            la cual hace constancia de la gestión realizada por el área de TI.
          </p>

          <div style="background:#f0f4ff;border-left:4px solid #1e3a5f;padding:14px 18px;margin:20px 0;border-radius:0 6px 6px 0">
            <strong>📎 Documento adjunto:</strong> {nombre_archivo}
          </div>

          <p>Por favor revise el documento y consérvelo para sus registros.</p>
          <p>Gracias,<br><strong>Área de Tecnología e Informática</strong></p>
        </div>

        <!-- Pie de página -->
        <div style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:16px 30px">
          <p style="margin:0;font-size:11px;color:#e53e3e">
            <strong>⚠️ Por favor, no responda a este mensaje, ha sido enviado de forma automática.
            Si desea ponerse en contacto con nosotros para comentarnos alguna incidencia o mejora
            de este servicio, por favor escríbanos a
            <a href="mailto:dirsistemas@montacargasamym.com" style="color:#e53e3e">
            dirsistemas@montacargasamym.com</a></strong>
          </p>
        </div>

      </div>
    </body></html>
    """

    # Parte alternativa para el cuerpo HTML
    parte_alternativa = MIMEMultipart('alternative')
    parte_alternativa.attach(MIMEText(cuerpo_html, 'html', 'utf-8'))
    msg.attach(parte_alternativa)

    # ── Adjuntar el PDF ───────────────────────────────────
    adjunto = MIMEBase('application', 'pdf')
    adjunto.set_payload(pdf_bytes)
    encoders.encode_base64(adjunto)
    adjunto.add_header('Content-Disposition', f'attachment; filename="{nombre_archivo}"')
    adjunto.add_header('Content-Type', 'application/pdf', name=nombre_archivo)
    msg.attach(adjunto)

    # ── Enviar via SMTP (Outlook/Microsoft 365) ───────────
    try:
        with smtplib.SMTP(host, port, timeout=15) as servidor:
            servidor.ehlo()
            servidor.starttls()          # cifrado TLS obligatorio en Outlook
            servidor.ehlo()
            servidor.login(remitente, password)
            servidor.sendmail(remitente, destinatario, msg.as_bytes())
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f'[CORREO ACTA] Error enviando a {destinatario}: {e}')   
    
    
    

@login_required(login_url='login')
@require_http_methods(['POST'])
def api_acta_guardar(request, colaborador_id):
    """Guarda el acta y envía el PDF por correo automáticamente."""
    c = get_object_or_404(Colaborador, pk=colaborador_id)
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return _json_err('JSON inválido')

    required = ['tipo', 'proceso', 'correo']
    for f in required:
        if not body.get(f):
            return _json_err(f'Campo requerido: {f}')

    # 1. Guardar el acta en BD (igual que antes)
    acta = Acta.objects.create(
        g217_colaborador  = c,
        g217_tipo         = body['tipo'],
        g217_proceso      = body['proceso'],
        g217_correo       = body['correo'],
        g217_firma_recibe  = body.get('firma_recibe', ''),
        g217_firma_entrega = body.get('firma_entrega', ''),
    )
    c.g215_correo = body['correo']
    c.save(update_fields=['g215_correo'])

    # 2. Construir los dispositivos (reutilizando la misma lógica de api_acta_detalle)
    dispositivos = []
    for asig in AsignacionColaborador.objects.filter(
        g216_colaborador=c
    ).select_related(
        'g216_dispositivo__g212_tipo',
        'g216_dispositivo__caract_pc__g222_procesador',
        'g216_dispositivo__caract_pc__g222_so',
        'g216_dispositivo__caract_pc__g222_antivirus',
        'g216_dispositivo__caract_pc__g222_licencia',
        'g216_dispositivo__caract_pc__g222_tipo_disco',
        'g216_dispositivo__caract_pc__g222_almacenamiento',
        'g216_dispositivo__caract_movil__g223_operador',
        'g216_dispositivo__caract_movil__g223_almacenamiento',
        'g216_dispositivo__caract_pantalla',
        'g216_dispositivo__caract_impresora__g225_tipo_impresora',
        'g216_dispositivo__caract_periferico',
        'g216_dispositivo__caract_licencia',
        'g216_dispositivo__caract_videobeam',
    ):
        d = asig.g216_dispositivo
        dispositivos.append({
            'tipo':            d.g212_tipo.g200_tipo_dispositivo if d.g212_tipo else '—',
            'serial':          d.g212_serial,
            'nombre':          d.g212_nombre_equipo or '—',
            'caracteristicas': _get_caracteristicas(d),
        })

    # 3. Logo
    logo_b64   = ''
    logo_path  = os.path.join(settings.BASE_DIR, 'index', 'static', 'img', 'imagen.png')
    if os.path.exists(logo_path):
        with open(logo_path, 'rb') as f:
            logo_b64 = 'data:image/png;base64,' + base64.b64encode(f.read()).decode()

    # 4. Generar el HTML → PDF con WeasyPrint
    html_acta  = _construir_html_acta(acta, c, dispositivos, logo_b64)
    buffer = BytesIO()
    pisa.CreatePDF(html_acta, dest=buffer)
    pdf_bytes = buffer.getvalue()

    # 5. Enviar el correo en segundo plano (no bloquea la respuesta)
    nombre_archivo = f"Acta_{acta.g217_tipo}_{c.g215_nombre.replace(' ', '_')}_{acta.g217_id}.pdf"
    hilo = threading.Thread(
        target=_enviar_correo_acta,
        args=(body['correo'], c.g215_nombre, pdf_bytes, nombre_archivo),
        daemon=True,
    )
    hilo.start()

    return _json_ok({'acta_id': acta.g217_id})




def _get_caracteristicas(d):
    """Retorna dict de características según el tipo de dispositivo."""
    tipo = d.g212_tipo.g200_tipo_dispositivo.upper() if d.g212_tipo else ''
    chars = {}

    if tipo in ('TORRE DE ESCRITORIO', 'PORTATIL'):
        pc = getattr(d, 'caract_pc', None)
        if pc:
            chars = {
                'NOMBRE':        d.g212_nombre_equipo or '—',
                'PROCESADOR':    pc.g222_procesador.g209_procesador if pc.g222_procesador else '—',
                'SO':            pc.g222_so.g210_so if pc.g222_so else '—',
                'RAM':           f"{pc.g222_ram} GB" if pc.g222_ram else '—',
                'TIPO DISCO':    pc.g222_tipo_disco.g231_tipo_disco if pc.g222_tipo_disco else '—',
                'ALMACENAMIENTO': pc.g222_almacenamiento.g219_almacenamiento if pc.g222_almacenamiento else '—',
                'ANTIVIRUS':     pc.g222_antivirus.g208_antivirus if pc.g222_antivirus else '—',
                'OFFICE':        pc.g222_licencia.g211_office if pc.g222_licencia else '—',
                'CORREO / KEY OFFICE': f"{pc.g222_correo_office or '—'} / {pc.g222_key_office or '—'}",
                'ACTIVO':        pc.g222_activo or '—',
            }
            if tipo == 'PORTATIL':
                chars['PULGADAS'] = str(pc.g222_pulgadas) if pc.g222_pulgadas else '—'

    elif tipo in ('CELULAR', 'TABLET', 'MODEM WIFI', 'SIMCARD', 'TELEFONO FIJO'):
        mov = getattr(d, 'caract_movil', None)
        if mov:
            chars = {
                'NÚMERO':        mov.g223_numero_linea or '—',
                'OPERADOR':      mov.g223_operador.g221_operador if mov.g223_operador else '—',
                'PLAN DE DATOS': mov.g223_plan_datos or '—',
                'IMEI 1':        mov.g223_imei1 or '—',
                'IMEI 2':        mov.g223_imei2 or '—',
                'CUENTA GMAIL':  mov.g223_cuenta_gmail or '—',
                'CONTRASEÑA':    mov.g223_contrasena_gmail or '—',
            }
            if tipo in ('MODEM WIFI',):
                chars['ALMACENAMIENTO'] = mov.g223_almacenamiento.g219_almacenamiento if mov.g223_almacenamiento else '—'

    elif tipo == 'PANTALLA':
        pan = getattr(d, 'caract_pantalla', None)
        if pan:
            chars = {
                'PULGADAS':   str(pan.g224_pulgadas) if pan.g224_pulgadas else '—',
                'RESOLUCIÓN': pan.g224_resolucion or '—',
            }

    elif tipo == 'IMPRESORA':
        imp = getattr(d, 'caract_impresora', None)
        if imp:
            chars = {
                'TIPO':    imp.g225_tipo_impresora.g229_tipo_impresora if imp.g225_tipo_impresora else '—',
                'FUNCIÓN': imp.g225_funcion or '—',
            }

    elif tipo == 'PERIFERICO':
        per = getattr(d, 'caract_periferico', None)
        if per:
            chars = {
                'BASE':        'SÍ' if per.g226_incluye_base else 'NO',
                'TECLADO':     'SÍ' if per.g226_incluye_teclado else 'NO',
                'MOUSE':       'SÍ' if per.g226_incluye_mouse else 'NO',
                'AURICULARES': 'SÍ' if per.g226_incluye_auriculares else 'NO',
                'CARGADOR':    'SÍ' if per.g226_incluye_cargador else 'NO',
                'DESCRIPCIÓN': per.g226_descripcion_adicional or '—',
            }

    elif tipo == 'LICENCIA OFFICE':
        lic = getattr(d, 'caract_licencia', None)
        if lic:
            chars = {
                'SOFTWARE':    lic.g227_software or '—',
                'VERSIÓN':     lic.g227_version or '—',
                'KEY':         lic.g227_key or '—',
                'CORREO':      lic.g227_correo or '—',
                'VENCIMIENTO': lic.g227_fecha_vencimiento.strftime('%d/%m/%Y') if lic.g227_fecha_vencimiento else '—',
            }

    # Campos comunes a todos
    chars['VALOR PROMEDIO']       = f"$ {d.g212_valor_promedio:,.0f}" if d.g212_valor_promedio else '—'
    chars['VALOR ARRENDAMIENTO']  = f"$ {d.g212_valor_arrendamiento:,.0f}" if d.g212_valor_arrendamiento else '—'
    chars['MARCA']                = d.g212_marca.g202_marca if d.g212_marca else '—'

    return chars
# FUNSION API DE ACTA DE DETALLE 
@login_required(login_url='login')
@require_http_methods(['GET'])
def api_acta_detalle(request, acta_id):
    acta = get_object_or_404(Acta, pk=acta_id)
    colaborador = acta.g217_colaborador

    dispositivos = []
    for asig in AsignacionColaborador.objects.filter(
        g216_colaborador=colaborador
    ).select_related(
        'g216_dispositivo__g212_tipo',
        'g216_dispositivo__g212_marca',
        'g216_dispositivo__caract_pc__g222_procesador',
        'g216_dispositivo__caract_pc__g222_so',
        'g216_dispositivo__caract_pc__g222_antivirus',
        'g216_dispositivo__caract_pc__g222_licencia',
        'g216_dispositivo__caract_pc__g222_tipo_disco',
        'g216_dispositivo__caract_pc__g222_almacenamiento',
        'g216_dispositivo__caract_movil__g223_operador',
        'g216_dispositivo__caract_movil__g223_almacenamiento',
        'g216_dispositivo__caract_pantalla',
        'g216_dispositivo__caract_impresora__g225_tipo_impresora',
        'g216_dispositivo__caract_periferico',
        'g216_dispositivo__caract_licencia',
        'g216_dispositivo__caract_videobeam',
    ):
        d = asig.g216_dispositivo
        dispositivos.append({
            'tipo':            d.g212_tipo.g200_tipo_dispositivo if d.g212_tipo else '—',
            'serial':          d.g212_serial,
            'nombre':          d.g212_nombre_equipo or '—',
            'caracteristicas': _get_caracteristicas(d),
        })

    #  Logo 
    logo_b64 = ''
    logo_path = os.path.join(settings.BASE_DIR, 'index', 'static', 'img', 'imagen.png')
    if os.path.exists(logo_path):
        with open(logo_path, 'rb') as f:
            logo_b64 = 'data:image/png;base64,' + base64.b64encode(f.read()).decode()
    

    return _json_ok({
        'id':            acta.g217_id,
        'tipo':          acta.g217_tipo,
        'proceso':       acta.g217_proceso,
        'correo':        acta.g217_correo,
        'fecha':         acta.g217_fecha.strftime('%d/%m/%Y %H:%M') if acta.g217_fecha else '—',
        'firma_recibe':  acta.g217_firma_recibe or '',
        'firma_entrega': acta.g217_firma_entrega or '',
        'colaborador': {
            'nombre':    colaborador.g215_nombre,
            'documento': colaborador.g215_documento,
            'cargo':     colaborador.g215_cargo,
            'co':        f"{colaborador.g215_co.g207_co} — {colaborador.g215_co.g207_descripcion_co}" if colaborador.g215_co else '—',
        },
        'dispositivos': dispositivos,
        'logo':          logo_b64,  
    })




#  DASHBOARD — Estadísticas generales y mapa

@login_required(login_url='login')
@require_http_methods(['GET'])
@login_required(login_url='login')
@require_http_methods(['GET'])
def api_exportar_inventario(request):
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment
    from django.http import HttpResponse

    #  Filtros desde la URL (los mismos que el inventario) 
    qs = Dispositivo.objects.select_related(
        'g212_tipo', 'g212_marca', 'g212_propietario',
        'g212_estado', 'g212_co', 'g212_departamento', 'g212_municipio'
    )
    q       = request.GET.get('q', '').strip()
    tipo_id = request.GET.get('tipo', '').strip()
    estado  = request.GET.get('estado', '').strip()

    if q:
        qs = qs.filter(
            Q(g212_serial__icontains=q) |
            Q(g212_propietario__g203_propietario__icontains=q) |
            Q(g212_marca__g202_marca__icontains=q)
        )
    if tipo_id:
        qs = qs.filter(g212_tipo_id=tipo_id)
    if estado:
        qs = qs.filter(g212_estado_id=estado)

    qs = qs.order_by('g212_tipo__g200_tipo_dispositivo', 'g212_serial')

    #  Detectar grupo según tipos presentes 
    tipos_presentes = set(
        qs.values_list('g212_tipo__g200_tipo_dispositivo', flat=True).distinct()
    )

    GRUPO_PC        = {'TORRE DE ESCRITORIO', 'PORTATIL'}
    GRUPO_MOVIL     = {'CELULAR', 'TABLET', 'MODEM WIFI', 'SIMCARD', 'TELEFONO FIJO'}
    GRUPO_PANTALLA  = {'PANTALLA'}
    GRUPO_IMPRESORA = {'IMPRESORA'}
    GRUPO_PERIFERICO= {'PERIFERICO'}
    GRUPO_LICENCIA  = {'LICENCIA OFFICE'}

    def _detectar_grupo():
        for t in tipos_presentes:
            if t in GRUPO_PC:         return 'pc'
            if t in GRUPO_MOVIL:      return 'movil'
            if t in GRUPO_PANTALLA:   return 'pantalla'
            if t in GRUPO_IMPRESORA:  return 'impresora'
            if t in GRUPO_PERIFERICO: return 'periferico'
            if t in GRUPO_LICENCIA:   return 'licencia'
        return 'general'

    grupo = _detectar_grupo()

    #  Columnas base + columnas según grupo 
    BASE_HEADERS = [
        'Serial', 'Tipo', 'Marca', 'Propietario', 'Estado',
        'Centro Operaciones', 'Nombre Equipo',
        'Valor Promedio', 'Valor Arrendamiento',
        'Departamento', 'Municipio', 'Observaciones', 'Fecha Registro',
    ]
    EXTRA_HEADERS = {
        'pc':         ['Procesador', 'SO', 'RAM', 'Tipo Disco', 'Almacenamiento',
                       'Antivirus', 'Office', 'Correo Office', 'Activo'],
        'movil':      ['Número Línea', 'Operador', 'IMEI 1', 'IMEI 2',
                       'Plan Datos', 'Cuenta Gmail', 'Contraseña'],
        'pantalla':   ['Pulgadas', 'Resolución'],
        'impresora':  ['Tipo Impresora', 'Función'],
        'periferico': ['Base', 'Teclado', 'Mouse', 'Auriculares', 'Cargador'],
        'licencia':   ['Software', 'Versión', 'Key', 'Correo', 'Vencimiento'],
        'general':    [],
    }
    headers = BASE_HEADERS + EXTRA_HEADERS.get(grupo, [])

    #  Workbook 
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = 'Inventario'

    header_fill = PatternFill('solid', fgColor='1B4698')
    header_font = Font(color='FFFFFF', bold=True)
    center      = Alignment(horizontal='center', vertical='center')

    for col, h in enumerate(headers, 1):
        cell            = ws.cell(row=1, column=col, value=h)
        cell.fill       = header_fill
        cell.font       = header_font
        cell.alignment  = center

    #  Helpers 
    def _res(Model, pk, attr):
        try:
            return getattr(Model.objects.get(pk=pk), attr) if pk else ''
        except Exception:
            return ''

    #  Filas 
    fill_alt = PatternFill('solid', fgColor='EEF2FF')

    for row_num, d in enumerate(qs, 2):
        caract = _get_caracteristicas(d)

        base = [
            d.g212_serial or '',
            d.g212_tipo.g200_tipo_dispositivo if d.g212_tipo else '',
            d.g212_marca.g202_marca if d.g212_marca else '',
            d.g212_propietario.g203_propietario if d.g212_propietario else '',
            d.g212_estado.g201_descripcion if d.g212_estado else '',
            f"{d.g212_co.g207_co} — {d.g212_co.g207_descripcion_co}" if d.g212_co else '',
            d.g212_nombre_equipo or '',
            float(d.g212_valor_promedio)      if d.g212_valor_promedio      else '',
            float(d.g212_valor_arrendamiento) if d.g212_valor_arrendamiento else '',
            d.g212_departamento.g204_departamento if d.g212_departamento else '',
            d.g212_municipio.g205_municipio if d.g212_municipio else '',
            d.g212_observaciones or '',
            d.g212_fecha_registro.strftime('%d/%m/%Y %H:%M') if d.g212_fecha_registro else '',
        ]

        if grupo == 'pc':
            from dashboard.models import (Procesador, SistemaOperativo,
                                          Antivirus, LicenciaOffice,
                                          Opciones, Almacenamiento)
            extra = [
                _res(Procesador,       caract.get('procesador_id'),    'g209_procesador'),
                _res(SistemaOperativo, caract.get('so_id'),            'g210_so'),
                _res(Opciones,         caract.get('ram_id'),           'g218_opciones'),
                _res(Opciones,         caract.get('tipo_disco_id'),    'g218_opciones'),
                _res(Almacenamiento,   caract.get('almacenamiento_id'),'g219_almacenamiento'),
                _res(Antivirus,        caract.get('antivirus_id'),     'g208_antivirus'),
                _res(LicenciaOffice,   caract.get('licencia_id'),      'g211_office'),
                caract.get('correo_office', ''),
                caract.get('activo', ''),
            ]
        elif grupo == 'movil':
            from dashboard.models import Operador
            extra = [
                caract.get('numero_linea', ''),
                _res(Operador, caract.get('operador_id'), 'g221_operador'),
                caract.get('imei1', ''),
                caract.get('imei2', ''),
                caract.get('plan_datos', ''),
                caract.get('cuenta_gmail', ''),
                caract.get('contrasena_gmail', ''),
            ]
        elif grupo == 'pantalla':
            extra = [caract.get('pulgadas', ''), caract.get('resolucion', '')]
        elif grupo == 'impresora':
            from dashboard.models import TipoImpresora
            extra = [
                _res(TipoImpresora, caract.get('tipo_impresora_id'), 'g229_tipo_impresora'),
                caract.get('funcion', ''),
            ]
        elif grupo == 'periferico':
            extra = [
                'SÍ' if caract.get('incluye_base')        else 'NO',
                'SÍ' if caract.get('incluye_teclado')     else 'NO',
                'SÍ' if caract.get('incluye_mouse')       else 'NO',
                'SÍ' if caract.get('incluye_auriculares') else 'NO',
                'SÍ' if caract.get('incluye_cargador')    else 'NO',
            ]
        elif grupo == 'licencia':
            extra = [
                caract.get('software', ''),
                caract.get('version', ''),
                caract.get('key', ''),
                caract.get('correo', ''),
                caract.get('fecha_vencimiento', ''),
            ]
        else:
            extra = []

        fila = base + extra
        for col, val in enumerate(fila, 1):
            cell = ws.cell(row=row_num, column=col, value=val)
            if row_num % 2 == 0:
                cell.fill = fill_alt

    #  Ajustar anchos + freeze header 
    for col in ws.columns:
        max_len = max((len(str(c.value)) if c.value else 0) for c in col)
        ws.column_dimensions[col[0].column_letter].width = min(max_len + 4, 45)

    ws.freeze_panes = 'A2'

    #  Respuesta 
    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = 'attachment; filename="inventario_systraker.xlsx"'
    wb.save(response)
    return response

@login_required(login_url='login')
@require_http_methods(['GET'])
def api_dashboard_stats(request):
    """
    Estadísticas para el panel de equipos del dashboard:
    - Conteo por tipo de dispositivo (para el carrusel)
    - Totales activos / inactivos
    - Ubicaciones geográficas para el mapa
    """
    # Carrusel: todos los tipos activos, con conteo (0 si no tienen dispositivos)
    ICONOS = {
        'TORRE DE ESCRITORIO': 'https://img.icons8.com/3d-fluency/96/desktop.png',
        'PORTATIL':            'https://img.icons8.com/3d-fluency/96/laptop.png',
        'PORTÁTIL':            'https://img.icons8.com/3d-fluency/96/laptop.png',
        'PANTALLA':            'https://img.icons8.com/3d-fluency/96/monitor.png',
        'CELULAR':             'https://img.icons8.com/3d-fluency/96/iphone14-pro.png',
        'MODEM WIFI':          'https://img.icons8.com/3d-fluency/96/router.png',
        'DIADEMA':             'https://img.icons8.com/3d-fluency/96/headset.png',
        'SIMCARD':             'https://img.icons8.com/3d-fluency/96/sim-card.png',
        'VIDEO BEAM':          'https://img.icons8.com/3d-fluency/96/video-projector.png',
        'TABLET':              'https://img.icons8.com/3d-fluency/96/ipad.png',
        'TELEFONO FIJO':       'https://img.icons8.com/3d-fluency/96/telephone.png',
        'TELÉFONO FIJO':       'https://img.icons8.com/3d-fluency/96/telephone.png',
        'IMPRESORA':           'https://img.icons8.com/3d-fluency/96/print.png',
        'PERIFERICO':          'https://img.icons8.com/3d-fluency/96/usb-2.png',
        'PERIFÉRICO':          'https://img.icons8.com/3d-fluency/96/usb-2.png',
        'LICENCIA OFFICE':     'https://img.icons8.com/3d-fluency/96/ms-office.png',
    }
    # Conteo real de dispositivos por tipo
    conteo_dict = {
        row['g212_tipo__g200_tipo_dispositivo']: row['value']
        for row in (
            Dispositivo.objects
            .values('g212_tipo__g200_tipo_dispositivo')
            .annotate(value=Count('g212_id'))
        )
    }

    # Todos los tipos activos, con valor 0 si no tienen dispositivos aún
    tipos = [
        {
            'label': t.g200_tipo_dispositivo,
            'value': conteo_dict.get(t.g200_tipo_dispositivo, 0),
            'src':   ICONOS.get(t.g200_tipo_dispositivo, 'https://img.icons8.com/fluency/96/server.png'),
        }
        for t in TipoDispositivo.objects.filter(g200_estado=True).order_by('g200_tipo_dispositivo')
    ]

    # Activos e inactivos totales
    activos_total   = Dispositivo.objects.count()
    inactivos_total = DispositivoInactivo.objects.count()

    # Ubicaciones para el mapa: usa coordenadas de la BD
    ubicaciones_raw = (
        Dispositivo.objects
        .select_related('g212_municipio', 'g212_tipo')
        .exclude(g212_municipio=None)
        .exclude(g212_municipio__g205_latitud=None)
        .exclude(g212_municipio__g205_longitud=None)
        .values(
            'g212_municipio__g205_municipio',
            'g212_municipio__g205_latitud',
            'g212_municipio__g205_longitud',
            'g212_tipo__g200_tipo_dispositivo',
        )
        .annotate(cantidad=Count('g212_id'))
    )

    ubicaciones = []
    for row in ubicaciones_raw:
        lat = row['g212_municipio__g205_latitud']
        lng = row['g212_municipio__g205_longitud']
        if lat and lng:
            ubicaciones.append({
                'lat':      float(lat),
                'lng':      float(lng),
                'ciudad':   row['g212_municipio__g205_municipio'] or '',
                'tipo':     row['g212_tipo__g200_tipo_dispositivo'] or '',
                'cantidad': row['cantidad'],
            })

    ciudades_count = len(set(u['ciudad'] for u in ubicaciones))
    return _json_ok({
        'tipos':     tipos,
        'activos':   activos_total,
        'inactivos': inactivos_total,
        'ubicaciones': ubicaciones,
        'ciudades':  ciudades_count,
    })


# ENDPOINT: ELIMINAR UNA ASIGNACIÓN INDIVIDUAL
# DELETE /api/colaboradores/<colaborador_id>/asignar/<dispositivo_id>/

@login_required(login_url='login')
@require_http_methods(['DELETE'])
def api_asignacion_eliminar(request, colaborador_id, dispositivo_id):
    """
    Elimina una sola asignación colaborador↔dispositivo sin tocar las demás.

    Cambios de estado automáticos:
      - Dispositivo removido → estado HABILITADO (id=1)
      - Si el colaborador queda sin dispositivos → estado SIN ASIGNACIONES (id=10)
      - Si aún le quedan dispositivos → estado DISPOSITIVOS OTORGADOS (id=6)
    """
    # ── IDs de estado (tabla j201_estado) ──────────────────────────
    ESTADO_DISP_LIBRE       = 1   # HABILITADO  (dispositivo libre)
    ESTADO_COLAB_CON_DISP   = 6   # DISPOSITIVOS OTORGADOS
    ESTADO_COLAB_SIN_DISP   = 10  # SIN ASIGNACIONES
    # ───────────────────────────────────────────────────────────────

    c = get_object_or_404(Colaborador, pk=colaborador_id)

    with transaction.atomic():
        deleted, _ = AsignacionColaborador.objects.filter(
            g216_colaborador=c,
            g216_dispositivo_id=dispositivo_id,
        ).delete()
        
        # Historial automático — desasignación individual
        dev_rem = Dispositivo.objects.filter(pk=dispositivo_id).first()
        if dev_rem:
            _registrar_historial_auto(
                dispositivo   = dev_rem,
                nombre_novedad = 'DESASIGNACIÓN DE COLABORADOR',
                responsable   = request.user.get_full_name() or request.user.username,
                observaciones = f'Removido de: {c.g215_nombre}',
                co            = dev_rem.g212_co,
            )

        if deleted == 0:
            return _json_err('Asignación no encontrada', status=404)

        # Solo poner HABILITADO si no tiene otras asignaciones activas
        otras = AsignacionColaborador.objects.filter(
            g216_dispositivo_id=dispositivo_id
        ).exists()
        Dispositivo.objects.filter(pk=dispositivo_id).update(
            g212_estado_id=3 if otras else ESTADO_DISP_LIBRE
        )

        # Recalcular estado del colaborador
        total = AsignacionColaborador.objects.filter(g216_colaborador=c).count()
        c.g215_estado_id = ESTADO_COLAB_CON_DISP if total > 0 else ESTADO_COLAB_SIN_DISP
        c.save(update_fields=['g215_estado_id'])

    return _json_ok({'colaborador_id': colaborador_id, 'asignados': total})



# ENDPOINT: CARGA MASIVA DE CELULARES DESDE EXCEL
@csrf_exempt
@login_required(login_url='login')
@require_http_methods(['POST'])
def api_carga_masiva(request):
    """
    Importa dispositivos desde un archivo Excel (.xlsx / .xls).
    Recibe:
        archivo          — archivo Excel
        tipo_dispositivo — nombre exacto del tipo (Ej: CELULAR, PORTATIL…)

    Por cada fila crea:
        1. Registro en j212_dispositivo  (campos comunes a todos los tipos)
        2. Registro en la tabla de características según el tipo:
              CELULAR / TABLET / MODEM WIFI / SIMCARD / TELEFONO FIJO → j223_caract_movil
              PORTATIL / TORRE DE ESCRITORIO                          → j222_caract_pc
              PANTALLA                                                → j224_caract_pantalla
              IMPRESORA                                               → j225_caract_impresora
              PERIFERICO                                              → j226_caract_periferico
              VIDEO BEAM                                              → solo j212, sin característica

    Respuesta JSON:
        { creados: N, omitidos: N, errores: [ {fila, serial, error} ] }
    """
    import openpyxl
    from decimal import Decimal, InvalidOperation

    #  1. Validar archivo 
    archivo = request.FILES.get('archivo')
    if not archivo:
        return _json_err('Se requiere el archivo Excel (campo "archivo")')

    nombre = archivo.name.lower()
    if not (nombre.endswith('.xlsx') or nombre.endswith('.xls')):
        return _json_err('Solo se aceptan archivos .xlsx o .xls')

    #  2. Leer tipo_dispositivo del request 
    tipo_nombre = request.POST.get('tipo_dispositivo', '').strip().upper()
    if not tipo_nombre:
        return _json_err('Se requiere el campo "tipo_dispositivo"')

    tipo_obj = TipoDispositivo.objects.filter(
        g200_tipo_dispositivo__iexact=tipo_nombre
    ).first()
    if not tipo_obj:
        return _json_err(
            f'El tipo de dispositivo "{tipo_nombre}" no existe en el catálogo. '
            f'Verifica que esté registrado en Tipo Dispositivo.'
        )

    #  3. Leer workbook 
    try:
        wb = openpyxl.load_workbook(archivo, read_only=True, data_only=True)
        ws = wb.active
        filas = list(ws.iter_rows(values_only=True))
    except Exception as e:
        return _json_err(f'No se pudo leer el archivo: {e}')

    if len(filas) < 2:
        return _json_err('El archivo no tiene datos (solo encabezado o está vacío)')

    # ── 4. Mapear columnas por nombre (case-insensitive) ───────────
    encabezado = [
        str(c).strip().lower().replace(' ', '_') if c else ''
        for c in filas[0]
    ]

    # Alias: nombre canónico → posibles nombres en el Excel
    ALIAS = {
        'serial':              ['serial', 'serial_del_dispositivo'],
        'marca':               ['marca'],
        'propietario':         ['propietario', 'nombre_del_propietario'],
        'centro_operaciones':  ['centro_operaciones', 'co', 'centro_de_operaciones'],
        'departamento':        ['departamento'],
        'municipio':           ['municipio'],
        'observaciones':       ['observaciones', 'obs'],
        'nombre':              ['nombre', 'nombre_del_equipo', 'nombre_equipo'],
        'valor_promedio':      ['valor_promedio', 'valor'],
        'valor_arrendamiento': ['valor_arrendamiento', 'arrend'],
        # ── PC / Portátil ──
        'procesador':          ['procesador'],
        'ram':                 ['ram'],
        'disco':               ['disco', 'tipo_disco', 'tipo_de_disco'],
        'almacenamiento':      ['almacenamiento', 'capacidad'],
        'so':                  ['so', 'sistema_operativo'],
        'antivirus':           ['antivirus'],
        'licencia_office':     ['licencia_office', 'licencia'],
        'tipo_licencia': ['tipo_licencia', 'tipo_de_licencia', 'licencia'],
        'correo_office':       ['correo_office', 'correo'],
        'activo':              ['activo'],
        'pulgadas':            ['pulgadas'],
        # ── Móvil ──
        'numero_linea':        ['numero_linea', 'numero', 'linea'],
        'operador':            ['operador'],
        'imei1':               ['imei1', 'imei_1', 'imei'],
        'imei2':               ['imei2', 'imei_2'],
        'plan_datos':          ['plan_datos', 'plan_de_datos'],
        'cuenta_email':        ['cuenta_email', 'cuenta_de_email', 'email', 'gmail'],
        'contrasena':          ['contrasena', 'contraseña', 'contrasena_gmail', 'password'],
        # ── Pantalla ──
        'resolucion':          ['resolucion', 'resolución'],
        # ── Impresora ──
        'tipo_impresora':      ['tipo_impresora'],
        'funcion':             ['funcion', 'función'],
        # ── Periférico ──
        'base':                ['base'],
        'teclado':             ['teclado'],
        'mouse':               ['mouse'],
        'auriculares':         ['auriculares'],
        'cargador_pc':         ['cargador_pc'],
        'cargador_movil':      ['cargador_movil', 'cargador_móvil'],
    }

    def _idx(campo):
        for alias in ALIAS.get(campo, [campo]):
            if alias in encabezado:
                return encabezado.index(alias)
        return None

    idx = {campo: _idx(campo) for campo in ALIAS}

    def _val(fila, campo):
        i = idx.get(campo)
        if i is None or i >= len(fila):
            return ''
        v = fila[i]
        return str(v).strip() if v is not None else ''

    def _bool(fila, campo):
        v = _val(fila, campo).upper()
        return v in ('SI', 'SÍ', 'YES', 'TRUE', '1', 'S')

    def _decimal(fila, campo):
        s = _val(fila, campo).replace(',', '.').replace('$', '').replace(' ', '')
        try:
            return Decimal(s) if s else None
        except InvalidOperation:
            return None

    # ── 5. Validar columna serial obligatoria ──────────────────────
    if idx['serial'] is None:
        return _json_err(
            f'Columna "serial" no encontrada. '
            f'Columnas detectadas: {", ".join(encabezado)}'
        )

   # ── 6. Cargar cachés (evita N+1 queries) ──────────────────────
    marcas_cache      = {m.g202_marca.upper(): m       for m in Marca.objects.all() if m.g202_marca}
    propiet_cache     = {p.g203_propietario.upper(): p for p in Propietario.objects.all() if p.g203_propietario}
    co_cache          = {c.g207_co.upper(): c          for c in CentroOperaciones.objects.all() if c.g207_co}
    dpto_cache        = {d.g204_departamento.upper(): d for d in Departamento.objects.all() if d.g204_departamento}
    muni_cache        = {
        (m.g205_municipio.upper(), m.g205_departamento_id): m
        for m in Municipio.objects.select_related('g205_departamento').all()
        if m.g205_municipio
    }
    proce_cache       = {p.g209_procesador.upper(): p  for p in Procesador.objects.all() if p.g209_procesador}
    so_cache          = {s.g210_so.upper(): s          for s in SistemaOperativo.objects.all() if s.g210_so}
    antivirus_cache   = {a.g208_antivirus.upper(): a   for a in Antivirus.objects.all() if a.g208_antivirus}
    licencia_cache    = {l.g211_office.upper(): l      for l in LicenciaOffice.objects.all() if l.g211_office}
    ram_cache         = {r.g230_ram.upper(): r         for r in RAM.objects.all() if r.g230_ram}
    disco_cache       = {d.g231_tipo_disco.upper(): d  for d in TipoDisco.objects.all() if d.g231_tipo_disco}
    alm_cache         = {a.g219_almacenamiento.upper(): a for a in Almacenamiento.objects.all() if a.g219_almacenamiento}
    operador_cache    = {o.g221_operador.upper(): o    for o in Operador.objects.all() if o.g221_operador}
    timpres_cache     = {t.g229_tipo_impresora.upper(): t for t in TipoImpresora.objects.all() if t.g229_tipo_impresora}

    estado_default = Estado.objects.filter(
        g201_descripcion__iexact='HABILITADO'
    ).first()

    # ── 7. Helpers para resolver FK por nombre ─────────────────────
    def _get_or_create_simple(cache, Model, campo_modelo, nombre):
        """Busca en caché o crea el registro si no existe."""
        key = nombre.upper()
        if key in cache:
            return cache[key]
        obj, _ = Model.objects.get_or_create(
            **{f'{campo_modelo}__iexact': nombre},
            defaults={campo_modelo: nombre.title()}
        )
        cache[key] = obj
        return obj

    def _resolve_marca(fila):
        n = _val(fila, 'marca').upper()
        if not n:
            return None
        obj = marcas_cache.get(n)
        if not obj:
            obj, _ = Marca.objects.get_or_create(
                g202_marca__iexact=n,
                defaults={'g202_marca': n.title(), 'g202_estado': True}
            )
            marcas_cache[n] = obj
        return obj

    def _resolve_dpto_muni(fila):
        dpto_n = _val(fila, 'departamento').upper()
        muni_n = _val(fila, 'municipio').upper()
        dpto_obj = muni_obj = None
        if dpto_n:
            dpto_obj = dpto_cache.get(dpto_n)
            # Si no existe en BD → no crear, dejar null y advertir
            if not dpto_obj:
                try:
                    dpto_obj = Departamento.objects.get(g204_departamento__iexact=dpto_n)
                    dpto_cache[dpto_n] = dpto_obj
                except Departamento.DoesNotExist:
                    dpto_obj = None  # se guardará como null en el registro
        if muni_n and dpto_obj:
            key = (muni_n, dpto_obj.g204_id)
            muni_obj = muni_cache.get(key)
            if not muni_obj:
                try:
                    muni_obj = Municipio.objects.get(
                        g205_municipio__iexact=muni_n,
                        g205_departamento=dpto_obj,
                    )
                    muni_cache[key] = muni_obj
                except Municipio.DoesNotExist:
                    muni_obj = None  # se guardará como null en el registro
        return dpto_obj, muni_obj

    # ── 8. Agrupar tipos por familia de característica ─────────────
    FAMILIA_MOVIL     = {'CELULAR', 'TABLET', 'MODEM WIFI', 'SIMCARD', 'TELEFONO FIJO', 'TELÉFONO FIJO'}
    FAMILIA_PC        = {'PORTATIL', 'PORTÁTIL', 'TORRE DE ESCRITORIO', 'TORRE'}
    FAMILIA_PANTALLA  = {'PANTALLA', 'MONITOR'}
    FAMILIA_IMPRESORA = {'IMPRESORA'}
    FAMILIA_PERIFERICO = {'PERIFERICO', 'PERIFÉRICO'}
    FAMILIA_LICENCIA  = {'LICENCIA OFFICE', 'LICENCIA'}
    # VIDEO BEAM y otros → solo j212, sin tabla de características

    tipo_upper = tipo_nombre.upper()

    # ── 9. Procesar filas ──────────────────────────────────────────
    creados  = 0
    omitidos = 0
    errores  = []

    for num_fila, fila in enumerate(filas[1:], start=2):

        serial = _val(fila, 'serial')
        if not serial:
            omitidos += 1
            errores.append({
                'fila': num_fila,
                'serial': '(vacío)',
                'error': 'Fila omitida — campo serial vacío'
            })
            continue

        # Verificar duplicado
        if Dispositivo.objects.filter(g212_serial=serial).exists():
            omitidos += 1
            errores.append({
                'fila': num_fila,
                'serial': serial,
                'error': 'Serial duplicado — ya existe en inventario'
            })
            continue

        try:
            with transaction.atomic():

                # ── Campos comunes j212 ──────────────────────────
                dpto_obj, muni_obj = _resolve_dpto_muni(fila)
                co_nombre = _val(fila, 'centro_operaciones').upper()
                co_obj = co_cache.get(co_nombre) if co_nombre else None

                disp = Dispositivo.objects.create(
                    g212_serial          = serial,
                    g212_tipo            = tipo_obj,
                    g212_marca           = _resolve_marca(fila),
                    g212_propietario     = propiet_cache.get(_val(fila, 'propietario').upper()),
                    g212_estado          = estado_default,
                    g212_co              = co_obj,
                    g212_nombre_equipo   = _val(fila, 'nombre') or None,
                    g212_departamento    = dpto_obj,
                    g212_municipio       = muni_obj,
                    g212_valor_promedio      = _decimal(fila, 'valor_promedio'),
                    g212_valor_arrendamiento = _decimal(fila, 'valor_arrendamiento'),
                    g212_observaciones   = _val(fila, 'observaciones') or None,
                )

                # ── Características según familia ────────────────

                if tipo_upper in FAMILIA_MOVIL:
                    op_n = _val(fila, 'operador').upper()
                    CaracteristicaMovil.objects.create(
                        g223_dispositivo      = disp,
                        g223_numero_linea     = _val(fila, 'numero_linea') or None,
                        g223_operador         = operador_cache.get(op_n) if op_n else None,
                        g223_plan_datos       = _val(fila, 'plan_datos') or None,
                        g223_imei1            = _val(fila, 'imei1') or None,
                        g223_imei2            = _val(fila, 'imei2') or None,
                        g223_cuenta_gmail     = _val(fila, 'cuenta_email') or None,
                        g223_contrasena_gmail = _val(fila, 'contrasena') or None,
                        g223_pulgadas         = _decimal(fila, 'pulgadas'),
                        g223_almacenamiento   = alm_cache.get(_val(fila, 'almacenamiento').upper()) if _val(fila, 'almacenamiento') else None,
                    )

                elif tipo_upper in FAMILIA_PC:
                    pro_n = _val(fila, 'procesador').upper()
                    so_n  = _val(fila, 'so').upper()
                    ant_n = _val(fila, 'antivirus').upper()
                    lic_n = _val(fila, 'licencia_office').upper()
                    ram_n = _val(fila, 'ram').upper()
                    dis_n = _val(fila, 'disco').upper()
                    alm_n = _val(fila, 'almacenamiento').upper()
                    CaracteristicaPC.objects.create(
                        g222_dispositivo    = disp,
                        g222_procesador     = proce_cache.get(pro_n) if pro_n else None,
                        g222_so             = so_cache.get(so_n) if so_n else None,
                        g222_antivirus      = antivirus_cache.get(ant_n) if ant_n else None,
                        g222_licencia       = licencia_cache.get(lic_n) if lic_n else None,
                        g222_ram            = ram_cache.get(ram_n) if ram_n else None,
                        g222_tipo_disco     = disco_cache.get(dis_n) if dis_n else None,
                        g222_almacenamiento = alm_cache.get(alm_n) if alm_n else None,
                        g222_correo_office  = _val(fila, 'correo_office') or None,
                        g222_activo         = _val(fila, 'activo') or None,
                        g222_pulgadas       = _decimal(fila, 'pulgadas'),
                    )

                elif tipo_upper in FAMILIA_PANTALLA:
                    CaracteristicaPantalla.objects.create(
                        g224_dispositivo = disp,
                        g224_pulgadas    = _decimal(fila, 'pulgadas'),
                        g224_resolucion  = _val(fila, 'resolucion') or None,
                    )

                elif tipo_upper in FAMILIA_IMPRESORA:
                    ti_n = _val(fila, 'tipo_impresora').upper()
                    CaracteristicaImpresora.objects.create(
                        g225_dispositivo    = disp,
                        g225_tipo_impresora = timpres_cache.get(ti_n) if ti_n else None,
                        g225_funcion        = _val(fila, 'funcion') or None,
                    )

                elif tipo_upper in FAMILIA_PERIFERICO:
                    CaracteristicaPeriferico.objects.create(
                        g226_dispositivo          = disp,
                        g226_incluye_base         = _bool(fila, 'base'),
                        g226_incluye_teclado      = _bool(fila, 'teclado'),
                        g226_incluye_mouse        = _bool(fila, 'mouse'),
                        g226_incluye_auriculares  = _bool(fila, 'auriculares'),
                        g226_incluye_cargador     = _bool(fila, 'cargador_pc') or _bool(fila, 'cargador_movil'),
                        g226_descripcion_adicional = _val(fila, 'observaciones') or None,
                    )
                
                elif tipo_upper in FAMILIA_LICENCIA:
                    CaracteristicaLicencia.objects.create(
                        g227_dispositivo = disp,
                        g227_software    = _val(fila, 'tipo_licencia') or None,
                        g227_version     = _val(fila, 'modelo') or None,
                        g227_key         = None,
                        g227_correo      = None,
                        g227_fecha_vencimiento = None,
                    )
                   # VIDEO BEAM y otros: solo j212, no se crea tabla de características 
            creados += 1
            
             # Historial automático — ingreso al inventario
            _registrar_historial_auto(
                    dispositivo   = disp,
                    nombre_novedad = 'INGRESO AL INVENTARIO',
                    responsable   = request.user.get_full_name() or request.user.username,
                    observaciones = f'Carga masiva — tipo: {tipo_nombre}',
                    co            = disp.g212_co,
                )
            
            

        except Exception as e:
            omitidos += 1
            errores.append({'fila': num_fila, 'serial': serial, 'error': str(e)})

    return _json_ok({
        'creados':  creados,
        'omitidos': omitidos,
        'errores':  errores,
    })
    
#GESTION DE USUARIOS   
import datetime
from django.contrib.auth.decorators import login_required
from django.contrib.auth.hashers import make_password


DB = 'requerimientos'

@login_required
@require_GET
def api_req_centros_operacion(request):
    """Lista de CentroOperacion para el select del modal de usuarios."""
    cos = CentroOperacion.objects.using(DB).order_by('Descripcion')
    data = [{'id': c.IdCo, 'nombre': c.Descripcion} for c in cos]
    return JsonResponse({'ok': True, 'results': data})


@login_required
@require_GET
def api_req_cargos(request):
    """Lista de Cargo para el select del modal de usuarios."""
    cargos = Cargo.objects.using(DB).order_by('Descripcion')
    data = [{'id': c.IdCargo, 'nombre': c.Descripcion} for c in cargos]
    return JsonResponse({'ok': True, 'results': data})


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
    cargos_map = {c.IdCargo: c.Descripcion        for c in Cargo.objects.using(DB).filter(IdCargo__in=cargo_ids)}
    cos_map    = {c.IdCo: c.Descripcion           for c in CentroOperacion.objects.using(DB).filter(IdCo__in=co_ids)}
    tipos_map  = {t.idTipoUsuario: t.Descripcion for t in TipoUsuario.objects.using(DB).filter(idTipoUsuario__in=tipo_ids)}

    data = [{
    'id':              u.IdUsuario,
    'cedula':          u.Cedula,
    'nombre':          u.NombreCompleto,
    'cargo':           cargos_map.get(u.IdCargo, ''),
    'cargo_id':        u.IdCargo or '',
    'co':              cos_map.get(u.IdCO, ''),
    'co_id':           u.IdCO or '',
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
        tipo = body.get('tipo_usuario') or None 
        id_co    = body.get('co_id', '').strip()        # ← era 'id_co'
        id_cargo = body.get('cargo_id') or None          # ← era 'id_cargo'

        if not cedula or not nombre or not password:
            return JsonResponse({'ok': False, 'error': 'Cédula, nombre y contraseña son requeridos'}, status=400)
        if not id_co:
            return JsonResponse({'ok': False, 'error': 'El Centro de Operación es requerido'}, status=400)
        if Usuario.objects.using(DB).filter(Cedula=cedula).exists():
            return JsonResponse({'ok': False, 'error': 'Ya existe un usuario con esa cédula'}, status=400)

        u = Usuario(
            Cedula         = cedula,
            NombreCompleto = nombre,
            Email          = correo,
            Contrasena     = make_password(password),
            TipoUsuario    = tipo,
            FechaCreacion  = datetime.datetime.now(),
            Estado         = 1,
            IdCO           = id_co,     # ← NUEVO
            IdCargo        = id_cargo,  # ← NUEVO
        )
        u.save(using=DB)
        return JsonResponse({'ok': True, 'id': u.IdUsuario})
    except Exception as e:
        return JsonResponse({'ok': False, 'error': str(e)}, status=500)
    
    
@login_required
@require_GET
def api_req_tipos_usuario(request):
    tipos = TipoUsuario.objects.using(DB).order_by('Descripcion')
    data = [{'id': t.idTipoUsuario, 'nombre': t.Descripcion} for t in tipos]
    return JsonResponse({'ok': True, 'results': data})




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
    
    
    
# ─────────────────────────────────────────────
# REQUERIMIENTOS ASIGNADOS AL TÉCNICO EN SESIÓN
# ─────────────────────────────────────────────
from requerimientos.models import Requerimiento, Categoria, SubCategoria,Prioridad

@login_required(login_url='login')
@require_http_methods(['GET'])
def api_mis_req_tic(request):
    """Requerimientos asignados al técnico que inició sesión."""
    from requerimientos.models import Cargo as CargoReq, TipoRequerimiento, Clasificacion as ClasificacionReq

    user_id = request.session.get('req_user_id')
    if not user_id:
        return _json_err('Tu usuario no está vinculado a la BD de requerimientos', 403)

    ESTADOS       = {1:'Abierto', 2:'Asignado', 3:'En Proceso', 4:'Cerrado', 5:'Eliminado', 6:'Calificado'}
    PRIORIDADES   = {p.IdPrioridad: p.Descripcion for p in Prioridad.objects.using('requerimientos').all()}
    CATEGORIAS    = {c.IdCategoria: c.Descripcion for c in Categoria.objects.using('requerimientos').all()}
    SUBCATEGORIAS = {s.IdSubCategoria: s.Descripcion for s in SubCategoria.objects.using('requerimientos').all()}
    TIPOS         = {t.IdTipoReque: t.Descripcion for t in TipoRequerimiento.objects.using('requerimientos').all()}
    CARGOS        = {c.IdCargo: c.Descripcion for c in CargoReq.objects.using('requerimientos').all()}
    CLASIFICAC    = {c.IdClasificacion: c.Clasificacion for c in ClasificacionReq.objects.using('requerimientos').all()}

    qs = (Requerimiento.objects
          .using('requerimientos')
          .filter(IdUsuarioAsig=user_id)
          .exclude(IdEstado=5)
          .order_by('-Fecha'))

    data = []
    for r in qs:
        data.append({
            'codigo':             r.codigo(),
            'id':                 r.Codigo,
            'solicitante':        r.NombreUsuario or '—',
            'cedula':             str(r.CedulaUsuario or ''),
            'documento':          r.CedulaUsuario or '',
            'correo':             r.Email or '',
            'cargo':              CARGOS.get(r.Cargo, '—'),
            'co':                 r.CO or '—',
            'centro_operacion':   r.CO or '—',
            'requerimiento':      r.Requerimiento or '',
            'tipo_requerimiento': TIPOS.get(r.IdTipoReq, '—'),
            'categoria':          CATEGORIAS.get(r.IdCategoria, '—'),
            'subcategoria':       SUBCATEGORIAS.get(r.IdSubCategoria, '—'),
            'clasificacion':      CLASIFICAC.get(r.Clasificacion, 'Sin información'),
            'costo':              str(r.Costo) if r.Costo else '',
            'estado':             ESTADOS.get(r.IdEstado, '—'),
            'estado_id':          r.IdEstado or 0,
            'prioridad':          PRIORIDADES.get(r.IdPrioridad, '—'),
            'fecha':              str(r.Fecha) if r.Fecha else '',
            'vencimiento':        str(r.FechaEstiSoluci) if r.FechaEstiSoluci else '',
            'plan_accion':        r.PlanAccion or '',
            'solucion':           r.Solucion or '',
            'fecha_solucion':     str(r.FechaRealSoluci) if r.FechaRealSoluci else '',
            'categoria_id':       r.IdCategoria,
            'subcategoria_id':    r.IdSubCategoria,
            'id_usuario_asig':    r.IdUsuarioAsig,
        })

    return _json_ok({'requerimientos': data, 'total': len(data)})


@login_required(login_url='login')
@csrf_exempt
@require_http_methods(['POST'])
def api_req_tic_accion(request, req_id):
    """
    Actualiza plan de acción, reasignación o solución de un requerimiento.
    body = {
      accion: 'plan' | 'reasignar' | 'solucionar',
      plan_accion: '...',
      id_usuario_asig: 5,       (solo para reasignar)
      solucion: '...',          (solo para solucionar)
      fecha_solucion: 'YYYY-MM-DD'
    }
    """
    user_id = request.session.get('req_user_id')
    if not user_id:
        return _json_err('Sin permiso', 403)

    try:
        r = Requerimiento.objects.using('requerimientos').get(Codigo=req_id)
    except Requerimiento.DoesNotExist:
        return _json_err('Requerimiento no encontrado', 404)

    body   = json.loads(request.body)
    accion = body.get('accion')

    if accion == 'plan':
        r.PlanAccion = body.get('plan_accion', '').strip()
        r.IdEstado   = 3  # En Proceso
        r.save(using='requerimientos')

    elif accion == 'reasignar':
        nuevo_id = body.get('id_usuario_asig')
        if not nuevo_id:
            return _json_err('id_usuario_asig requerido')
        from requerimientos.models import Usuario as UsuarioReq
        try:
            nuevo = UsuarioReq.objects.using('requerimientos').get(IdUsuario=nuevo_id)
        except UsuarioReq.DoesNotExist:
            return _json_err('Usuario destino no encontrado')
        r.IdUsuarioAsig    = nuevo.IdUsuario
        r.NombreUsuariAsig = nuevo.NombreCompleto
        r.IdEstado         = 2  # Asignado

        categoria_id    = body.get('categoria_id')
        subcategoria_id = body.get('subcategoria_id')
        if categoria_id:
            r.IdCategoria = categoria_id
        if subcategoria_id:
            r.IdSubCategoria = subcategoria_id

        r.save(using='requerimientos')

    elif accion == 'solucionar':
        solucion = body.get('solucion', '').strip()
        fecha    = body.get('fecha_solucion')
        costo    = body.get('costo')
        plan     = body.get('plan_accion')

        if not solucion:
            return _json_err('La solución no puede estar vacía')

        r.Solucion        = solucion
        r.FechaRealSoluci = fecha or None
        r.IdEstado        = 4

        if plan is not None:
            r.PlanAccion = plan.strip()
        if costo not in (None, ''):
            try:
                r.Costo = costo
            except (TypeError, ValueError):
                return _json_err('Costo inválido')

        r.save(using='requerimientos')

    else:
        return _json_err('Acción no válida. Use: plan | reasignar | solucionar')

    return _json_ok({'codigo': r.codigo(), 'estado_id': r.IdEstado})


@login_required(login_url='login')
@require_http_methods(['GET'])
def api_todos_req_tic(request):
    """Todos los requerimientos pendientes/en curso, para la pantalla de Asignar/Plan/Solución."""
    from requerimientos.models import Cargo as CargoReq, TipoRequerimiento, Clasificacion as ClasificacionReq

    ESTADOS       = {1:'Abierto', 2:'Asignado', 3:'En Proceso', 4:'Cerrado', 5:'Eliminado', 6:'Calificado'}
    PRIORIDADES   = {p.IdPrioridad: p.Descripcion for p in Prioridad.objects.using('requerimientos').all()}
    CATEGORIAS    = {c.IdCategoria: c.Descripcion for c in Categoria.objects.using('requerimientos').all()}
    SUBCATEGORIAS = {s.IdSubCategoria: s.Descripcion for s in SubCategoria.objects.using('requerimientos').all()}
    TIPOS         = {t.IdTipoReque: t.Descripcion for t in TipoRequerimiento.objects.using('requerimientos').all()}
    CARGOS        = {c.IdCargo: c.Descripcion for c in CargoReq.objects.using('requerimientos').all()}
    CLASIFICAC    = {c.IdClasificacion: c.Clasificacion  for c in ClasificacionReq.objects.using('requerimientos').all()}

    qs = (Requerimiento.objects
          .using('requerimientos')
          .exclude(IdEstado__in=[4, 5, 6])
          .order_by('-Fecha'))

    data = []
    for r in qs:
        data.append({
            'id':                 r.Codigo,
            'codigo':             r.codigo(),
            'descripcion':        r.Requerimiento or '',
            'fecha':              str(r.Fecha) if r.Fecha else '',
            'solicitante':        r.NombreUsuario or '—',
            'documento':          r.CedulaUsuario or '',
            'correo':             r.Email or '',
            'cargo':              CARGOS.get(r.Cargo, '—'),
            'centro_operacion':   r.CO or '—',
            'tipo_requerimiento': TIPOS.get(r.IdTipoReq, '—'),
            'categoria':          CATEGORIAS.get(r.IdCategoria, '—'),
            'subcategoria':       SUBCATEGORIAS.get(r.IdSubCategoria, '—'),
            'prioridad':          PRIORIDADES.get(r.IdPrioridad, '—'),
            'fecha_vencimiento':  str(r.FechaEstiSoluci) if r.FechaEstiSoluci else '',
            'asignado':           r.NombreUsuariAsig or '',
            'estado':             ESTADOS.get(r.IdEstado, '—'),
            'clasificacion':      CLASIFICAC.get(r.Clasificacion, 'No hay Clasificación'),
            'categoria_id':       r.IdCategoria,
            'subcategoria_id':    r.IdSubCategoria,
            'plan_accion':        r.PlanAccion or '',
            'costo':              str(r.Costo) if r.Costo else '',
            'archivo_acciones':   '',
        })
    return _json_ok({'requerimientos': data, 'total': len(data)})


@login_required(login_url='login')
@require_http_methods(['GET'])
def api_colaboradores_ti(request):
    """Lista simple de usuarios activos (solo técnicos, TipoUsuario 7 u 8) para el selector de asignación."""
    qs = (Usuario.objects
          .using('requerimientos')
          .filter(Estado=1, TipoUsuario__in=[7, 8])
          .order_by('NombreCompleto'))
    data = [{'id': u.IdUsuario, 'nombre': u.NombreCompleto} for u in qs]
    return _json_ok(data)


@login_required(login_url='login')
@require_http_methods(['GET'])
def api_historial_req_tic(request):
    """
    Todos los requerimientos, sin importar el estado (incluye Cerrado
    y Calificado), para la pantalla de Historial de Requerimientos.
    """
    ESTADOS = {1: 'PENDIENTE', 2: 'ASIGNADO', 3: 'EN PROCESO', 4: 'CERRADO', 5: 'ELIMINADO', 6: 'CALIFICADO'}
    PRIORIDADES = {1: 'ALTA', 2: 'MEDIA', 3: 'BAJA'}

    qs = (Requerimiento.objects
          .using('requerimientos')
          .exclude(IdEstado=5)   # oculta solo los eliminados
          .order_by('-Fecha'))

    data = []
    for r in qs:
        estado_id = r.IdEstado or 0
        data.append({
            'id':                  r.Codigo,
            'consecutivo':         r.codigo(),
            'fecha_requerimiento': str(r.Fecha) if r.Fecha else '',
            'remitente':           r.NombreUsuario or '—',
            'descripcion':         r.Requerimiento or '',
            'prioridad':           PRIORIDADES.get(r.IdPrioridad, ''),
            'asignado':            r.NombreUsuariAsig or '',
            'clasificacion':       str(r.Clasificacion) if r.Clasificacion else '',
            'plan_accion':         r.PlanAccion or '',
            'fecha_solucion':      str(r.FechaRealSoluci) if r.FechaRealSoluci else '',
            'solucion':            r.Solucion or '',
            'estado':              ESTADOS.get(estado_id, str(estado_id)),
        })

    return _json_ok({'requerimientos': data, 'total': len(data)})



@login_required(login_url='login')
@require_http_methods(['GET'])
def api_categorias_req(request):
    """Lista de categorías reales (mm_Categoria) para el modal de Asignar."""
    qs = Categoria.objects.using('requerimientos').order_by('Descripcion')
    data = [{'id': c.IdCategoria, 'descripcion': c.Descripcion} for c in qs]
    return _json_ok(data)


@login_required(login_url='login')
@require_http_methods(['GET'])
def api_subcategorias_req(request):
    """Lista de subcategorías (mm_SubCategoria) filtradas por categoria_id."""
    categoria_id = request.GET.get('categoria_id')
    qs = SubCategoria.objects.using('requerimientos').order_by('Descripcion')
    if categoria_id:
        qs = qs.filter(IdCategoria=categoria_id)
    data = [{'id': s.IdSubCategoria, 'descripcion': s.Descripcion, 'categoria_id': s.IdCategoria} for s in qs]
    return _json_ok(data)



# INDICADORES — Panel de requerimientos
# ─────────────────────────────────────────────
@login_required(login_url='login')
@require_http_methods(['GET'])
def api_indicadores_resumen(request):
    """
    Tarjetas de resumen: asignados / sin asignar / en proceso / finalizados.
    Cuenta sobre TODOS los requerimientos vigentes (excluye eliminados).
    """
    qs = Requerimiento.objects.using('requerimientos').exclude(IdEstado=5)

    data = {
        'asignados':   qs.filter(IdEstado=2).count(),
        'sin_asignar': qs.filter(IdEstado=1).count(),
        'en_proceso':  qs.filter(IdEstado=3).count(),
        'finalizados': qs.filter(IdEstado__in=[4, 6]).count(),
    }
    return _json_ok(data)


@login_required(login_url='login')
@require_http_methods(['GET'])
def api_indicadores_tendencia(request):
    """
    Serie diaria de requerimientos por estado (Abiertos / Asignado / En Proceso / Cerrados)
    dentro de un rango de días, con filtro opcional de categoría y subcategoría.
    También calcula el % de cumplimiento (solucionados a tiempo) del rango.

      ?dias=            30 | 15 | 60 | 90   (default 30)
      ?categoria_id=    id de mm_Categoria (opcional)
      ?subcategoria_id= id de mm_SubCategoria (opcional)
    """
    from datetime import date, timedelta

    try:
        dias = int(request.GET.get('dias', 30))
    except (TypeError, ValueError):
        dias = 30
    dias = max(1, min(dias, 365))

    categoria_id    = request.GET.get('categoria_id') or None
    subcategoria_id = request.GET.get('subcategoria_id') or None

    fecha_fin   = date.today()
    fecha_inicio = fecha_fin - timedelta(days=dias)

    qs = (Requerimiento.objects
          .using('requerimientos')
          .exclude(IdEstado=5)
          .filter(Fecha__gte=fecha_inicio, Fecha__lte=fecha_fin))

    if categoria_id:
        qs = qs.filter(IdCategoria=categoria_id)
    if subcategoria_id:
        qs = qs.filter(IdSubCategoria=subcategoria_id)

    # Construir un diccionario fecha -> conteos por estado
    dias_map = {}
    d = fecha_inicio
    while d <= fecha_fin:
        dias_map[d] = {'abiertos': 0, 'asignado': 0, 'en_proceso': 0, 'cerrados': 0}
        d += timedelta(days=1)

    for r in qs:
        if not r.Fecha or r.Fecha not in dias_map:
            continue
        if r.IdEstado == 1:
            dias_map[r.Fecha]['abiertos'] += 1
        elif r.IdEstado == 2:
            dias_map[r.Fecha]['asignado'] += 1
        elif r.IdEstado == 3:
            dias_map[r.Fecha]['en_proceso'] += 1
        elif r.IdEstado in (4, 6):
            dias_map[r.Fecha]['cerrados'] += 1

    serie = [
        {
            'fecha':      f.strftime('%Y-%m-%d'),
            'abiertos':   v['abiertos'],
            'asignado':   v['asignado'],
            'en_proceso': v['en_proceso'],
            'cerrados':   v['cerrados'],
        }
        for f, v in sorted(dias_map.items())
    ]

    # % de cumplimiento: solucionados dentro del rango, a tiempo vs. total solucionados
    cerrados_qs = qs.filter(IdEstado__in=[4, 6])
    total_cerrados = cerrados_qs.count()
    a_tiempo = cerrados_qs.filter(
        FechaRealSoluci__isnull=False,
        FechaEstiSoluci__isnull=False,
        FechaRealSoluci__lte=F('FechaEstiSoluci'),
    ).count()
    pct_cumplimiento = round((a_tiempo / total_cerrados) * 100, 1) if total_cerrados else 0

    return _json_ok({
        'serie':            serie,
        'pct_cumplimiento': pct_cumplimiento,
        'total_cerrados':   total_cerrados,
        'a_tiempo':         a_tiempo,
    })
    

@login_required(login_url='login')
@require_http_methods(['GET'])
def api_indicadores_calificacion(request):
    """
    Calificación de calidad (mv_EvaluacionReq): satisfacción real del usuario
    que reportó el requerimiento, NO la puntualidad del técnico.

      ?dias=            30 | 15 | 60 | 90   (default 30)
      ?categoria_id=    id de mm_Categoria (opcional)
      ?subcategoria_id= id de mm_SubCategoria (opcional)

    Responde:
      promedio             — promedio general (1 a 5) en el rango/filtro
      total_evaluaciones   — cuántas evaluaciones entran en el filtro
      distribucion         — {'1': n, '2': n, '3': n, '4': n, '5': n}
      tendencia            — [{semana, promedio, cantidad}, ...] por semana
    """
    from datetime import date, timedelta
    from collections import defaultdict
    from requerimientos.models import EvaluacionReq

    try:
        dias = int(request.GET.get('dias', 30))
    except (TypeError, ValueError):
        dias = 30
    dias = max(1, min(dias, 365))

    categoria_id    = request.GET.get('categoria_id') or None
    subcategoria_id = request.GET.get('subcategoria_id') or None

    fecha_fin    = date.today()
    fecha_inicio = fecha_fin - timedelta(days=dias)

    # 1. Requerimientos que caen en el filtro (fecha + categoría/subcategoría)
    req_qs = (Requerimiento.objects
              .using('requerimientos')
              .exclude(IdEstado=5)
              .filter(Fecha__gte=fecha_inicio, Fecha__lte=fecha_fin))
    if categoria_id:
        req_qs = req_qs.filter(IdCategoria=categoria_id)
    if subcategoria_id:
        req_qs = req_qs.filter(IdSubCategoria=subcategoria_id)

    codigos_fecha = {r.Codigo: r.Fecha for r in req_qs.only('Codigo', 'Fecha')}
    codigos = list(codigos_fecha.keys())

    # 2. Evaluaciones de esos requerimientos
    evals = list(
        EvaluacionReq.objects
        .using('requerimientos')
        .filter(IdReq__in=codigos, Evaluacion__isnull=False)
        .values('IdReq', 'Evaluacion')
    )

    valores = [e['Evaluacion'] for e in evals if 1 <= (e['Evaluacion'] or 0) <= 5]
    total   = len(valores)
    promedio = round(sum(valores) / total, 2) if total else 0

    distribucion = {str(n): 0 for n in range(1, 6)}
    for v in valores:
        distribucion[str(v)] += 1

    # 3. Tendencia semanal del promedio (agrupado por semana de la fecha del requerimiento)
    semana_map = defaultdict(list)
    for e in evals:
        val = e['Evaluacion']
        if not (1 <= (val or 0) <= 5):
            continue
        fecha_req = codigos_fecha.get(e['IdReq'])
        if not fecha_req:
            continue
        inicio_semana = fecha_req - timedelta(days=fecha_req.weekday())
        semana_map[inicio_semana].append(val)

    tendencia = [
        {
            'semana':   f.strftime('%d/%m'),
            'promedio': round(sum(vs) / len(vs), 2),
            'cantidad': len(vs),
        }
        for f, vs in sorted(semana_map.items())
    ]

    return _json_ok({
        'promedio':           promedio,
        'total_evaluaciones': total,
        'distribucion':       distribucion,
        'tendencia':          tendencia,
    })
