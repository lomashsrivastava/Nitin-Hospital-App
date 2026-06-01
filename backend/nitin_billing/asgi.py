"""ASGI config for nitin_billing project."""
import os
from django.core.asgi import get_asgi_application
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nitin_billing.settings')
application = get_asgi_application()
