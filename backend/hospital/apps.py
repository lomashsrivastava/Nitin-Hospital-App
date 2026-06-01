from django.apps import AppConfig


class HospitalConfig(AppConfig):
    name = 'hospital'

    def ready(self):
        # Implicitly connect signal handlers when the app is ready
        import hospital.signals
