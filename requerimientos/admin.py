from django.contrib import admin
from .models import Categoria, SubCategoria, CentroOperacion, EstadoRequerimiento, Cargo, Usuario, Requerimiento


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display  = ('IdCategoria', 'Descripcion', 'TiempoDias', 'Estado')
    search_fields = ('Descripcion',)
    list_filter   = ('Estado',)


@admin.register(SubCategoria)
class SubCategoriaAdmin(admin.ModelAdmin):
    list_display  = ('IdSubCategoria', 'Descripcion', 'IdCategoria', 'Prioridad', 'TiempoDias')
    search_fields = ('Descripcion',)
    list_filter   = ('Prioridad',)


@admin.register(CentroOperacion)
class CentroOperacionAdmin(admin.ModelAdmin):
    list_display  = ('IdCo', 'Descripcion', 'Ciudad', 'Zona', 'Estado')
    search_fields = ('Descripcion', 'Ciudad')
    list_filter   = ('Estado', 'Zona')


@admin.register(EstadoRequerimiento)
class EstadoRequerimientoAdmin(admin.ModelAdmin):
    list_display  = ('IdEstado', 'Descripcion')
    search_fields = ('Descripcion',)


@admin.register(Cargo)
class CargoAdmin(admin.ModelAdmin):
    list_display  = ('IdCargo', 'Descripcion', 'Estado')
    search_fields = ('Descripcion',)
    list_filter   = ('Estado',)


@admin.register(Usuario)
class UsuarioAdmin(admin.ModelAdmin):
    list_display  = ('IdUsuario', 'Cedula', 'NombreCompleto', 'IdCargo', 'IdCO', 'Email', 'TipoUsuario', 'Estado')
    search_fields = ('Cedula', 'NombreCompleto', 'Email')
    list_filter   = ('TipoUsuario', 'Estado')


@admin.register(Requerimiento)
class RequerimientoAdmin(admin.ModelAdmin):
    list_display  = ('Codigo', 'NombreUsuario', 'CedulaUsuario', 'CO', 'IdCategoria', 'IdSubCategoria', 'IdEstado', 'Fecha', 'FechaEstiSoluci')
    search_fields = ('NombreUsuario', 'CedulaUsuario', 'Requerimiento')
    list_filter   = ('IdEstado', 'IdCategoria', 'CO')
    readonly_fields = ('Codigo',)
    date_hierarchy  = 'Fecha'