"""
Chat de soporte embebido — endpoints HTTP. Vive en el portal de
autoservicio (sin sesión Django persistente): cada request trae la
cédula del usuario, igual que el resto de requerimientos/views.py
(ver validar_cedula). El estado de vinculación OAuth con Microsoft se
guarda en BD (ChatMicrosoftToken), no en request.session.
"""
import json
import logging

from django.conf import settings
from django.core import signing
from django.http import HttpResponseRedirect, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from . import graph_chat
from .models import Chat, ChatMicrosoftToken, Mensaje, Usuario

DB = 'requerimientos'
logger = logging.getLogger('requerimientos')

OAUTH_STATE_SALT = 'requerimientos.chat.oauth_state'
PREFIJO_APP      = '/SYSTRACK'
URL_RETORNO      = f'{PREFIJO_APP}/requerimiento/'


def _resolver_usuario(cedula):
    cedula = str(cedula or '').strip()
    if not cedula:
        return None
    try:
        return Usuario.objects.using(DB).get(Cedula=cedula, Estado=1)
    except Usuario.DoesNotExist:
        return None


@require_GET
def chat_vincular_inicio(request):
    usuario = _resolver_usuario(request.GET.get('cedula'))
    if not usuario:
        return JsonResponse({'ok': False, 'error': 'Cédula no encontrada o usuario inhabilitado.'}, status=400)

    state = signing.dumps(
        {'id_usuario': usuario.IdUsuario, 'cedula': usuario.Cedula},
        salt=OAUTH_STATE_SALT,
    )
    try:
        url = graph_chat.get_authorization_url(state)
    except graph_chat.ChatNoConfigurado as e:
        return JsonResponse({'ok': False, 'error': str(e)}, status=503)
    return HttpResponseRedirect(url)


@require_GET
def chat_vincular_callback(request):
    if request.GET.get('error'):
        logger.warning('Login Microsoft cancelado/erróneo: %s', request.GET.get('error_description'))
        return HttpResponseRedirect(f'{URL_RETORNO}?chat_link=error')

    code = request.GET.get('code')
    try:
        datos_state = signing.loads(request.GET.get('state', ''), salt=OAUTH_STATE_SALT, max_age=600)
    except signing.BadSignature:
        return HttpResponseRedirect(f'{URL_RETORNO}?chat_link=error')

    if not code:
        return HttpResponseRedirect(f'{URL_RETORNO}?chat_link=error')

    try:
        resultado, cache_cifrado = graph_chat.intercambiar_code_por_token(code)
    except Exception:
        logger.exception('Error intercambiando el código OAuth de Microsoft (IdUsuario=%s)', datos_state.get('id_usuario'))
        return HttpResponseRedirect(f'{URL_RETORNO}?chat_link=error')

    claims = resultado.get('id_token_claims') or {}
    ChatMicrosoftToken.objects.using(DB).update_or_create(
        IdUsuario=datos_state['id_usuario'],
        defaults={
            'Cedula':         datos_state['cedula'],
            'AadObjectId':    claims.get('oid', ''),
            'Upn':            claims.get('preferred_username') or claims.get('upn') or '',
            'MsalTokenCache': cache_cifrado,
            'Activo':         True,
            'UltimoError':    None,
        },
    )
    return HttpResponseRedirect(f'{URL_RETORNO}?chat_link=ok')


@require_GET
def chat_estado(request):
    usuario = _resolver_usuario(request.GET.get('cedula'))
    if not usuario:
        return JsonResponse({'ok': False, 'error': 'Cédula no encontrada.'}, status=400)
    vinculado = ChatMicrosoftToken.objects.using(DB).filter(IdUsuario=usuario.IdUsuario, Activo=True).exists()
    return JsonResponse({'ok': True, 'vinculado': vinculado})


def _preparar_chat(usuario):
    """Devuelve (access_token, chat_row, token_row); (None, None, None) si
    el usuario no está vinculado o el token no se pudo renovar."""
    try:
        token_row = ChatMicrosoftToken.objects.using(DB).get(IdUsuario=usuario.IdUsuario, Activo=True)
    except ChatMicrosoftToken.DoesNotExist:
        return None, None, None

    access_token = graph_chat.obtener_token_delegado(token_row)
    if not access_token:
        token_row.Activo      = False
        token_row.UltimoError = 'No fue posible renovar el token (revocado o expirado). Debe vincular de nuevo.'
        token_row.save(using=DB, update_fields=['Activo', 'UltimoError'])
        return None, None, None

    token_row.FechaUltimoUso = timezone.now()
    token_row.save(using=DB, update_fields=['FechaUltimoUso'])

    chat_row, _creado = Chat.objects.using(DB).get_or_create(
        IdUsuario=usuario.IdUsuario,
        defaults={'Cedula': usuario.Cedula, 'GraphChatId': '', 'CorreoAgente': settings.TEAMS_SUPPORT_EMAIL},
    )
    if not chat_row.GraphChatId:
        chat_row.GraphChatId = graph_chat.crear_chat_uno_a_uno(access_token, token_row.Upn, settings.TEAMS_SUPPORT_EMAIL)
        chat_row.save(using=DB, update_fields=['GraphChatId'])

    return access_token, chat_row, token_row


def _sincronizar_mensajes_entrantes(chat_row, token_row, mensajes_graph):
    """Inserta en BD los mensajes de Graph que todavía no tenemos guardados
    localmente. La dirección se determina comparando el autor del mensaje
    con el AadObjectId del propio usuario — así también se reflejan
    mensajes que el usuario haya mandado directo desde la app de Teams."""
    ids_conocidos = set(
        Mensaje.objects.using(DB)
        .filter(IdChat=chat_row, GraphMessageId__isnull=False)
        .exclude(GraphMessageId='')
        .values_list('GraphMessageId', flat=True)
    )
    for msg in mensajes_graph:
        graph_id = msg.get('id')
        if not graph_id or graph_id in ids_conocidos:
            continue
        cuerpo = graph_chat.texto_desde_body(msg.get('body'))
        if not cuerpo:
            continue  # eventos de sistema del chat (agregado, etc.), sin texto
        remitente_id = ((msg.get('from') or {}).get('user') or {}).get('id')
        direccion    = 'SALIENTE' if remitente_id == token_row.AadObjectId else 'ENTRANTE'
        Mensaje.objects.using(DB).create(
            IdChat=chat_row,
            GraphMessageId=graph_id,
            Direccion=direccion,
            Texto=cuerpo,
            FechaGraph=msg.get('createdDateTime'),
            Leido=(direccion == 'SALIENTE'),
            Estado='enviado',
        )


@csrf_exempt
@require_POST
def chat_enviar_mensaje(request):
    try:
        data = json.loads(request.body)
    except Exception:
        return JsonResponse({'ok': False, 'error': 'Solicitud inválida.'}, status=400)

    usuario = _resolver_usuario(data.get('cedula'))
    if not usuario:
        return JsonResponse({'ok': False, 'error': 'Cédula no encontrada.'}, status=400)

    texto = str(data.get('texto', '')).strip()
    if not texto:
        return JsonResponse({'ok': False, 'error': 'El mensaje no puede estar vacío.'})

    access_token, chat_row, _token_row = _preparar_chat(usuario)
    if not access_token:
        return JsonResponse({'ok': False, 'requiere_vinculacion': True})

    try:
        mensaje_graph = graph_chat.enviar_mensaje(access_token, chat_row.GraphChatId, texto)
        mensaje_local = Mensaje.objects.using(DB).create(
            IdChat=chat_row,
            GraphMessageId=mensaje_graph.get('id', ''),
            Direccion='SALIENTE',
            Texto=texto,
            FechaGraph=mensaje_graph.get('createdDateTime'),
            Leido=True,
            Estado='enviado',
        )
        chat_row.UltimaActividad = timezone.now()
        chat_row.save(using=DB, update_fields=['UltimaActividad'])
    except Exception:
        logger.exception('Error enviando mensaje de chat a Graph (IdUsuario=%s)', usuario.IdUsuario)
        mensaje_local = Mensaje.objects.using(DB).create(
            IdChat=chat_row, Direccion='SALIENTE', Texto=texto, Estado='error',
        )
        return JsonResponse({
            'ok': False,
            'error': 'No se pudo enviar a Microsoft Teams en este momento. Tu mensaje quedó guardado.',
            'mensaje': {
                'id': mensaje_local.IdMensaje, 'direccion': 'SALIENTE', 'texto': texto,
                'estado': 'error', 'fecha': mensaje_local.FechaLocal.isoformat(),
            },
        })

    return JsonResponse({
        'ok': True,
        'mensaje': {
            'id': mensaje_local.IdMensaje, 'direccion': 'SALIENTE', 'texto': texto,
            'estado': 'enviado', 'fecha': mensaje_local.FechaLocal.isoformat(),
        },
    })


@require_GET
def chat_mensajes(request):
    usuario = _resolver_usuario(request.GET.get('cedula'))
    if not usuario:
        return JsonResponse({'ok': False, 'error': 'Cédula no encontrada.'}, status=400)

    access_token, chat_row, token_row = _preparar_chat(usuario)
    if not access_token:
        return JsonResponse({'ok': True, 'requiere_vinculacion': True, 'mensajes': [], 'ultimo_id': 0})

    try:
        mensajes_graph = graph_chat.listar_mensajes(access_token, chat_row.GraphChatId, top=20)
        _sincronizar_mensajes_entrantes(chat_row, token_row, mensajes_graph)
    except Exception:
        logger.exception('Error consultando mensajes de Graph (IdUsuario=%s)', usuario.IdUsuario)

    despues_de = 0
    despues_de_raw = request.GET.get('despues_de')
    qs = Mensaje.objects.using(DB).filter(IdChat=chat_row).order_by('IdMensaje')
    if despues_de_raw:
        try:
            despues_de = int(despues_de_raw)
            qs = qs.filter(IdMensaje__gt=despues_de)
        except ValueError:
            pass

    mensajes = list(qs)
    ids_no_leidos = [m.IdMensaje for m in mensajes if m.Direccion == 'ENTRANTE' and not m.Leido]
    if ids_no_leidos:
        Mensaje.objects.using(DB).filter(IdMensaje__in=ids_no_leidos).update(Leido=True)

    return JsonResponse({
        'ok': True,
        'requiere_vinculacion': False,
        'mensajes': [
            {
                'id': m.IdMensaje,
                'direccion': m.Direccion,
                'texto': m.Texto,
                'fecha': (m.FechaGraph or m.FechaLocal).isoformat(),
                'estado': m.Estado,
            }
            for m in mensajes
        ],
        'ultimo_id': mensajes[-1].IdMensaje if mensajes else despues_de,
    })
