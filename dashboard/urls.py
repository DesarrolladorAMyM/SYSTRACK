"""
Rutas para todas las APIs y la vista principal del dashboard.
"""

from django.urls import path
from . import views
from . import views_prestamo_equipos

urlpatterns = [

    #  Vista principal (renderiza el HTML) 
    path('', views.dashboard, name='dashboard'),

    #  Catálogos (para poblar <select>) 
    path('api/catalogos/',                    views.api_catalogos,               name='api_catalogos'),
    path('api/municipios/<int:dpto_id>/',     views.api_municipios_por_dpto,     name='api_municipios'),

    #  Inventario — Dispositivos activos 
    path('api/dispositivos/',                 views.api_dispositivos,            name='api_dispositivos'),
    path('api/dispositivos/crear/',           views.api_dispositivo_crear,       name='api_dispositivo_crear'),
    path('api/dispositivos/<int:pk>/',        views.api_dispositivo_detalle,     name='api_dispositivo_detalle'),
    path('api/dispositivos/<int:pk>/editar/', views.api_dispositivo_editar,      name='api_dispositivo_editar'),
    path('api/dispositivos/<int:pk>/eliminar/', views.api_dispositivo_eliminar,  name='api_dispositivo_eliminar'),

    #  Historial de equipos 
    path('api/historial/',                    views.api_historial,               name='api_historial'),
    path('api/historial/crear/',              views.api_historial_crear,         name='api_historial_crear'),

    #  Centro de operaciones 
    path('api/centro-operaciones/',                 views.api_centro_operaciones, name='api_centro_operaciones'),

    #  Inactivos 
    path('api/inactivos/',                    views.api_inactivos,               name='api_inactivos'),
    path('api/inactivos/<int:pk>/editar/',    views.api_inactivo_editar,         name='api_inactivo_editar'),

    #  Colaboradores 
    path('api/colaboradores/',                views.api_colaboradores,           name='api_colaboradores'),
    path('api/colaboradores/crear/',           views.api_colaborador_crear,       name='api_colaborador_crear'),
    path('api/colaboradores/cargos/',          views.api_colaboradores_cargos,    name='api_colaboradores_cargos'),
    path('api/colaboradores/<int:colaborador_id>/asignar/',
         views.api_asignacion_guardar,                                           name='api_asignacion'),
    path('api/colaboradores/<int:colaborador_id>/asignar/<int:dispositivo_id>/eliminar/',
         views.api_asignacion_eliminar,                                          name='api_asignacion_eliminar'),
    path('api/colaboradores/<int:colaborador_id>/acta/',
         views.api_acta_guardar,                                                 name='api_acta'),
    
    path('api/actas/<int:acta_id>/',
     views.api_acta_detalle,                                                    name='api_acta_detalle'),

    #  Carga masiva 
    path('api/dispositivos/carga-masiva/',    views.api_carga_masiva,            name='api_carga_masiva'),

    #  Exportar inventario a Excel con características 
    path('api/dispositivos/exportar/',        views.api_exportar_inventario,     name='api_exportar_inventario'),

    #  Dashboard — Estadísticas generales 
    path('api/dashboard/stats/',              views.api_dashboard_stats,         name='api_dashboard_stats'),
    
    path('api/dispositivos/verificar-serial/', views.api_verificar_serial, name='api_verificar_serial'),
    
    path('api/dispositivos/siguiente-serial/', views.api_siguiente_serial, name='api_siguiente_serial'),
    

    path('api/req/centros-operacion/',                    views.api_req_centros_operacion, name='req_centros_operacion'),
    path('api/req/cargos/',                              views.api_req_cargos,            name='req_cargos'),
    
     path('api/mis-req-tic/',           views.api_mis_req_tic,      name='api_mis_req_tic'),
     path('api/req-tic/<int:req_id>/accion/', views.api_req_tic_accion, name='api_req_tic_accion'),
     
     path('api/todos-req-tic/',      views.api_todos_req_tic,      name='api_todos_req_tic'),
     path('api/historial-req-tic/',  views.api_historial_req_tic,  name='api_historial_req_tic'),
     path('api/colaboradores-ti/',   views.api_colaboradores_ti,   name='api_colaboradores_ti'),
     
     path('api/categorias-req/',     views.api_categorias_req,     name='api_categorias_req'),
     path('api/subcategorias-req/',  views.api_subcategorias_req,  name='api_subcategorias_req'),
     
     path('api/notificaciones-bell/', views.api_notificaciones_bell, name='api_notificaciones_bell'),

     path('api/indicadores/resumen/',   views.api_indicadores_resumen,   name='api_indicadores_resumen'),
     path('api/indicadores/tendencia/', views.api_indicadores_tendencia, name='api_indicadores_tendencia'),
     path('api/indicadores/calificacion/', views.api_indicadores_calificacion, name='api_indicadores_calificacion'),

     #  Préstamo de Equipos 
     path('api/prestamo-equipos/',                views_prestamo_equipos.api_equipos_admin_lista,     name='api_equipos_admin_lista'),
     path('api/prestamo-equipos/catalogos/',       views_prestamo_equipos.api_equipos_admin_catalogos, name='api_equipos_admin_catalogos'),
     path('api/prestamo-equipos/guardar/',         views_prestamo_equipos.api_equipo_admin_guardar,    name='api_equipo_admin_guardar'),
     path('api/prestamo-equipos/<int:pk>/eliminar/', views_prestamo_equipos.api_equipo_admin_eliminar, name='api_equipo_admin_eliminar'),

]