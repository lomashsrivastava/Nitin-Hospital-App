"""WSGI config for nitin_billing project."""
import os
from django.core.wsgi import get_wsgi_application
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nitin_billing.settings')
application = get_wsgi_application()
