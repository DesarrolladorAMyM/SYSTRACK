class RequerimientosRouter:
    """
    Todo lo de la app 'requerimientos' va a la BD 'requerimientos'.
    El resto sigue en 'default' (inventario).
    """
    APP = 'requerimientos'
    DB  = 'requerimientos'

    def db_for_read(self, model, **hints):
        if model._meta.app_label == self.APP:
            return self.DB
        return None

    def db_for_write(self, model, **hints):
        if model._meta.app_label == self.APP:
            return self.DB
        return None

    def allow_relation(self, obj1, obj2, **hints):
        if obj1._meta.app_label == self.APP or obj2._meta.app_label == self.APP:
            return True
        return None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        # Como todos son managed=False, esto nunca se ejecuta realmente
        if app_label == self.APP:
            return db == self.DB
        return db == 'default'
