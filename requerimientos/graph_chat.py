"""
Helpers del chat de soporte embebido: cifrado del cache de tokens MSAL,
construcción del cliente confidencial (OAuth delegado, Authorization Code
flow) y llamadas a Microsoft Graph con el token del usuario. No expone
ninguna vista HTTP — eso vive en views_chat.py.

Reutiliza el mismo App Registration de Azure que ya usa la presencia de
Teams (settings.TEAMS_TENANT_ID/CLIENT_ID/CLIENT_SECRET), con un permiso
delegado adicional (Chat.ReadWrite) configurado del lado de Azure.
"""
import logging
import re

import lxml.html
import msal
import requests
from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings

logger = logging.getLogger('requerimientos')

DB = 'requerimientos'

_QUIEBRE_BLOQUE_RE = re.compile(r'<\s*(br|/p|/div|/li)\s*/?\s*>', re.IGNORECASE)
_SALTOS_SEGUIDOS_RE = re.compile(r'\n{3,}')


def texto_desde_body(body: dict) -> str:
    """Convierte el body de un chatMessage de Graph (que puede venir como
    HTML, con <p>, &nbsp;, etc.) a texto plano legible para el widget."""
    body = body or {}
    contenido = body.get('content') or ''
    if not contenido:
        return ''
    if body.get('contentType') != 'html':
        return contenido.strip()

    try:
        con_saltos = _QUIEBRE_BLOQUE_RE.sub('\n', contenido)
        texto = lxml.html.fromstring(con_saltos).text_content()
    except Exception:
        texto = contenido  # si no parsea como HTML, se muestra tal cual

    texto = texto.replace('\xa0', ' ')
    texto = '\n'.join(linea.strip() for linea in texto.split('\n'))
    texto = _SALTOS_SEGUIDOS_RE.sub('\n\n', texto)
    return texto.strip()

GRAPH_BASE  = 'https://graph.microsoft.com/v1.0'
CHAT_SCOPES = ['https://graph.microsoft.com/Chat.ReadWrite']


class ChatNoConfigurado(Exception):
    """Falta configuración de Azure (tenant/client/secret/redirect) o la
    clave de cifrado de tokens (CHAT_TOKEN_ENCRYPTION_KEY)."""


def _fernet():
    key = settings.CHAT_TOKEN_ENCRYPTION_KEY
    if not key:
        raise ChatNoConfigurado('Falta configurar CHAT_TOKEN_ENCRYPTION_KEY.')
    return Fernet(key.encode() if isinstance(key, str) else key)


def _cifrar(texto_plano: str) -> bytes:
    return _fernet().encrypt(texto_plano.encode('utf-8'))


def _descifrar(datos_cifrados) -> str:
    return _fernet().decrypt(bytes(datos_cifrados)).decode('utf-8')


def _validar_config():
    if not (settings.TEAMS_TENANT_ID and settings.TEAMS_CLIENT_ID and settings.TEAMS_CLIENT_SECRET):
        raise ChatNoConfigurado('Microsoft Teams no está configurado (faltan TEAMS_TENANT_ID/CLIENT_ID/CLIENT_SECRET).')
    if not settings.TEAMS_CHAT_REDIRECT_URI:
        raise ChatNoConfigurado('Falta configurar TEAMS_CHAT_REDIRECT_URI.')


def _confidential_app(token_cache=None):
    return msal.ConfidentialClientApplication(
        client_id=settings.TEAMS_CLIENT_ID,
        client_credential=settings.TEAMS_CLIENT_SECRET,
        authority=f'https://login.microsoftonline.com/{settings.TEAMS_TENANT_ID}',
        token_cache=token_cache,
    )


def get_authorization_url(state: str) -> str:
    _validar_config()
    app_ = _confidential_app()
    return app_.get_authorization_request_url(
        scopes=CHAT_SCOPES,
        state=state,
        redirect_uri=settings.TEAMS_CHAT_REDIRECT_URI,
    )


def intercambiar_code_por_token(code: str):
    """Intercambia el código de autorización por tokens. Devuelve
    (resultado_msal, cache_serializado_cifrado) o lanza RuntimeError si
    Microsoft rechaza el código."""
    _validar_config()
    cache = msal.SerializableTokenCache()
    app_ = _confidential_app(token_cache=cache)
    resultado = app_.acquire_token_by_authorization_code(
        code=code,
        scopes=CHAT_SCOPES,
        redirect_uri=settings.TEAMS_CHAT_REDIRECT_URI,
    )
    if 'access_token' not in resultado:
        raise RuntimeError(
            resultado.get('error_description') or resultado.get('error')
            or 'Microsoft no devolvió un token válido.'
        )
    return resultado, _cifrar(cache.serialize())


def obtener_token_delegado(token_row):
    """Dado un ChatMicrosoftToken activo, devuelve un access_token válido
    (renovándolo en silencio con el refresh token guardado si hace falta)
    o None si no se pudo renovar (revocado/expirado)."""
    if not token_row or not token_row.Activo or not token_row.MsalTokenCache:
        return None

    cache = msal.SerializableTokenCache()
    try:
        cache.deserialize(_descifrar(token_row.MsalTokenCache))
    except (InvalidToken, ValueError):
        logger.error('No se pudo descifrar el token cache de IdUsuario=%s', token_row.IdUsuario)
        return None

    app_ = _confidential_app(token_cache=cache)
    cuentas = app_.get_accounts()
    resultado = app_.acquire_token_silent(CHAT_SCOPES, account=cuentas[0]) if cuentas else None

    if cache.has_state_changed:
        token_row.MsalTokenCache = _cifrar(cache.serialize())
        token_row.save(using=DB, update_fields=['MsalTokenCache'])

    if not resultado or 'access_token' not in resultado:
        return None
    return resultado['access_token']


def _headers(access_token):
    return {'Authorization': f'Bearer {access_token}', 'Content-Type': 'application/json'}


def crear_chat_uno_a_uno(access_token: str, upn_usuario: str, correo_agente: str) -> str:
    """Crea el chat 1:1 de Teams entre el usuario y el agente de soporte
    (Graph reutiliza el existente si ya había uno). Devuelve el chatId."""
    body = {
        'chatType': 'oneOnOne',
        'members': [
            {
                '@odata.type': '#microsoft.graph.aadUserConversationMember',
                'roles': ['owner'],
                'user@odata.bind': f"https://graph.microsoft.com/v1.0/users('{upn_usuario}')",
            },
            {
                '@odata.type': '#microsoft.graph.aadUserConversationMember',
                'roles': ['owner'],
                'user@odata.bind': f"https://graph.microsoft.com/v1.0/users('{correo_agente}')",
            },
        ],
    }
    resp = requests.post(f'{GRAPH_BASE}/chats', headers=_headers(access_token), json=body, timeout=15)
    resp.raise_for_status()
    return resp.json()['id']


def enviar_mensaje(access_token: str, chat_id: str, texto: str) -> dict:
    body = {'body': {'content': texto}}
    resp = requests.post(
        f'{GRAPH_BASE}/chats/{chat_id}/messages',
        headers=_headers(access_token), json=body, timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def listar_mensajes(access_token: str, chat_id: str, top: int = 20) -> list:
    resp = requests.get(
        f'{GRAPH_BASE}/chats/{chat_id}/messages',
        headers=_headers(access_token),
        params={'$top': top},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json().get('value', [])
