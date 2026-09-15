from django.db import models


class Categoria(models.Model):
    IdCategoria     = models.AutoField(primary_key=True)
    Descripcion     = models.CharField(max_length=200)
    IdRequerimiento = models.IntegerField(null=True, blank=True)
    TiempoDias      = models.IntegerField(null=True, blank=True)
    Estado          = models.CharField(max_length=20, null=True, blank=True)

    class Meta:
        managed  = False
        db_table = 'mm_Categoria'


class SubCategoria(models.Model):
    IdSubCategoria = models.AutoField(primary_key=True)
    Descripcion    = models.CharField(max_length=200)
    IdCategoria    = models.IntegerField()
    TiempoDias     = models.IntegerField(null=True, blank=True)
    Prioridad      = models.CharField(max_length=20, null=True, blank=True)

    class Meta:
        managed  = False
        db_table = 'mm_SubCategoria'


class CentroOperacion(models.Model):
    IdCo        = models.CharField(max_length=50, primary_key=True)  # ← era AutoField
    Descripcion = models.CharField(max_length=200)
    Zona        = models.CharField(max_length=100, null=True, blank=True)
    Ciudad      = models.CharField(max_length=100, null=True, blank=True)
    Estado      = models.IntegerField(null=True, blank=True)  # ← era CharField

    class Meta:
        managed  = False
        db_table = 'mm_CentroOperacion'

class EstadoRequerimiento(models.Model):
    IdEstado    = models.AutoField(primary_key=True)
    Descripcion = models.CharField(max_length=100)

    class Meta:
        managed  = False
        db_table = 'mm_EstadoRequerimiento'
        


class Cargo(models.Model):
    IdCargo     = models.AutoField(primary_key=True)
    Descripcion = models.CharField(max_length=200)
    Estado      = models.CharField(max_length=20, null=True, blank=True)

    class Meta:
        managed  = False
        db_table = 'mm_Cargo'


class Usuario(models.Model):
    IdUsuario      = models.AutoField(primary_key=True)
    Cedula         = models.CharField(max_length=20, unique=True)
    NombreCompleto = models.CharField(max_length=150)
    IdCargo        = models.IntegerField(null=True, blank=True)
    IdArea         = models.IntegerField(null=True, blank=True) 
    IdCO           = models.CharField(max_length=50) 
    Email          = models.EmailField(max_length=200, null=True, blank=True)
    Contrasena     = models.CharField(max_length=255, null=True, blank=True, db_column='Contraseña')
    FechaCreacion  = models.DateTimeField(null=True, blank=True)
    TipoUsuario = models.IntegerField(null=True, blank=True)
    Estado         = models.IntegerField(null=True, blank=True)
    DatosActualizados = models.BooleanField(default=False)

    class Meta:
        managed  = False
        db_table = 'mv_Usuarios'
        
        
class TipoUsuario(models.Model):
    idTipoUsuario = models.AutoField(primary_key=True)
    Descripcion  = models.CharField(max_length=100)

    class Meta:
        managed  = False
        db_table = 'mm_TipoUsuario'
        
        
class Prioridad(models.Model):
    IdPrioridad = models.AutoField(primary_key=True)
    Descripcion = models.CharField(max_length=100)
    Porcentaje  = models.IntegerField(null=True, blank=True)

    class Meta:
        managed  = False
        db_table = 'mm_Prioridad'
        
        
        
class Area(models.Model):
    IdArea     = models.AutoField(primary_key=True)
    NombreArea = models.CharField(max_length=150)
    CorreoJefe = models.EmailField(max_length=200)
    Estado     = models.IntegerField(null=True, blank=True, default=1)

    class Meta:
        managed  = False
        db_table = 'mm_Area'
        
    

class Requerimiento(models.Model):
    Codigo = models.AutoField(primary_key=True)
    IdJefeArea       = models.IntegerField(null=True, blank=True)
    Fecha            = models.DateField(null=True, blank=True)
    IdUsuario        = models.IntegerField(null=True, blank=True)
    CedulaUsuario    = models.IntegerField(null=True, blank=True)
    NombreUsuario    = models.CharField(max_length=150, null=True, blank=True)
    Cargo            = models.IntegerField(null=True, blank=True)
    CO               = models.CharField(max_length=100, null=True, blank=True)
    Equipo           = models.CharField(max_length=100, null=True, blank=True)
    Email            = models.EmailField(null=True, blank=True)
    IdTipoReq        = models.IntegerField(null=True, blank=True)
    Requerimiento    = models.TextField(null=True, blank=True)
    IdPrioridad      = models.IntegerField(null=True, blank=True)
    IdUsuarioAsig    = models.IntegerField(null=True, blank=True, db_column='IdUsuarioAsignado')
    NombreUsuariAsig = models.CharField(max_length=150, null=True, blank=True, db_column='NombreUsuarioAsignado')
    IdTipoSolicitud  = models.IntegerField(null=True, blank=True)
    IdParteAfectada  = models.IntegerField(null=True, blank=True)
    IdCategoria      = models.IntegerField(null=True, blank=True)
    IdSubCategoria   = models.IntegerField(null=True, blank=True)
    IdEstado         = models.IntegerField(null=True, blank=True)
    FechaEstiSoluci  = models.DateField(null=True, blank=True, db_column='FechaEstiSolucion')
    PlanAccion       = models.TextField(null=True, blank=True)
    FechaRealSoluci  = models.DateField(null=True, blank=True, db_column='FechaRealSolucion')
    Solucion         = models.TextField(null=True, blank=True)
    Clasificacion    = models.IntegerField(null=True, blank=True)
    Costo            = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    TokenAprobacion  = models.CharField(max_length=64, null=True, blank=True)
    FechaAprobacion  = models.DateTimeField(null=True, blank=True)
    # Motivo por el que un técnico rechazó el requerimiento (estado 9 =
    # "Rechazado - Requiere Corrección"). Se conserva incluso después de que
    # el solicitante lo corrija y vuelva a estado Asignado, para que quede
    # visible en la línea de tiempo que en algún momento fue rechazado.
    MotivoRechazo    = models.TextField(null=True, blank=True)

    class Meta:
        managed  = False
        db_table = 'mv_Requerimientos'

    def codigo(self):
        return f"REQ-{self.Codigo:04d}" if self.Codigo else ''

    def __str__(self):
        return self.codigo()
    
    
    
    
    
class TipoRequerimiento(models.Model):
    IdTipoReque = models.AutoField(primary_key=True)
    Descripcion = models.CharField(max_length=200)

    class Meta:
        managed  = False
        db_table = 'mm_TipoRequerimiento'

    def __str__(self):
        return self.Descripcion
    
    
    
    
class Clasificacion(models.Model):
    IdClasificacion = models.AutoField(primary_key=True)
    Clasificacion   = models.CharField(max_length=200)

    class Meta:
        managed  = False
        db_table = 'mm_Clasificacion'

    def __str__(self):
        return self.Clasificacion
    
    
    
class EvaluacionReq(models.Model):
    IdEvaluacion = models.AutoField(primary_key=True)
    IdReq        = models.IntegerField()
    Evaluacion   = models.IntegerField(null=True, blank=True)  # 1 a 5
    Comentario   = models.TextField(null=True, blank=True)

    class Meta:
        managed  = False
        db_table = 'mv_EvaluacionReq'


class ImagenAdjunta(models.Model):
    """Archivo adjunto de un requerimiento (tabla ya existente en la BD,
    561 registros históricos cuyo archivo físico no sabemos dónde quedó
    guardado — ver decisión en conversación). Los archivos NUEVOS que se
    suban desde este proyecto se guardan en MEDIA_ROOT/requerimientos_adjuntos/
    con el nombre '{IdImagen}_{NombreImagen}' (el IdImagen evita choques
    entre archivos de distintos requerimientos con el mismo nombre)."""
    IdImagen     = models.AutoField(primary_key=True)
    CodReq       = models.IntegerField()
    NombreImagen = models.CharField(max_length=255)

    class Meta:
        managed  = False
        db_table = 'mm_ImagenesAdjuntos'


class AdjuntoSolucion(models.Model):
    """Archivo que adjunta el TECNICO al solucionar un requerimiento.

    Tabla aparte de mm_ImagenesAdjuntos a proposito: esa la escribe tambien el
    sistema anterior y no tiene como distinguir quien subio el archivo, asi que
    mezclarlos haria que el archivo del tecnico tapara el del solicitante en el
    dashboard (que muestra el mas reciente). Ademas, tocarle la estructura a una
    tabla que otro sistema sigue usando es un riesgo que no hace falta correr.

    El archivo fisico va a MEDIA_ROOT/soluciones_adjuntos/'{IdAdjunto}_{nombre}'
    — el IdAdjunto por delante evita choques entre archivos con el mismo nombre.
    """
    IdAdjunto     = models.AutoField(primary_key=True)
    CodReq        = models.IntegerField()
    NombreArchivo = models.CharField(max_length=255)
    FechaSubida   = models.DateTimeField(null=True, blank=True)

    class Meta:
        managed  = False
        db_table = 'mm_AdjuntosSolucion'

    def __str__(self):
        return f'{self.NombreArchivo} (REQ {self.CodReq})'


class Notificacion(models.Model):
    """Notificaciones dentro del portal, en paralelo a los correos que ya
    se envían desde Signals.py y desde aprobar/rechazar. Una fila = un
    evento visible en la campanita para el CedulaUsuario dueño del
    requerimiento (asignado, aprobado, rechazado, solucionado)."""
    IdNotificacion = models.AutoField(primary_key=True)
    CedulaUsuario  = models.CharField(max_length=20)
    Tipo           = models.CharField(max_length=30)
    Codigo         = models.IntegerField(null=True, blank=True)
    Titulo         = models.CharField(max_length=200)
    Mensaje        = models.CharField(max_length=500)
    Leida          = models.BooleanField(default=False)
    FechaCreacion  = models.DateTimeField(null=True, blank=True)

    class Meta:
        managed  = False
        db_table = 'mv_Notificaciones'


class EstadoGeneral(models.Model):
    """Tabla de estados compartida (capa común), usada por varios módulos
    del sistema — no exclusiva de requerimientos. Para Préstamo de Equipos
    se usan IdEstado=3 (Disponible) e IdEstado=4 (No disponible)."""
    IdEstado    = models.AutoField(db_column='f100_id', primary_key=True)
    Descripcion = models.CharField(db_column='f100_descripcion', max_length=100)

    class Meta:
        managed  = False
        db_table = 't100_mm_estados'

class Equipo(models.Model):
    """Equipos que se pueden prestar (Préstamo de Equipos). El estado viene
    de la tabla compartida EstadoGeneral, no de mm_EstadoRequerimiento."""
    IdEquipo      = models.AutoField(primary_key=True)
    NombreEquipo  = models.CharField(max_length=150)
    Descripcion   = models.CharField(max_length=300, null=True, blank=True)
    IdResponsable = models.IntegerField(null=True, blank=True)
    IdEstado      = models.IntegerField()

    class Meta:
        managed  = False
        db_table = 'mv_Equipos'
        


class HistorialPrestamo(models.Model):
    """Historial de préstamos de equipos (Préstamo de Equipos). Cada fila es
    un préstamo; FechaDevolucionReal NULL = préstamo todavía activo."""
    IdPrestamo              = models.AutoField(primary_key=True)
    IdEquipo                = models.ForeignKey(
        Equipo, db_column='IdEquipo', on_delete=models.DO_NOTHING
    )
    Cedula                  = models.CharField(max_length=20)
    NombreSolicitante       = models.CharField(max_length=150)
    Area                    = models.CharField(max_length=150, null=True, blank=True)
    FechaPrestamo           = models.DateTimeField(auto_now_add=True)
    FechaEstimadaDevolucion = models.DateField(null=True, blank=True)
    FechaDevolucionReal     = models.DateTimeField(null=True, blank=True)
    Observaciones           = models.CharField(max_length=500, null=True, blank=True)

    class Meta:
        managed  = False
        db_table = 'mv_HistorialPrestamos'


class AccesorioEquipo(models.Model):
    """Catalogo de accesorios de un equipo prestable: lo que NORMALMENTE va
    con el (el videobeam viene con control, cable HDMI y cable de poder).

    Se configura una vez por equipo y sirve para premarcar la lista al
    entregar, para que registrar la salida sea un clic y no un formulario.

    OJO: la tabla NO distingue entre lo que se devuelve y lo que solo se
    anota (una instalacion, por ejemplo, no vuelve). Todo lo que se registre
    aqui aparecera en el checklist de devolucion pidiendo ser marcado. Si mas
    adelante hace falta separarlos, habria que agregar una columna.
    """
    IdAccesorio = models.AutoField(primary_key=True)
    IdEquipo    = models.IntegerField()
    Nombre      = models.CharField(max_length=150)
    Activo      = models.BooleanField(default=True)

    class Meta:
        managed  = False
        db_table = 'mv_AccesoriosEquipo'
        ordering = ['Nombre']

    def __str__(self):
        return self.Nombre


class PrestamoAccesorio(models.Model):
    """Que accesorios salieron REALMENTE en un prestamo y cuales volvieron.

    Es la tabla que da valor al modulo: sin ella no se puede responder "le
    falto devolver el cable HDMI", porque nunca quedaria registrado que se lo
    llevo. Entregado y Devuelto son campos distintos a proposito — uno dice
    que salio, el otro que volvio, y la diferencia es el faltante.

    NombreAccesorio guarda una COPIA del nombre: si manana se borra el
    accesorio del catalogo, los prestamos viejos siguen diciendo que se
    presto un cable HDMI. Mismo criterio que g238_item_desc en el checklist
    de dispositivos. Por eso IdAccesorio puede quedar en NULL.
    """
    IdPrestamoAccesorio = models.AutoField(primary_key=True)
    IdPrestamo          = models.IntegerField()
    IdAccesorio         = models.IntegerField(null=True, blank=True)
    NombreAccesorio     = models.CharField(max_length=150)
    Entregado           = models.BooleanField(default=True)
    Devuelto            = models.BooleanField(default=False)
    Observacion         = models.CharField(max_length=300, null=True, blank=True)

    class Meta:
        managed  = False
        db_table = 'mv_PrestamoAccesorios'

    def __str__(self):
        return f'{self.NombreAccesorio} (prestamo {self.IdPrestamo})'


class ChatMicrosoftToken(models.Model):
    """Vinculación OAuth delegada de un usuario del portal con su cuenta
    Microsoft 365, para poder enviar/leer mensajes de Teams en su nombre.
    Tabla nueva (managed=True), sin FK real hacia Usuario (managed=False)
    para no tocar mv_Usuarios en la migración."""
    IdVinculacion    = models.AutoField(primary_key=True)
    IdUsuario        = models.IntegerField(unique=True, db_index=True)
    Cedula           = models.CharField(max_length=20, db_index=True)
    AadObjectId      = models.CharField(max_length=64, null=True, blank=True)
    Upn              = models.CharField(max_length=200, null=True, blank=True)
    MsalTokenCache   = models.BinaryField(null=True, blank=True)
    FechaVinculacion = models.DateTimeField(auto_now_add=True)
    FechaUltimoUso   = models.DateTimeField(null=True, blank=True)
    Activo           = models.BooleanField(default=True)
    UltimoError      = models.CharField(max_length=500, null=True, blank=True)

    class Meta:
        managed  = True
        db_table = 'chat_ms_token'


class Chat(models.Model):
    """Mapea un usuario del portal con el chat 1:1 de Teams (Graph chatId)
    entre ese usuario y el agente de soporte."""
    IdChat          = models.AutoField(primary_key=True)
    IdUsuario       = models.IntegerField(unique=True, db_index=True)
    Cedula          = models.CharField(max_length=20, db_index=True)
    GraphChatId     = models.CharField(max_length=200)
    CorreoAgente    = models.EmailField(max_length=200)
    FechaCreacion   = models.DateTimeField(auto_now_add=True)
    UltimaActividad = models.DateTimeField(null=True, blank=True)

    class Meta:
        managed  = True
        db_table = 'chat_hilo'


class Mensaje(models.Model):
    """Copia local de cada mensaje enviado/recibido en el chat de soporte,
    para pintar el historial sin llamar a Graph en cada carga y para el
    flag de no-leído cuando el agente responde."""
    IdMensaje      = models.AutoField(primary_key=True)
    IdChat         = models.ForeignKey(
        Chat, db_column='IdChat', on_delete=models.CASCADE, related_name='mensajes'
    )
    GraphMessageId = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    Direccion      = models.CharField(
        max_length=10, choices=[('SALIENTE', 'Saliente'), ('ENTRANTE', 'Entrante')]
    )
    Texto          = models.TextField()
    FechaGraph     = models.DateTimeField(null=True, blank=True)
    FechaLocal     = models.DateTimeField(auto_now_add=True)
    Leido          = models.BooleanField(default=False)
    Estado         = models.CharField(
        max_length=20, default='enviado',
        choices=[('enviado', 'Enviado'), ('error', 'Error de envío')]
    )

    class Meta:
        managed  = True
        db_table = 'chat_mensaje'
        indexes  = [models.Index(fields=['IdChat', 'FechaGraph'])]