from django.urls import path
from . import views

urlpatterns = [
    path('/SYSTRACK/requerimiento/',                        views.Requerimientos,           name='requerimiento'),
    path('/SYSTRACK/requerimiento/api/catalogos/',          views.catalogos,                name='req_catalogos'),
    path('/SYSTRACK/requerimiento/api/subcategorias/',      views.subcategorias,            name='req_subcategorias'),
    path('/SYSTRACK/requerimiento/api/validar-cedula/',     views.validar_cedula,           name='req_validar_cedula'),
    path('/SYSTRACK/requerimiento/api/mis-requerimientos/', views.mis_requerimientos,       name='req_mis_requerimientos'),
    path('/SYSTRACK/requerimiento/api/crear/',              views.crear_requerimiento,      name='req_crear'),
    path('/SYSTRACK/requerimiento/api/calificar/',          views.calificar_requerimiento,  name='req_calificar'),
    path('/SYSTRACK/requerimiento/api/aprobar/<str:token>/',  views.aprobar_requerimiento,  name='req_aprobar'),
    path('/SYSTRACK/requerimiento/api/rechazar/<str:token>/', views.rechazar_requerimiento, name='req_rechazar'),

    path('/SYSTRACK/requerimiento/api/usuarios/',                   views.api_usuarios_req,         name='req_usuarios'),
    path('/SYSTRACK/api/tipos-usuario/',                            views.api_req_tipos_usuario,    name='api_req_tipos_usuario'),
    path('/SYSTRACK/requerimiento/api/usuarios/crear/',             views.api_usuario_req_crear,    name='req_usuario_crear'),
    path('/SYSTRACK/requerimiento/api/usuarios/<int:pk>/editar/',   views.api_usuario_req_editar,   name='req_usuario_editar'),
    path('/SYSTRACK/requerimiento/api/usuarios/<int:pk>/eliminar/', views.api_usuario_req_eliminar, name='req_usuario_eliminar'),
] 