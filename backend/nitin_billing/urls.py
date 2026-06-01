"""
Nitin Billing App - Root URL Configuration
All API routes are prefixed with /api/
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('authentication.urls')),
    path('api/inventory/', include('inventory.urls')),
    path('api/billing/', include('billing.urls')),
    path('api/purchases/', include('purchases.urls')),
    path('api/reports/', include('reports.urls')),
    path('api/excel/', include('excel_handler.urls')),
    path('api/backup/', include('backup.urls')),
    path('api/hospital/', include('hospital.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
