"""Inventory URL Configuration"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MedicineViewSet, SupplierViewSet

router = DefaultRouter()
router.register(r'medicines', MedicineViewSet)
router.register(r'suppliers', SupplierViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
