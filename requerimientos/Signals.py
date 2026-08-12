import logging
import datetime
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from .models import Requerimiento, Notificacion

logger = logging.getLogger('requerimientos')

DB = 'requerimientos'
ESTADO_ASIGNADO = 2
ESTADO_CERRADO  = 4


def _crear_notificacion(req, tipo, titulo, mensaje):
    """Inserta la fila en mv_Notificaciones. Nunca debe tumbar el flujo
    principal (guardado del requerimiento / envío de correo) si falla.

    FechaCreacion NO admite NULL en la BD (tiene default getdate()), pero
    Django manda NULL explícito si no se le pasa el valor — hay que
    fijarlo a mano o el INSERT siempre falla.
    """
    try:
        Notificacion.objects.using(DB).create(
            CedulaUsuario = req.CedulaUsuario,
            Tipo          = tipo,
            Codigo        = req.Codigo,
            Titulo        = titulo,
            Mensaje       = mensaje,
            FechaCreacion = datetime.datetime.now(),
        )
    except Exception:
        logger.exception(
            "No se pudo crear la notificación '%s' para el requerimiento %s",
            tipo, req.codigo()
        )


@receiver(pre_save, sender=Requerimiento)
def _guardar_estado_anterior(sender, instance, **kwargs):
    """Antes de guardar, recuerda cuál era el IdEstado y el IdUsuarioAsig
    en BD (si ya existía)."""
    if not instance.pk:
        instance._estado_anterior = None
        instance._usuario_asig_anterior = None
        return
    anterior = (
        Requerimiento.objects
        .using(DB)
        .filter(pk=instance.pk)
        .values('IdEstado', 'IdUsuarioAsig')
        .first()
    )
    instance._estado_anterior       = anterior['IdEstado'] if anterior else None
    instance._usuario_asig_anterior = anterior['IdUsuarioAsig'] if anterior else None


@receiver(post_save, sender=Requerimiento)
def _notificar_solucion(sender, instance, created, **kwargs):
    """Si el requerimiento acaba de pasar a estado 4 (Cerrado), envía el correo
    de solución y deja la notificación en el portal. No dispara si ya nació
    en estado 4, ni si ya estaba en 4 antes."""
    if created:
        return

    estado_anterior = getattr(instance, '_estado_anterior', None)
    if instance.IdEstado == ESTADO_CERRADO and estado_anterior != ESTADO_CERRADO:
        from .views import _enviar_correo_solucion  # import local: evita ciclo de imports
        logger.info(
            "Requerimiento %s pasó a Cerrado (antes: %s). Enviando correo de solución.",
            instance.codigo(), estado_anterior
        )
        _enviar_correo_solucion(instance)
        _crear_notificacion(
            instance, 'solucionado',
            f'{instance.codigo()} fue solucionado',
            'Ya está resuelto. Por favor califica la atención recibida.'
        )


@receiver(post_save, sender=Requerimiento)
def _notificar_asignacion(sender, instance, created, **kwargs):
    """Notifica por correo al técnico cada vez que IdUsuarioAsig cambia a un
    valor nuevo (asignación inicial o reasignación a otra persona). Se basa
    en el cambio del técnico, no del estado — así también cubre el caso de
    reasignar un requerimiento que ya estaba en estado Asignado (2 → 2) a
    otra persona distinta. Además, avisa al SOLICITANTE en el portal de que
    su requerimiento ya tiene alguien trabajándolo."""
    if created:
        return

    usuario_anterior = getattr(instance, '_usuario_asig_anterior', None)
    usuario_nuevo     = instance.IdUsuarioAsig

    if usuario_nuevo and usuario_nuevo != usuario_anterior:
        from .views import _enviar_correo_asignacion  # import local: evita ciclo de imports
        es_reasignacion = usuario_anterior is not None
        logger.info(
            "Requerimiento %s %s a IdUsuarioAsig=%s (antes: %s). Enviando correo.",
            instance.codigo(), 'reasignado' if es_reasignacion else 'asignado',
            usuario_nuevo, usuario_anterior
        )
        _enviar_correo_asignacion(instance, es_reasignacion=es_reasignacion)
        if not es_reasignacion:
            _crear_notificacion(
                instance, 'asignado',
                f'{instance.codigo()} tiene técnico asignado',
                f'{instance.NombreUsuariAsig or "Un técnico"} está trabajando en tu requerimiento.'
            )