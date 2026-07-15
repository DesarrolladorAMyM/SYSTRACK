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