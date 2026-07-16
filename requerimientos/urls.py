from django.urls import path
from . import views

urlpatterns = [
    path('requerimiento/',                        views.Requerimientos,           name='requerimiento'),
    path('requerimiento/api/catalogos/',          views.catalogos,                name='req_catalogos'),
    path('requerimiento/api/subcategorias/',      views.subcategorias,            name='req_subcategorias'),
    path('SYSTRACK/requerimiento/api/validar-cedula/',     views.validar_cedula,           name='req_validar_cedula'),
    path('requerimiento/api/mis-requerimientos/', views.mis_requerimientos,       name='req_mis_requerimientos'),
    path('requerimiento/api/crear/',              views.crear_requerimiento,      name='req_crear'),
    path('requerimiento/api/calificar/',          views.calificar_requerimiento,  name='req_calificar'),
    path('requerimiento/api/aprobar/<str:token>/',  views.aprobar_requerimiento,  name='req_aprobar'),
    path('requerimiento/api/rechazar/<str:token>/', views.rechazar_requerimiento, name='req_rechazar'),

    path('requerimiento/api/usuarios/',                   views.api_usuarios_req,         name='req_usuarios'),
    path('api/tipos-usuario/',                            views.api_req_tipos_usuario,    name='api_req_tipos_usuario'),
    path('requerimiento/api/usuarios/crear/',             views.api_usuario_req_crear,    name='req_usuario_crear'),
    path('requerimiento/api/usuarios/<int:pk>/editar/',   views.api_usuario_req_editar,   name='req_usuario_editar'),
    path('requerimiento/api/usuarios/<int:pk>/eliminar/', views.api_usuario_req_eliminar, name='req_usuario_eliminar'),
] 