# inventario/admin.py
from django.contrib import admin
from django import forms
from import_export import resources, fields
from import_export.widgets import ForeignKeyWidget
from import_export.admin import ImportExportModelAdmin
from .models import (
    TipoDispositivo, Estado, Marca, Propietario,
    Departamento, Municipio, CentroOperaciones, Antivirus,
    Procesador, SistemaOperativo, LicenciaOffice,
    Opciones, Almacenamiento, TipoNovedad, Operador,
    RAM, TipoDisco,
    Dispositivo, CaracteristicaPC, CaracteristicaMovil,
    CaracteristicaPantalla, CaracteristicaImpresora,
    CaracteristicaPeriferico, CaracteristicaLicencia,
    DispositivoInactivo, HistorialEquipo,
    Colaborador, AsignacionColaborador, Acta, TipoDocumento, CentroCosto, TipoImpresora, CaracteristicasVideoBeam
)


# ══════════════════════════════════════════════════════
# CATÁLOGOS SIMPLES
# ══════════════════════════════════════════════════════

@admin.register(TipoDispositivo)
class TipoDispositivoAdmin(admin.ModelAdmin):
    list_display  = ['g200_id', 'g200_tipo_dispositivo', 'g200_estado']
    list_editable = ['g200_estado']
    search_fields = ['g200_tipo_dispositivo']

@admin.register(Estado)
class EstadoAdmin(admin.ModelAdmin):
    list_display  = ['g201_id', 'g201_descripcion', 'g201_estado']
    list_editable = ['g201_estado']

@admin.register(Marca)
class MarcaAdmin(admin.ModelAdmin):
    list_display  = ['g202_id', 'g202_marca', 'g202_estado']
    list_editable = ['g202_estado']
    search_fields = ['g202_marca']

@admin.register(Opciones)
class OpcionesAdmin(admin.ModelAdmin):
    list_display  = ['g218_id', 'g218_opciones', 'g218_estado']
    list_editable = ['g218_estado']

@admin.register(Almacenamiento)
class AlmacenamientoAdmin(admin.ModelAdmin):
    list_display  = ['g219_id', 'g219_almacenamiento', 'g219_estado']
    list_editable = ['g219_estado']

@admin.register(TipoNovedad)
class TipoNovedadAdmin(admin.ModelAdmin):
    list_display  = ['g220_id', 'g220_novedad', 'g220_estado']
    list_editable = ['g220_estado']

@admin.register(Operador)
class OperadorAdmin(admin.ModelAdmin):
    list_display  = ['g221_id', 'g221_operador', 'g221_estado']
    list_editable = ['g221_estado']

@admin.register(Antivirus)
class AntivirusAdmin(admin.ModelAdmin):
    list_display  = ['g208_id', 'g208_antivirus', 'g208_estado']
    list_editable = ['g208_estado']

@admin.register(Procesador)
class ProcesadorAdmin(admin.ModelAdmin):
    list_display  = ['g209_id', 'g209_procesador', 'g209_estado']
    list_editable = ['g209_estado']

@admin.register(SistemaOperativo)
class SistemaOperativoAdmin(admin.ModelAdmin):
    list_display  = ['g210_id', 'g210_so', 'g210_estado']
    list_editable = ['g210_estado']

@admin.register(LicenciaOffice)
class LicenciaOfficeAdmin(admin.ModelAdmin):
    list_display  = ['g211_id', 'g211_office', 'g211_estado']
    list_editable = ['g211_estado']

@admin.register(TipoDocumento)
class TipoDocumentoAdmin(admin.ModelAdmin):
    list_display  = ['g206_id', 'g206_tipo_documento', 'g206_estado']
    list_editable = ['g206_estado']


# ══════════════════════════════════════════════════════
# DEPARTAMENTO
# ══════════════════════════════════════════════════════

class DepartamentoResource(resources.ModelResource):
    class Meta:
        model           = Departamento
        fields          = ('g204_departamento', 'g204_estado')
        import_id_fields = ['g204_departamento']
        exclude         = ('g204_id',)

@admin.register(Departamento)
class DepartamentoAdmin(ImportExportModelAdmin):
    resource_class = DepartamentoResource
    list_display   = ['g204_id', 'g204_departamento', 'g204_estado']
    list_editable  = ['g204_estado']
    search_fields  = ['g204_departamento']


# ══════════════════════════════════════════════════════
# MUNICIPIO
# ══════════════════════════════════════════════════════

class MunicipioResource(resources.ModelResource):
    g205_departamento = fields.Field(
        column_name='g205_departamento',
        attribute='g205_departamento',
        widget=ForeignKeyWidget(Departamento, 'g204_id')
    )

    def before_import(self, dataset, **kwargs):
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("DBCC CHECKIDENT ('j205_Municipio', RESEED, 0)")

    def get_or_init_instance(self, instance_loader, row):
        try:
            instance = Municipio.objects.get(g205_municipio=row['g205_municipio'])
            created = False
        except Municipio.DoesNotExist:
            instance = Municipio()
            created = True
        return instance, created

    def before_save_instance(self, instance, row, **kwargs):
        if not instance.pk:
            instance.g205_id = None

    class Meta:
        model            = Municipio
        exclude          = ('g205_id',)
        import_id_fields = ['g205_municipio']
        skip_unchanged   = False
        report_skipped   = False

@admin.register(Municipio)
class MunicipioAdmin(ImportExportModelAdmin):
    resource_class = MunicipioResource
    list_display   = ['g205_id', 'g205_departamento', 'g205_municipio', 'g205_estado', 'g205_longitud', 'g205_latitud']
    search_fields  = ['g205_municipio', 'g205_longitud', 'g205_latitud']


# ══════════════════════════════════════════════════════
# CENTRO DE OPERACIONES
# ══════════════════════════════════════════════════════

class CentroOperacionesResource(resources.ModelResource):

    def before_import(self, dataset, **kwargs):
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("DBCC CHECKIDENT ('j207_CentroOperaciones', RESEED, 0)")

    def get_or_init_instance(self, instance_loader, row):
        try:
            instance = CentroOperaciones.objects.get(g207_co=row['g207_co'])
            created = False
        except CentroOperaciones.DoesNotExist:
            instance = CentroOperaciones()
            created = True
        return instance, created

    def before_save_instance(self, instance, row, **kwargs):
        if not instance.pk:
            instance.g207_id = None

    class Meta:
        model            = CentroOperaciones
        exclude          = ('g207_id',)
        import_id_fields = ['g207_co']
        skip_unchanged   = False
        report_skipped   = False

@admin.register(CentroOperaciones)
class CentroOperacionesAdmin(ImportExportModelAdmin):
    resource_class = CentroOperacionesResource
    list_display   = ['g207_id', 'g207_co', 'g207_descripcion_co', 'g207_estado']
    list_editable  = ['g207_estado']
    search_fields  = ['g207_co', 'g207_descripcion_co']


# ══════════════════════════════════════════════════════
# INLINES DE CARACTERÍSTICAS (para el form manual)
# ══════════════════════════════════════════════════════

class CaracteristicaPCInline(admin.StackedInline):
    model      = CaracteristicaPC
    extra      = 0
    can_delete = False

class CaracteristicaMovilInline(admin.StackedInline):
    model      = CaracteristicaMovil
    extra      = 0
    can_delete = False

class CaracteristicaPantallaInline(admin.StackedInline):
    model      = CaracteristicaPantalla
    extra      = 0
    can_delete = False

class CaracteristicaImpresoraInline(admin.StackedInline):
    model      = CaracteristicaImpresora
    extra      = 0
    can_delete = False

class CaracteristicaPerifericoInline(admin.StackedInline):
    model      = CaracteristicaPeriferico
    extra      = 0
    can_delete = False

class CaracteristicaVideoBeamInline(admin.StackedInline):
    model      = CaracteristicasVideoBeam
    extra      = 0
    can_delete = False


# ══════════════════════════════════════════════════════
# HISTORIAL INLINE — muestra TODO el historial al abrir un equipo
# ══════════════════════════════════════════════════════

class HistorialInline(admin.TabularInline):
    model               = HistorialEquipo
    extra               = 0
    readonly_fields     = [
        'g214_fecha', 'g214_hora', 'g214_novedad',
        'g214_responsable', 'g214_co', 'g214_observaciones',
        'g214_fecha_registro'
    ]
    can_delete          = False
    ordering            = ['-g214_fecha', '-g214_hora']   # más reciente primero
    max_num             = 0                                # solo lectura, no agrega desde aquí
    verbose_name_plural = '📋 Historial completo del equipo'


# ══════════════════════════════════════════════════════
# DISPOSITIVO — Resource para carga masiva
# ══════════════════════════════════════════════════════

class DispositivoResource(resources.ModelResource):

    g212_tipo = fields.Field(
        column_name='g212_tipo',
        attribute='g212_tipo',
        widget=ForeignKeyWidget(TipoDispositivo, field='g200_tipo_dispositivo')
    )
    g212_marca = fields.Field(
        column_name='g212_marca',
        attribute='g212_marca',
        widget=ForeignKeyWidget(Marca, field='g202_marca')
    )
    g212_propietario = fields.Field(
        column_name='g212_propietario',
        attribute='g212_propietario',
        widget=ForeignKeyWidget(Propietario, field='g203_propietario')
    )
    g212_estado = fields.Field(
        column_name='g212_estado',
        attribute='g212_estado',
        widget=ForeignKeyWidget(Estado, field='g201_descripcion')
    )
    g212_co = fields.Field(
        column_name='g212_co',
        attribute='g212_co',
        widget=ForeignKeyWidget(CentroOperaciones, field='g207_co')
    )
    g212_centro_costo = fields.Field(
        column_name='g212_centro_costo',
        attribute='g212_centro_costo',
        widget=ForeignKeyWidget(CentroCosto, field='g228_nombre')
    )
    g212_departamento = fields.Field(
        column_name='g212_departamento',
        attribute='g212_departamento',
        widget=ForeignKeyWidget(Departamento, field='g204_departamento')
    )
    g212_municipio = fields.Field(
        column_name='g212_municipio',
        attribute='g212_municipio',
        widget=ForeignKeyWidget(Municipio, field='g205_municipio')
    )

    class Meta:
        model            = Dispositivo
        exclude          = ('g212_id', 'g212_fecha_registro')
        import_id_fields = ['g212_serial']
        skip_unchanged   = True
        report_skipped   = True
        use_bulk_create  = False

    def before_import_row(self, row, row_number=None, **kwargs):
        if not row.get('g212_serial'):
            from import_export.exceptions import ImportExcludeRow
            raise ImportExcludeRow()

    def get_or_init_instance(self, instance_loader, row):
        try:
            return super().get_or_init_instance(instance_loader, row)
        except Dispositivo.DoesNotExist:
            return Dispositivo(), True


@admin.register(Dispositivo)
class DispositivoAdmin(ImportExportModelAdmin):
    resource_class = DispositivoResource
    list_display   = ['g212_serial', 'g212_tipo', 'g212_marca', 'g212_propietario', 'g212_estado', 'g212_co']
    list_filter    = ['g212_tipo', 'g212_estado', 'g212_co', 'g212_departamento']
    search_fields  = ['g212_serial', 'g212_nombre_equipo']
    list_per_page  = 25
    inlines        = [
        CaracteristicaPCInline,
        CaracteristicaMovilInline,
        CaracteristicaPantallaInline,
        CaracteristicaImpresoraInline,
        CaracteristicaPerifericoInline,
        CaracteristicaVideoBeamInline,
        HistorialInline,
    ]
    fieldsets = (
        ('Identificación', {
            'fields': ('g212_serial', 'g212_tipo', 'g212_marca', 'g212_propietario')
        }),
        ('Estado y asignación', {
            'fields': ('g212_estado', 'g212_co', 'g212_centro_costo', 'g212_nombre_equipo')
        }),
        ('Financiero', {
            'classes': ('collapse',),
            'fields': ('g212_valor_promedio', 'g212_valor_arrendamiento')
        }),
        ('Ubicación', {
            'fields': ('g212_departamento', 'g212_municipio', 'g212_ubicacion')
        }),
        ('Adicional', {
            'classes': ('collapse',),
            'fields': ('g212_observaciones',)
        }),
    )


# ══════════════════════════════════════════════════════
# CARACTERÍSTICAS PC — Resource para carga masiva
# ══════════════════════════════════════════════════════

class CaracteristicaPCResource(resources.ModelResource):

    g222_dispositivo = fields.Field(
        column_name='g222_dispositivo',
        attribute='g222_dispositivo',
        widget=ForeignKeyWidget(Dispositivo, field='g212_serial')
    )
    g222_procesador = fields.Field(
        column_name='g222_procesador',
        attribute='g222_procesador',
        widget=ForeignKeyWidget(Procesador, field='g209_procesador')
    )
    g222_so = fields.Field(
        column_name='g222_so',
        attribute='g222_so',
        widget=ForeignKeyWidget(SistemaOperativo, field='g210_so')
    )
    g222_antivirus = fields.Field(
        column_name='g222_antivirus',
        attribute='g222_antivirus',
        widget=ForeignKeyWidget(Antivirus, field='g208_antivirus')
    )
    g222_licencia = fields.Field(
        column_name='g222_licencia',
        attribute='g222_licencia',
        widget=ForeignKeyWidget(LicenciaOffice, field='g211_office')
    )
    g222_ram = fields.Field(
        column_name='g222_ram',
        attribute='g222_ram',
        widget=ForeignKeyWidget(RAM, field='g230_ram')
    )
    g222_tipo_disco = fields.Field(
        column_name='g222_tipo_disco',
        attribute='g222_tipo_disco',
        widget=ForeignKeyWidget(TipoDisco, field='g231_tipo_disco')
    )
    g222_almacenamiento = fields.Field(
        column_name='g222_almacenamiento',
        attribute='g222_almacenamiento',
        widget=ForeignKeyWidget(Almacenamiento, field='g219_almacenamiento')
    )

    class Meta:
        model            = CaracteristicaPC
        exclude          = ('g222_id',)
        import_id_fields = ['g222_dispositivo']
        skip_unchanged   = True
        report_skipped   = True
        use_bulk_create  = False

    def before_import_row(self, row, row_number=None, **kwargs):
        if not row.get('g222_dispositivo'):
            from import_export.exceptions import ImportExcludeRow
            raise ImportExcludeRow()

    def get_or_init_instance(self, instance_loader, row):
        try:
            return super().get_or_init_instance(instance_loader, row)
        except CaracteristicaPC.DoesNotExist:
            return CaracteristicaPC(), True


@admin.register(CaracteristicaPC)
class CaracteristicaPCAdmin(ImportExportModelAdmin):
    resource_class = CaracteristicaPCResource
    list_display   = ['g222_dispositivo', 'g222_procesador', 'g222_so', 'g222_ram', 'g222_tipo_disco', 'g222_almacenamiento']
    list_filter    = ['g222_procesador', 'g222_so', 'g222_antivirus', 'g222_ram', 'g222_tipo_disco']
    search_fields  = ['g222_dispositivo__g212_serial']
    raw_id_fields  = ['g222_dispositivo']


# ══════════════════════════════════════════════════════
# CARACTERÍSTICAS MÓVIL — Resource para carga masiva
# ══════════════════════════════════════════════════════

class CaracteristicaMovilResource(resources.ModelResource):

    g223_dispositivo = fields.Field(
        column_name='g223_dispositivo',
        attribute='g223_dispositivo',
        widget=ForeignKeyWidget(Dispositivo, field='g212_serial')
    )
    g223_operador = fields.Field(
        column_name='g223_operador',
        attribute='g223_operador',
        widget=ForeignKeyWidget(Operador, field='g221_operador')
    )
    g223_almacenamiento = fields.Field(
        column_name='g223_almacenamiento',
        attribute='g223_almacenamiento',
        widget=ForeignKeyWidget(Almacenamiento, field='g219_almacenamiento')
    )

    class Meta:
        model            = CaracteristicaMovil
        exclude          = ('g223_id',)
        import_id_fields = ['g223_dispositivo']
        skip_unchanged   = True
        report_skipped   = True
        use_bulk_create  = False

    def before_import_row(self, row, row_number=None, **kwargs):
        if not row.get('g223_dispositivo'):
            from import_export.exceptions import ImportExcludeRow
            raise ImportExcludeRow()

    def get_or_init_instance(self, instance_loader, row):
        try:
            return super().get_or_init_instance(instance_loader, row)
        except CaracteristicaMovil.DoesNotExist:
            return CaracteristicaMovil(), True


@admin.register(CaracteristicaMovil)
class CaracteristicaMovilAdmin(ImportExportModelAdmin):
    resource_class = CaracteristicaMovilResource
    list_display   = ['g223_dispositivo', 'g223_numero_linea', 'g223_operador', 'g223_imei1']
    list_filter    = ['g223_operador']
    search_fields  = ['g223_dispositivo__g212_serial', 'g223_numero_linea', 'g223_imei1']
    raw_id_fields  = ['g223_dispositivo']


# ══════════════════════════════════════════════════════
# CARACTERÍSTICAS PANTALLA — Resource para carga masiva
# ══════════════════════════════════════════════════════

class CaracteristicaPantallaResource(resources.ModelResource):

    g224_dispositivo = fields.Field(
        column_name='g224_dispositivo',
        attribute='g224_dispositivo',
        widget=ForeignKeyWidget(Dispositivo, field='g212_serial')
    )

    class Meta:
        model            = CaracteristicaPantalla
        exclude          = ('g224_id',)
        import_id_fields = ['g224_dispositivo']
        skip_unchanged   = True
        report_skipped   = True
        use_bulk_create  = False

    def before_import_row(self, row, row_number=None, **kwargs):
        if not row.get('g224_dispositivo'):
            from import_export.exceptions import ImportExcludeRow
            raise ImportExcludeRow()

    def get_or_init_instance(self, instance_loader, row):
        try:
            return super().get_or_init_instance(instance_loader, row)
        except CaracteristicaPantalla.DoesNotExist:
            return CaracteristicaPantalla(), True


@admin.register(CaracteristicaPantalla)
class CaracteristicaPantallaAdmin(ImportExportModelAdmin):
    resource_class = CaracteristicaPantallaResource
    list_display   = ['g224_dispositivo', 'g224_pulgadas', 'g224_resolucion']
    search_fields  = ['g224_dispositivo__g212_serial']
    raw_id_fields  = ['g224_dispositivo']


# ══════════════════════════════════════════════════════
# CARACTERÍSTICAS IMPRESORA — Resource para carga masiva
# ══════════════════════════════════════════════════════

class CaracteristicaImpresoraResource(resources.ModelResource):

    g225_dispositivo = fields.Field(
        column_name='g225_dispositivo',
        attribute='g225_dispositivo',
        widget=ForeignKeyWidget(Dispositivo, field='g212_serial')
    )
    g225_tipo_impresora = fields.Field(
        column_name='g225_tipo_impresora',
        attribute='g225_tipo_impresora',
        widget=ForeignKeyWidget(TipoImpresora, field='g229_tipo_impresora')
    )

    class Meta:
        model            = CaracteristicaImpresora
        exclude          = ('g225_id',)
        import_id_fields = ['g225_dispositivo']
        skip_unchanged   = True
        report_skipped   = True
        use_bulk_create  = False

    def before_import_row(self, row, row_number=None, **kwargs):
        if not row.get('g225_dispositivo'):
            from import_export.exceptions import ImportExcludeRow
            raise ImportExcludeRow()

    def get_or_init_instance(self, instance_loader, row):
        try:
            return super().get_or_init_instance(instance_loader, row)
        except CaracteristicaImpresora.DoesNotExist:
            return CaracteristicaImpresora(), True


@admin.register(CaracteristicaImpresora)
class CaracteristicaImpresoraAdmin(ImportExportModelAdmin):
    resource_class = CaracteristicaImpresoraResource
    list_display   = ['g225_dispositivo', 'g225_tipo_impresora', 'g225_funcion']
    list_filter    = ['g225_tipo_impresora']
    search_fields  = ['g225_dispositivo__g212_serial']
    raw_id_fields  = ['g225_dispositivo']


# ══════════════════════════════════════════════════════
# CARACTERÍSTICAS PERIFÉRICO — Resource para carga masiva
# ══════════════════════════════════════════════════════

class CaracteristicaPerifericoResource(resources.ModelResource):

    g226_dispositivo = fields.Field(
        column_name='g226_dispositivo',
        attribute='g226_dispositivo',
        widget=ForeignKeyWidget(Dispositivo, field='g212_serial')
    )

    class Meta:
        model            = CaracteristicaPeriferico
        exclude          = ('g226_id',)
        import_id_fields = ['g226_dispositivo']
        skip_unchanged   = True
        report_skipped   = True
        use_bulk_create  = False

    def before_import_row(self, row, row_number=None, **kwargs):
        if not row.get('g226_dispositivo'):
            from import_export.exceptions import ImportExcludeRow
            raise ImportExcludeRow()

    def get_or_init_instance(self, instance_loader, row):
        try:
            return super().get_or_init_instance(instance_loader, row)
        except CaracteristicaPeriferico.DoesNotExist:
            return CaracteristicaPeriferico(), True


@admin.register(CaracteristicaPeriferico)
class CaracteristicaPerifericoAdmin(ImportExportModelAdmin):
    resource_class = CaracteristicaPerifericoResource
    list_display   = ['g226_dispositivo', 'g226_incluye_base', 'g226_incluye_teclado', 'g226_incluye_mouse', 'g226_incluye_auriculares', 'g226_incluye_cargador']
    search_fields  = ['g226_dispositivo__g212_serial']
    raw_id_fields  = ['g226_dispositivo']


# ══════════════════════════════════════════════════════
# DISPOSITIVO INACTIVO
# ══════════════════════════════════════════════════════

@admin.register(DispositivoInactivo)
class DispositivoInactivoAdmin(admin.ModelAdmin):
    list_display  = ['g213_serial', 'g213_tipo', 'g213_marca', 'g213_propietario', 'g213_estado']
    list_filter   = ['g213_tipo', 'g213_estado']
    search_fields = ['g213_serial']


# ══════════════════════════════════════════════════════
# HISTORIAL DE EQUIPO — formulario con búsqueda por tipo + serial
# ══════════════════════════════════════════════════════

class HistorialEquipoForm(forms.ModelForm):
    """
    Muestra el selector de dispositivo con formato:
    [TIPO] SERIAL — MARCA
    ordenado por tipo y luego serial, para facilitar
    la búsqueda al agregar una novedad.
    """
    class Meta:
        model  = HistorialEquipo
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['g214_dispositivo'].queryset = (
            Dispositivo.objects
            .select_related('g212_tipo', 'g212_marca')
            .order_by('g212_tipo__g200_tipo_dispositivo', 'g212_serial')
        )
        self.fields['g214_dispositivo'].label_from_instance = lambda obj: (
            f"[{obj.g212_tipo}]  {obj.g212_serial}  —  {obj.g212_marca or ''}"
        )


@admin.register(HistorialEquipo)
class HistorialEquipoAdmin(admin.ModelAdmin):
    form           = HistorialEquipoForm
    list_display   = [
        'g214_dispositivo', 'get_tipo_dispositivo',
        'g214_novedad', 'g214_fecha', 'g214_hora',
        'g214_responsable', 'g214_co'
    ]
    list_filter    = [
        'g214_novedad',
        'g214_fecha',
        'g214_dispositivo__g212_tipo',   # filtra por tipo de dispositivo en la barra lateral
        'g214_co',
    ]
    search_fields  = ['g214_dispositivo__g212_serial', 'g214_responsable']
    date_hierarchy = 'g214_fecha'
    ordering       = ['-g214_fecha', '-g214_hora']

    @admin.display(description='Tipo Dispositivo')
    def get_tipo_dispositivo(self, obj):
        return obj.g214_dispositivo.g212_tipo


# ══════════════════════════════════════════════════════
# COLABORADOR
# ══════════════════════════════════════════════════════

class AsignacionInline(admin.TabularInline):
    model = AsignacionColaborador
    extra = 1


class ColaboradorResource(resources.ModelResource):

    g215_co = fields.Field(
        column_name='g215_co',
        attribute='g215_co',
        widget=ForeignKeyWidget(CentroOperaciones, field='pk')
    )
    g215_estado = fields.Field(
        column_name='g215_estado',
        attribute='g215_estado',
        widget=ForeignKeyWidget(Estado, field='pk')
    )

    class Meta:
        model            = Colaborador
        fields           = ('g215_documento', 'g215_nombre', 'g215_cargo', 'g215_co', 'g215_estado')
        import_id_fields = ['g215_documento']
        skip_unchanged   = True
        report_skipped   = True
        use_bulk_create  = False

    def before_import_row(self, row, row_number=None, **kwargs):
        if not row.get('g215_documento'):
            from import_export.exceptions import ImportExcludeRow
            raise ImportExcludeRow()
        if row.get('g215_co') not in (None, ''):
            row['g215_co'] = int(float(str(row['g215_co']).strip()))
        if row.get('g215_estado') not in (None, ''):
            row['g215_estado'] = int(float(str(row['g215_estado']).strip()))

    def get_or_init_instance(self, instance_loader, row):
        try:
            return super().get_or_init_instance(instance_loader, row)
        except Colaborador.DoesNotExist:
            return Colaborador(), True


@admin.register(Colaborador)
class ColaboradorAdmin(ImportExportModelAdmin):
    resource_class = ColaboradorResource
    list_display   = ['g215_documento', 'g215_nombre', 'g215_co', 'g215_cargo', 'g215_estado']
    list_filter    = ['g215_co', 'g215_estado']
    search_fields  = ['g215_nombre', 'g215_documento']
    inlines        = [AsignacionInline]


# ══════════════════════════════════════════════════════
# CENTRO DE COSTO, TIPO IMPRESORA, ACTA
# ══════════════════════════════════════════════════════

@admin.register(CentroCosto)
class CentroCostoAdmin(admin.ModelAdmin):
    list_display  = ['g228_id', 'g228_nombre', 'g228_estado']
    list_editable = ['g228_estado']
    search_fields = ['g228_nombre']

@admin.register(TipoImpresora)
class TipoImpresoraAdmin(admin.ModelAdmin):
    list_display  = ['g229_id', 'g229_tipo_impresora', 'g229_estado']
    list_editable = ['g229_estado']
    search_fields = ['g229_tipo_impresora']

@admin.register(Acta)
class ActaAdmin(admin.ModelAdmin):
    list_display  = ['g217_id', 'g217_colaborador', 'g217_tipo', 'g217_proceso', 'g217_fecha']
    list_filter   = ['g217_tipo', 'g217_proceso']
    search_fields = ['g217_colaborador__g215_nombre']