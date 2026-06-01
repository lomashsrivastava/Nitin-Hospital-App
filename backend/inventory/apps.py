from django.apps import AppConfig

class InventoryConfig(AppConfig):
    default_auto_field = 'django_mongodb_backend.fields.ObjectIdAutoField'
    name = 'inventory'
