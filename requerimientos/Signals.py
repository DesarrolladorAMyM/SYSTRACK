import logging
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from .models import Requerimiento

logger = logging.getLogger('requerimientos')

DB = 'requerimientos'
ESTADO_ASIGNADO = 2
ESTADO_CERRADO  = 4


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
    de solución. No dispara si ya nació en estado 4, ni si ya estaba en 4 antes."""
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


@receiver(post_save, sender=Requerimiento)
def _notificar_asignacion(sender, instance, created, **kwargs):
    """Notifica por correo al técnico cada vez que IdUsuarioAsig cambia a un
    valor nuevo (asignación inicial o reasignación a otra persona). Se basa
    en el cambio del técnico, no del estado — así también cubre el caso de
    reasignar un requerimiento que ya estaba en estado Asignado (2 → 2) a
    otra persona distinta."""
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