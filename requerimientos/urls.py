from django.urls import path
from . import views
from . import views_registro
from . import views_equipos

urlpatterns = [
    path('requerimiento/',                        views.Requerimientos,           name='requerimiento'),
    path('requerimiento/api/catalogos/',          views.catalogos,                name='req_catalogos'),
    path('requerimiento/api/subcategorias/',      views.subcategorias,            name='req_subcategorias'),
    path('requerimiento/api/validar-cedula/',     views.validar_cedula,           name='req_validar_cedula'),
    path('requerimiento/api/catalogos-registro/', views_registro.api_catalogos_registro,     name='req_catalogos_registro'),
    path('requerimiento/api/registro/',           views_registro.api_registrar_usuario_req,  name='req_registro'),
    path('requerimiento/api/equipos/',            views_equipos.api_equipos_lista,           name='req_equipos_lista'),
    path('requerimiento/api/equipos/prestar/',    views_equipos.api_equipos_prestar,         name='req_equipos_prestar'),
    path('requerimiento/api/equipos/devolver/',   views_equipos.api_equipos_devolver,        name='req_equipos_devolver'),
    path('requerimiento/api/mis-requerimientos/', views.mis_requerimientos,       name='req_mis_requerimientos'),
    path('requerimiento/api/crear/',              views.crear_requerimiento,      name='req_crear'),
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
]