from django.apps import AppConfig

class ExcelHandlerConfig(AppConfig):
    default_auto_field = 'django_mongodb_backend.fields.ObjectIdAutoField'
    name = 'excel_handler'
