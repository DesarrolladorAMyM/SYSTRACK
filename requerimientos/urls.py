from django.urls import path
from . import views
from . import views_registro
from . import views_equipos
from . import views_chat

urlpatterns = [
    path('requerimiento/',                        views.Requerimientos,           name='requerimiento'),
    path('requerimiento/api/catalogos/',          views.catalogos,                name='req_catalogos'),
    path('requerimiento/api/subcategorias/',      views.subcategorias,            name='req_subcategorias'),
    path('requerimiento/api/validar-cedula/',     views.validar_cedula,           name='req_validar_cedula'),
    path('requerimiento/api/catalogos-registro/', views_registro.api_catalogos_registro,     name='req_catalogos_registro'),
    path('requerimiento/api/registro/',           views_registro.api_registrar_usuario_req,  name='req_registro'),
    path('requerimiento/api/actualizar-datos/',   views.api_actualizar_datos_usuario,        name='req_actualizar_datos'),
    path('requerimiento/api/equipos/',            views_equipos.api_equipos_lista,           name='req_equipos_lista'),
    path('requerimiento/api/equipos/prestar/',    views_equipos.api_equipos_prestar,         name='req_equipos_prestar'),
    path('requerimiento/api/equipos/devolver/',   views_equipos.api_equipos_devolver,        name='req_equipos_devolver'),
    path('requerimiento/api/mis-requerimientos/', views.mis_requerimientos,       name='req_mis_requerimientos'),
    path('requerimiento/api/crear/',              views.crear_requerimiento,      name='req_crear'),
    path('requerimiento/api/adjuntar/<int:codigo>/', views.api_adjuntar_archivo,  name='req_adjuntar'),
    path('requerimiento/api/corregir/<int:codigo>/', views.api_corregir_requerimiento, name='req_corregir'),
    path('requerimiento/api/calificar/',          views.calificar_requerimiento,  name='req_calificar'),
    path('requerimiento/api/aprobar/<str:token>/',  views.aprobar_requerimiento,  name='req_aprobar'),
    path('requerimiento/api/rechazar/<str:token>/', views.rechazar_requerimiento, name='req_rechazar'),

    path('requerimiento/api/notificaciones/',              views.mis_notificaciones,            name='req_notificaciones'),
    path('requerimiento/api/notificaciones/<int:pk>/leida/', views.marcar_notificacion_leida,   name='req_notificacion_leida'),
    path('requerimiento/api/notificaciones/leer-todas/',   views.marcar_notificaciones_leidas,  name='req_notificaciones_leer_todas'),
    
    path('requerimiento/seguimiento/',              views.seguimiento_publico,      name='req_seguimiento_publico'),
    path('requerimiento/api/seguimiento-publico/',  views.api_seguimiento_publico,  name='req_api_seguimiento_publico'),

    path('requerimiento/api/usuarios/',                   views.api_usuarios_req,         name='req_usuarios'),
    path('api/tipos-usuario/',                            views.api_req_tipos_usuario,    name='api_req_tipos_usuario'),
    path('requerimiento/api/usuarios/crear/',             views.api_usuario_req_crear,    name='req_usuario_crear'),
    path('requerimiento/api/usuarios/<int:pk>/editar/',   views.api_usuario_req_editar,   name='req_usuario_editar'),
    path('requerimiento/api/usuarios/<int:pk>/eliminar/', views.api_usuario_req_eliminar, name='req_usuario_eliminar'),

    path('requerimiento/api/teams-presence/',     views.api_teams_presence,     name='req_teams_presence'),
    path('requerimiento/api/teams-agente-foto/',   views.api_teams_agente_foto,  name='req_teams_agente_foto'),

    path('requerimiento/api/chat/vincular/', views_chat.chat_vincular_inicio,   name='req_chat_vincular_inicio'),
    path('requerimiento/api/chat/callback/', views_chat.chat_vincular_callback, name='req_chat_vincular_callback'),
    path('requerimiento/api/chat/estado/',   views_chat.chat_estado,            name='req_chat_estado'),
    path('requerimiento/api/chat/enviar/',   views_chat.chat_enviar_mensaje,    name='req_chat_enviar'),
    path('requerimiento/api/chat/mensajes/', views_chat.chat_mensajes,          name='req_chat_mensajes'),
]