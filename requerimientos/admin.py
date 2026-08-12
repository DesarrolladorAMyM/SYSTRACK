from django.contrib import admin
from .models import (
    Categoria, SubCategoria, CentroOperacion, EstadoRequerimiento, Cargo, Usuario, Requerimiento,
    ChatMicrosoftToken, Chat, Mensaje,
)


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


@admin.register(ChatMicrosoftToken)
class ChatMicrosoftTokenAdmin(admin.ModelAdmin):
    """Solo lectura salvo 'Activo', para poder revocar una vinculación
    manualmente sin exponer el contenido cifrado del token cache."""
    list_display    = ('IdUsuario', 'Cedula', 'Upn', 'Activo', 'FechaVinculacion', 'FechaUltimoUso')
    search_fields   = ('Cedula', 'Upn', 'AadObjectId')
    list_filter     = ('Activo',)
    exclude         = ('MsalTokenCache',)
    readonly_fields = ('IdUsuario', 'Cedula', 'AadObjectId', 'Upn', 'FechaVinculacion', 'FechaUltimoUso', 'UltimoError')


@admin.register(Chat)
class ChatAdmin(admin.ModelAdmin):
    list_display    = ('IdChat', 'IdUsuario', 'Cedula', 'GraphChatId', 'CorreoAgente', 'FechaCreacion', 'UltimaActividad')
    search_fields   = ('Cedula', 'GraphChatId')
    readonly_fields = ('IdChat', 'IdUsuario', 'Cedula', 'GraphChatId', 'CorreoAgente', 'FechaCreacion', 'UltimaActividad')


@admin.register(Mensaje)
class MensajeAdmin(admin.ModelAdmin):
    list_display    = ('IdMensaje', 'IdChat', 'Direccion', 'Estado', 'Leido', 'FechaGraph', 'FechaLocal')
    search_fields   = ('Texto', 'GraphMessageId')
    list_filter     = ('Direccion', 'Estado', 'Leido')
    readonly_fields = ('IdMensaje', 'IdChat', 'GraphMessageId', 'Direccion', 'Texto', 'FechaGraph', 'FechaLocal')