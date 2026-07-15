from django.db import models


# ══════════════════════════════════════════════
# j200 — TIPO DE DISPOSITIVO
# ══════════════════════════════════════════════
class TipoDispositivo(models.Model):
    g200_id               = models.AutoField(primary_key=True)
    g200_tipo_dispositivo = models.CharField(max_length=100)
    g200_estado           = models.BooleanField(default=True)

    class Meta:
        db_table = 'j200_tipodispositivo'

    def __str__(self):
        return self.g200_tipo_dispositivo


# ══════════════════════════════════════════════
# j201 — ESTADO
# ══════════════════════════════════════════════
class Estado(models.Model):
    g201_id          = models.AutoField(primary_key=True)
    g201_descripcion = models.CharField(max_length=100)
    g201_estado      = models.BooleanField(default=True)

    class Meta:
        db_table = 'j201_estado'

    def __str__(self):
        return self.g201_descripcion


# ══════════════════════════════════════════════
# j202 — MARCA
# ══════════════════════════════════════════════
class Marca(models.Model):
    g202_id     = models.AutoField(primary_key=True)
    g202_marca  = models.CharField(max_length=100)
    g202_estado = models.BooleanField(default=True)

    class Meta:
        db_table = 'j202_marca'

    def __str__(self):
        return self.g202_marca


# ══════════════════════════════════════════════
# j203 — PROPIETARIO
# ══════════════════════════════════════════════
class Propietario(models.Model):
    g203_id                 = models.AutoField(primary_key=True)
    g203_id_tipo_documento  = models.ForeignKey(
        'TipoDocumento',
        on_delete=models.PROTECT,
        db_column='g203_id_tipo_documento'
    )
    g203_documento   = models.CharField(max_length=20)
    g203_propietario = models.CharField(max_length=100)
    g203_estado      = models.BooleanField(default=True)

    class Meta:
        db_table = 'j203_propietario'

    def __str__(self):
        return self.g203_propietario


# ══════════════════════════════════════════════
# j204 — DEPARTAMENTO
# ══════════════════════════════════════════════
class Departamento(models.Model):
    g204_id           = models.AutoField(primary_key=True)
    g204_departamento = models.CharField(max_length=100)
    g204_estado       = models.BooleanField(default=True)

    class Meta:
        db_table = 'j204_departamento'

    def __str__(self):
        return self.g204_departamento


# ══════════════════════════════════════════════
# j205 — MUNICIPIO
# ══════════════════════════════════════════════
class Municipio(models.Model):
    g205_id            = models.AutoField(primary_key=True)
    g205_departamento   = models.ForeignKey(
        Departamento,
        on_delete=models.PROTECT,
        db_column='g205_id_departamento',
        null=True,
        blank=True
    )
    g205_municipio     = models.CharField(max_length=100)
    g205_longitud = models.FloatField(
    null=True,
    blank=True
    )

    g205_latitud = models.FloatField(
    null=True,
    blank=True
    )
    g205_estado = models.BooleanField(default=True)

    class Meta:
        db_table = 'j205_municipio'

    def __str__(self):
        # Proteger por si g205_departamento es None
        if self.g205_departamento:
            return f"{self.g205_municipio} — {self.g205_departamento.g204_departamento}"
        return f"{self.g205_municipio}"


# ══════════════════════════════════════════════
# j206 — TIPO DE DOCUMENTO
# ══════════════════════════════════════════════
class TipoDocumento(models.Model):
    g206_id             = models.AutoField(primary_key=True)
    g206_tipo_documento = models.CharField(max_length=60)
    g206_estado         = models.BooleanField(default=True)

    class Meta:
        db_table = 'j206_tipodocumento'

    def __str__(self):
        return self.g206_tipo_documento


# ══════════════════════════════════════════════
# j207 — CENTRO DE OPERACIONES 
# ══════════════════════════════════════════════
class CentroOperaciones(models.Model):
    g207_id              = models.AutoField(primary_key=True)
    g207_co              = models.CharField(max_length=20, unique=True)
    g207_descripcion_co  = models.CharField(max_length=150)
    g207_estado          = models.BooleanField(default=True)

    class Meta:
        db_table = 'j207_CentroOperaciones'

    def __str__(self):
        return self.g207_co


# ══════════════════════════════════════════════
# j208 — ANTIVIRUS
# ══════════════════════════════════════════════
class Antivirus(models.Model):
    g208_id       = models.AutoField(primary_key=True)
    g208_antivirus = models.CharField(max_length=100)
    g208_estado   = models.BooleanField(default=True)

    class Meta:
        db_table = 'j208_antivirus'

    def __str__(self):
        return self.g208_antivirus


# ══════════════════════════════════════════════
# j209 — PROCESADOR
# ══════════════════════════════════════════════
class Procesador(models.Model):
    g209_id         = models.AutoField(primary_key=True)
    g209_procesador = models.CharField(max_length=150)
    g209_estado     = models.BooleanField(default=True)

    class Meta:
        db_table = 'j209_procesador'

    def __str__(self):
        return self.g209_procesador


# ══════════════════════════════════════════════
# j210 — SISTEMA OPERATIVO
# ══════════════════════════════════════════════
class SistemaOperativo(models.Model):
    g210_id     = models.AutoField(primary_key=True)
    g210_so     = models.CharField(max_length=100)
    g210_estado = models.BooleanField(default=True)

    class Meta:
        db_table = 'j210_sistemaoperativo'

    def __str__(self):
        return self.g210_so


# ══════════════════════════════════════════════
# j211 — LICENCIA OFFICE
# ══════════════════════════════════════════════
class LicenciaOffice(models.Model):
    g211_id     = models.AutoField(primary_key=True)
    g211_office = models.CharField(max_length=100)
    g211_estado = models.BooleanField(default=True)

    class Meta:
        db_table = 'j211_licenciaoffice'

    def __str__(self):
        return self.g211_office


# ══════════════════════════════════════════════
# j218 — OPCIONES  (catálogo genérico: RAM, tipo disco, tipo impresora, etc.)
# Antes llamado TipoDispositivo — renombrado para evitar duplicado con j200
# ══════════════════════════════════════════════
class Opciones(models.Model):
    g218_id      = models.AutoField(primary_key=True)
    g218_opciones = models.CharField(max_length=60)
    g218_estado  = models.BooleanField(default=True)

    class Meta:
        db_table = 'j218_opciones'

    def __str__(self):
        return self.g218_opciones


# ══════════════════════════════════════════════
# j219 — ALMACENAMIENTO  (catálogo: 128 GB, 256 GB, 1 TB…)
# ══════════════════════════════════════════════
class Almacenamiento(models.Model):
    g219_id              = models.AutoField(primary_key=True)
    g219_almacenamiento  = models.CharField(max_length=100)
    g219_estado          = models.BooleanField(default=True)

    class Meta:
        db_table = 'j219_almacenamiento'

    def __str__(self):
        return self.g219_almacenamiento


# ══════════════════════════════════════════════
# j230 — RAM  (catálogo propio)
# Ej: 4GB, 8GB, 16GB, 32GB…
# ══════════════════════════════════════════════
class RAM(models.Model):
    g230_id     = models.AutoField(primary_key=True)
    g230_ram    = models.CharField(max_length=50)
    g230_estado = models.BooleanField(default=True)

    class Meta:
        db_table = 'j230_ram'
        verbose_name = 'RAM'

    def __str__(self):
        return self.g230_ram


# ══════════════════════════════════════════════
# j231 — TIPO DE DISCO  (catálogo propio)
# Ej: SSD, HDD, SSD NVME, SSD M.2…
# ══════════════════════════════════════════════
class TipoDisco(models.Model):
    g231_id          = models.AutoField(primary_key=True)
    g231_tipo_disco  = models.CharField(max_length=50)
    g231_estado      = models.BooleanField(default=True)

    class Meta:
        db_table = 'j231_tipo_disco'
        verbose_name = 'Tipo de Disco'

    def __str__(self):
        return self.g231_tipo_disco


# ══════════════════════════════════════════════
# j220 — TIPO DE NOVEDAD  (ASIGNACIÓN, DEVOLUCIÓN, MANTENIMIENTO, BAJA…)
# Separado de Estado para no mezclar semánticas distintas
# ══════════════════════════════════════════════
class TipoNovedad(models.Model):
    g220_id       = models.AutoField(primary_key=True)
    g220_novedad  = models.CharField(max_length=100)
    g220_estado   = models.BooleanField(default=True)

    class Meta:
        db_table = 'j220_tiponovedad'

    def __str__(self):
        return self.g220_novedad


# ══════════════════════════════════════════════
# j221 — OPERADOR  (CLARO, MOVISTAR, TIGO, WOM…)
# Aplica a CELULAR, TABLET, MODEM WIFI, SIMCARD
# ══════════════════════════════════════════════
class Operador(models.Model):
    g221_id       = models.AutoField(primary_key=True)
    g221_operador = models.CharField(max_length=100)
    g221_estado   = models.BooleanField(default=True)

    class Meta:
        db_table = 'j221_operador'

    def __str__(self):
        return self.g221_operador


# ══════════════════════════════════════════════
# j212 — DISPOSITIVO (INVENTARIO ACTIVO)
# Campos comunes a todos los tipos de dispositivo
# ══════════════════════════════════════════════
class Dispositivo(models.Model):
    g212_id          = models.AutoField(primary_key=True)
    g212_serial      = models.CharField(max_length=50, unique=True)
    g212_tipo        = models.ForeignKey(
        TipoDispositivo, on_delete=models.SET_NULL,
        null=True, db_column='g212_tipo_id', related_name='dispositivos'
    )
    g212_marca       = models.ForeignKey(
        Marca, on_delete=models.SET_NULL,
        null=True, blank=True, db_column='g212_marca_id'
    )

    g212_propietario = models.ForeignKey(
        Propietario, on_delete=models.SET_NULL,
        null=True, db_column='g212_propietario_id'
    )
    g212_estado      = models.ForeignKey(
        Estado, on_delete=models.SET_NULL,
        null=True, db_column='g212_estado_id'
    )
    g212_co          = models.ForeignKey(
        CentroOperaciones, on_delete=models.SET_NULL,
        null=True, blank=True, db_column='g212_co_id'
    )
    g212_centro_costo = models.ForeignKey(
        'CentroCosto', on_delete=models.SET_NULL,
        null=True, blank=True, db_column='g212_centro_costo_id'
    )
   
   
    g212_nombre_equipo     = models.CharField(max_length=100, blank=True, null=True)
    g212_valor_promedio    = models.DecimalField(max_digits=14, decimal_places=2, blank=True, null=True)
    g212_valor_arrendamiento = models.DecimalField(max_digits=14, decimal_places=2, blank=True, null=True)
    g212_departamento      = models.ForeignKey(
        Departamento, on_delete=models.SET_NULL,
        null=True, blank=True, db_column='g212_departamento_id'
    )
    g212_municipio         = models.ForeignKey(
        Municipio, on_delete=models.SET_NULL,
        null=True, blank=True, db_column='g212_municipio_id'
    )
    g212_observaciones     = models.TextField(blank=True, null=True)
    g212_ubicacion         = models.CharField(max_length=200, blank=True, null=True)
    g212_fecha_registro    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'j212_dispositivo'

    def __str__(self):
        return self.g212_serial


# ══════════════════════════════════════════════
# j222 — CARACTERÍSTICAS PC  (TORRE y PORTÁTIL)
# Relación 1-a-1 con Dispositivo
# ══════════════════════════════════════════════
class CaracteristicaPC(models.Model):
    g222_id          = models.AutoField(primary_key=True)
    g222_dispositivo = models.OneToOneField(
        Dispositivo, on_delete=models.CASCADE,
        db_column='g222_dispositivo_id', related_name='caract_pc'
    )
    g222_procesador  = models.ForeignKey(
        Procesador, on_delete=models.SET_NULL,
        null=True, blank=True, db_column='g222_procesador_id'
    )
    g222_so          = models.ForeignKey(
        SistemaOperativo, on_delete=models.SET_NULL,
        null=True, blank=True, db_column='g222_so_id'
    )
    g222_antivirus   = models.ForeignKey(
        Antivirus, on_delete=models.SET_NULL,
        null=True, blank=True, db_column='g222_antivirus_id'
    )
    g222_licencia    = models.ForeignKey(
        LicenciaOffice, on_delete=models.SET_NULL,
        null=True, blank=True, db_column='g222_licencia_id'
    )
    g222_correo_office  = models.EmailField(blank=True, null=True)
    g222_key_office     = models.CharField(max_length=150, blank=True, null=True)
    # RAM como FK al catálogo propio j230_ram (4GB, 8GB, 16GB…)
    g222_ram = models.IntegerField(blank=True, null=True, db_column='g222_ram')
    # Tipo disco como FK al catálogo propio j231_tipo_disco (HDD, SSD, SSD NVME…)
    g222_tipo_disco  = models.ForeignKey(
        TipoDisco, on_delete=models.SET_NULL,
        null=True, blank=True, db_column='g222_tipodisco_id',
        related_name='pcs_tipodisco'
    )
    g222_almacenamiento = models.ForeignKey(
        Almacenamiento, on_delete=models.SET_NULL,
        null=True, blank=True, db_column='g222_almacenamiento_id'
    )
    # Solo aplica en PORTÁTIL — null en TORRE
    g222_activo      = models.CharField(max_length=100, blank=True, null=True)
    g222_pulgadas    = models.DecimalField(max_digits=4, decimal_places=1, blank=True, null=True)

    class Meta:
        db_table = 'j222_caract_pc'

    def __str__(self):
        return f"PC → {self.g222_dispositivo.g212_serial}"


# ══════════════════════════════════════════════
# j223 — CARACTERÍSTICAS MÓVIL
# Cubre: CELULAR, TABLET, MODEM WIFI, SIMCARD, TELÉFONO FIJO
# Relación 1-a-1 con Dispositivo
# ══════════════════════════════════════════════
class CaracteristicaMovil(models.Model):
    g223_id          = models.AutoField(primary_key=True)
    g223_dispositivo = models.OneToOneField(
        Dispositivo, on_delete=models.CASCADE,
        db_column='g223_dispositivo_id', related_name='caract_movil'
    )
    g223_numero_linea = models.CharField(max_length=20, blank=True, null=True)
    g223_operador     = models.ForeignKey(
        Operador, on_delete=models.SET_NULL,
        null=True, blank=True, db_column='g223_operador_id'
    )
    g223_plan_datos   = models.CharField(max_length=100, blank=True, null=True)
    # IMEI 1 y 2 — null en SIMCARD y TELÉFONO FIJO
    g223_imei1        = models.CharField(max_length=20, blank=True, null=True)
    g223_imei2        = models.CharField(max_length=20, blank=True, null=True)
    # Solo CELULAR y TABLET
    g223_cuenta_gmail = models.EmailField(blank=True, null=True)
    g223_contrasena_gmail = models.CharField(max_length=100, blank=True, null=True)
    g223_pulgadas     = models.DecimalField(max_digits=4, decimal_places=1, blank=True, null=True)
    # Solo MODEM WIFI
    g223_almacenamiento = models.ForeignKey(
        Almacenamiento, on_delete=models.SET_NULL,
        null=True, blank=True, db_column='g223_almacenamiento_id'
    )

    class Meta:
        db_table = 'j223_caract_movil'

    def __str__(self):
        return f"Móvil → {self.g223_dispositivo.g212_serial}"


# ══════════════════════════════════════════════
# j224 — CARACTERÍSTICAS PANTALLA / MONITOR
# Relación 1-a-1 con Dispositivo
# ══════════════════════════════════════════════
class CaracteristicaPantalla(models.Model):
    g224_id          = models.AutoField(primary_key=True)
    g224_dispositivo = models.OneToOneField(
        Dispositivo, on_delete=models.CASCADE,
        db_column='g224_dispositivo_id', related_name='caract_pantalla'
    )
    g224_pulgadas    = models.DecimalField(max_digits=4, decimal_places=1, blank=True, null=True)
    g224_resolucion  = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        db_table = 'j224_caract_pantalla'

    def __str__(self):
        return f"Pantalla → {self.g224_dispositivo.g212_serial}"



# j229 — TIPO DE IMPRESORA  (catálogo propio)


class TipoImpresora(models.Model):
    g229_id              = models.AutoField(primary_key=True)
    g229_tipo_impresora  = models.CharField(max_length=100)
    g229_estado          = models.BooleanField(default=True)

    class Meta:
        db_table = 'j229_tipoimpresora'
        verbose_name = 'Tipo de Impresora'

    def __str__(self):
        return self.g229_tipo_impresora


# ═════════════════════════════════════════════
# j225 — CARACTERÍSTICAS IMPRESORA
# Relación 1-a-1 con Dispositivo
class CaracteristicaImpresora(models.Model):
    g225_id          = models.AutoField(primary_key=True)
    g225_dispositivo = models.OneToOneField(
        Dispositivo, on_delete=models.CASCADE,
        db_column='g225_dispositivo_id', related_name='caract_impresora'
    )
    # Tipo: LÁSER, INYECCIÓN DE TINTA, TÉRMICA… — FK a TipoImpresora (tabla propia j229)
    g225_tipo_impresora = models.ForeignKey(
        TipoImpresora, on_delete=models.SET_NULL,
        null=True, blank=True, db_column='g225_tipo_impresora_id',
        related_name='impresoras'
    )
    g225_funcion     = models.CharField(max_length=100, blank=True, null=True)  # MULTIFUNCIONAL, SOLO IMPRESIÓN…

    class Meta:
        db_table = 'j225_caract_impresora'

    def __str__(self):
        return f"Impresora → {self.g225_dispositivo.g212_serial}"


# ══════════════════════════════════════════════
# j226 — CARACTERÍSTICAS PERIFÉRICO
# Cubre: TECLADO, MOUSE, DIADEMA, UPS, BASES…
# Relación 1-a-1 con Dispositivo
# ══════════════════════════════════════════════
class CaracteristicaPeriferico(models.Model):
    g226_id          = models.AutoField(primary_key=True)
    g226_dispositivo = models.OneToOneField(
        Dispositivo, on_delete=models.CASCADE,
        db_column='g226_dispositivo_id', related_name='caract_periferico'
    )
    g226_incluye_base     = models.BooleanField(default=False)
    g226_incluye_teclado  = models.BooleanField(default=False)
    g226_incluye_mouse    = models.BooleanField(default=False)
    g226_incluye_auriculares = models.BooleanField(default=False)
    g226_incluye_cargador = models.BooleanField(default=False)
    g226_descripcion_adicional = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'j226_caract_periferico'

    def __str__(self):
        return f"Periférico → {self.g226_dispositivo.g212_serial}"


# ══════════════════════════════════════════════
# j227 — CARACTERÍSTICAS LICENCIA DE SOFTWARE
# Relación 1-a-1 con Dispositivo
# ══════════════════════════════════════════════
class CaracteristicaLicencia(models.Model):
    g227_id          = models.AutoField(primary_key=True)
    g227_dispositivo = models.OneToOneField(
        Dispositivo, on_delete=models.CASCADE,
        db_column='g227_dispositivo_id', related_name='caract_licencia'
    )
    g227_software    = models.CharField(max_length=150, blank=True, null=True)
    g227_version     = models.CharField(max_length=50, blank=True, null=True)
    g227_key         = models.CharField(max_length=150, blank=True, null=True)
    g227_correo      = models.EmailField(blank=True, null=True)
    g227_fecha_vencimiento = models.DateField(blank=True, null=True)

    class Meta:
        db_table = 'j227_caract_licencia'

    def __str__(self):
        return f"Licencia → {self.g227_dispositivo.g212_serial}"


# ══════════════════════════════════════════════
# j213 — DISPOSITIVO INACTIVO
# ══════════════════════════════════════════════
class DispositivoInactivo(models.Model):
    g213_id          = models.AutoField(primary_key=True)
    g213_serial      = models.CharField(max_length=50, blank=True, null=True)
    g213_tipo        = models.ForeignKey(
        TipoDispositivo, on_delete=models.SET_NULL,
        null=True, db_column='g213_tipo_id'
    )
    g213_marca       = models.ForeignKey(
        Marca, on_delete=models.SET_NULL,
        null=True, blank=True, db_column='g213_marca_id'
    )
    g213_modelo         = models.CharField(max_length=100, blank=True, null=True)
    g213_propietario    = models.ForeignKey(
        Propietario, on_delete=models.SET_NULL,
        null=True, db_column='g213_propietario_id'
    )
    g213_estado         = models.ForeignKey(
        Estado, on_delete=models.SET_NULL,
        null=True, db_column='g213_estado_id'
    )
    g213_co             = models.ForeignKey(
        CentroOperaciones, on_delete=models.SET_NULL,
        null=True, blank=True, db_column='g213_co_id'
    )
    g213_observaciones  = models.TextField(blank=True, null=True)
    g213_fecha_registro = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'j213_dispositivoinactivo'

    def __str__(self):
        return f"{self.g213_serial or 'S/N'}"


# j232 — CARACTERÍSTICAS VIDEO BEAM
# Relación 1-a-1 con Dispositivo

class CaracteristicasVideoBeam(models.Model):
    g232_id          = models.AutoField(primary_key=True)
    g232_dispositivo = models.OneToOneField(
        Dispositivo, on_delete=models.CASCADE,
        db_column='g232_dispositivo_id', related_name='caract_videobeam'
    )
    
    g232_lumenes=models.IntegerField(blank=True ,null=True)
    
    class Meta:
        db_table= 'j232_caract_videobeam'
        
        
        
    def __str__(selft):
        
        return f"ViedeoBeam -> {selft.g232_dispositivo.g212_serial}"
    
    


# j214 HISTORIAL EQUIPO
# CORREGIDO: g214_novedad apunta a TipoNovedad (no a Estado)

class HistorialEquipo(models.Model):
    g214_id          = models.AutoField(primary_key=True)
    g214_dispositivo = models.ForeignKey(
        Dispositivo, on_delete=models.CASCADE,
        db_column='g214_dispositivo_id', related_name='historial'
    )
    g214_novedad     = models.ForeignKey(
        TipoNovedad, on_delete=models.SET_NULL,      
        null=True, db_column='g214_novedad_id'
    )
    g214_fecha          = models.DateField()
    g214_hora           = models.TimeField()
    g214_responsable    = models.CharField(max_length=150)
    g214_co             = models.ForeignKey(
        CentroOperaciones, on_delete=models.SET_NULL,
        null=True, blank=True, db_column='g214_co_id'
    )
    g214_observaciones  = models.TextField(blank=True, null=True)
    g214_fecha_registro = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'j214_historialequipo'

    def __str__(self):
        return f"{self.g214_dispositivo.g212_serial} — {self.g214_fecha}"



# j215 — COLABORADOR

class Colaborador(models.Model):
    g215_id             = models.AutoField(primary_key=True)
    g215_documento      = models.CharField(max_length=20, unique=True)
    g215_nombre         = models.CharField(max_length=200)
    g215_co             = models.ForeignKey(
        CentroOperaciones, on_delete=models.SET_NULL,
        null=True, blank=True, db_column='g215_co_id'
    )
    g215_correo         = models.EmailField(         
        max_length=254, null=True, blank=True
    )
    g215_cargo          = models.CharField(max_length=150)
    g215_estado         = models.ForeignKey(
        Estado, on_delete=models.SET_NULL,
        null=True, db_column='g215_estado_id'
    )
    g215_Area           = models.ForeignKey(          
        'CentroCosto', on_delete=models.SET_NULL,
        null=True, blank=True, db_column='g215_area_id'
    )
    
    
    g215_fecha_registro = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'j215_colaborador'

    def __str__(self):
        return f"{self.g215_documento} — {self.g215_nombre}"


# ══════════════════════════════════════════════
# j216 — ASIGNACIÓN COLABORADOR ↔ DISPOSITIVO
# ══════════════════════════════════════════════
class AsignacionColaborador(models.Model):
    g216_id          = models.AutoField(primary_key=True)
    g216_colaborador = models.ForeignKey(
        Colaborador, on_delete=models.CASCADE,
        db_column='g216_colaborador_id', related_name='asignaciones'
    )
    g216_dispositivo = models.ForeignKey(
        Dispositivo, on_delete=models.CASCADE,
        db_column='g216_dispositivo_id'
    )
    g216_fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'j216_asignacion'
        unique_together = ('g216_colaborador', 'g216_dispositivo')

    def __str__(self):
        return f"{self.g216_colaborador.g215_nombre} ← {self.g216_dispositivo.g212_serial}"


# ══════════════════════════════════════════════
# j217 — ACTA
# ══════════════════════════════════════════════
class Acta(models.Model):
    g217_id           = models.AutoField(primary_key=True)
    g217_colaborador  = models.ForeignKey(
        Colaborador, on_delete=models.CASCADE,
        db_column='g217_colaborador_id', related_name='actas'
    )
    g217_tipo          = models.CharField(max_length=20)   # ENTREGA / DEVOLUCIÓN / TRASLADO
    g217_proceso       = models.CharField(max_length=50)
    g217_correo        = models.EmailField()
    g217_firma_recibe  = models.TextField(blank=True, null=True)
    g217_firma_entrega = models.TextField(blank=True, null=True)
    g217_fecha         = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'j217_acta'

    def __str__(self):
        return f"Acta {self.g217_tipo} — {self.g217_colaborador.g215_nombre}"
    
    
#CENTRO DE COSTOS 

class CentroCosto(models.Model):
    g228_id          = models.AutoField(primary_key=True)
    g228_nombre      = models.CharField(max_length=100)
    g228_estado      = models.BooleanField(default=True)

    class Meta:
        db_table = 'j228_Area'
        verbose_name = 'Area'

    def __str__(self):
        return self.g228_nombre