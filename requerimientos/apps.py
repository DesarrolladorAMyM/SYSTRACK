from django.apps import AppConfig


class RequerimientosConfig(AppConfig):
    name = 'requerimientos'
    
    def ready(self):
            from . import Signals# noqa: F401 — registra los receivers pre_save/post_save
