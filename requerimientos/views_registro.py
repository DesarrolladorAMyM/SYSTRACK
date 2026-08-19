import json
import datetime

from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.hashers import make_password

from .models import Usuario, Area, Cargo, CentroOperacion

DB = 'requerimientos'

# Todo usuario que se auto-registre desde el portal público queda con este
# tipo de usuario fijo (1 = Colaborador Limitado). No se pide en el modal,
# se asigna solo porque la columna TipoUsuario no permite NULL en la BD.
ID_TIPO_USUARIO_AUTORREGISTRO = 1


@require_GET
def api_catalogos_registro(request):
    """
    Catálogos para el formulario de auto-registro (Cargo / Centro de Operación / Área).
    El área se carga dinámicamente desde la tabla mm_Area (mismo origen que usa
    la aprobación por jefe de área).
    """
    cargos = list(
        Cargo.objects.using(DB)
        .filter(Estado=1)
        .values('IdCargo', 'Descripcion')
        .order_by('Descripcion')
    )
    centros = list(
        CentroOperacion.objects.using(DB)
        .filter(Estado=1)
        .values('IdCo', 'Descripcion')
        .order_by('Descripcion')
    )
    areas = list(
        Area.objects.using(DB)
        .exclude(IdArea__isnull=True)
        .values('IdArea', 'NombreArea')
        .order_by('NombreArea')
    )
    return JsonResponse({'ok': True, 'cargos': cargos, 'centros': centros, 'areas': areas})


@csrf_exempt
@require_POST
def api_registrar_usuario_req(request):
    """
    Auto-registro de un usuario nuevo desde el portal de requerimientos,
    cuando su documento no existe en mv_Usuarios (validar_cedula lo indica).
    No pide contraseña: el login del portal es solo por número de documento.
    """
    try:
        data = json.loads(request.body)
    except Exception:
        return JsonResponse({'ok': False, 'error': 'Solicitud inválida.'}, status=400)

    cedula   = str(data.get('cedula', '')).strip()
    nombre   = str(data.get('nombre_completo', '')).strip()
    id_cargo = data.get('id_cargo') or None
    id_co    = str(data.get('id_co', '')).strip()
    correo   = str(data.get('correo', '')).strip()
    id_area  = data.get('id_area') or None

    faltantes = []
    if not cedula:
        faltantes.append('Número de documento')
    if not nombre:
        faltantes.append('Nombre completo')
    if not id_cargo:
        faltantes.append('Cargo')
    if not id_co:
        faltantes.append('Centro de operación')
    if not correo:
        faltantes.append('Correo corporativo')
    if not id_area:
        faltantes.append('Área')

    if faltantes:
        return JsonResponse({
            'ok': False,
            'error': 'Faltan campos obligatorios: ' + ', '.join(faltantes)
        }, status=400)

    if Usuario.objects.using(DB).filter(Cedula=cedula).exists():
        return JsonResponse({'ok': False, 'error': 'Ya existe un usuario registrado con ese número de documento.'}, status=400)

    if not Cargo.objects.using(DB).filter(IdCargo=id_cargo).exists():
        return JsonResponse({'ok': False, 'error': 'El cargo seleccionado no es válido.'}, status=400)

    if not CentroOperacion.objects.using(DB).filter(IdCo=id_co).exists():
        return JsonResponse({'ok': False, 'error': 'El centro de operación seleccionado no es válido.'}, status=400)

    if not Area.objects.using(DB).filter(IdArea=id_area).exists():
        return JsonResponse({'ok': False, 'error': 'El área seleccionada no es válida.'}, status=400)

    usuario = Usuario(
        Cedula         = cedula,
        NombreCompleto = nombre,
        IdCargo        = id_cargo,
        IdArea         = id_area,
        IdCO           = id_co,
        Email          = correo,
        Contrasena     = make_password(None),
        FechaCreacion  = datetime.datetime.now(),
        TipoUsuario    = ID_TIPO_USUARIO_AUTORREGISTRO,
        Estado         = 1,
        DatosActualizados = True,
    )
    usuario.save(using=DB)

    return JsonResponse({
        'ok': True,
        'usuario': {
            'id_usuario': usuario.IdUsuario,
            'cedula': usuario.Cedula,
            'nombre_completo': usuario.NombreCompleto,
        }
    })