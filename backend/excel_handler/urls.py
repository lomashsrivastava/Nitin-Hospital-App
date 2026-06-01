"""Excel Handler URL Configuration"""
from django.urls import path
from .views import (
    ExcelPreviewView, ExcelImportView,
    ExportInventoryView, ExportSalesView,
    ExportGSTView, ExportProfitLossView, ExportPatientHistoryView,
)

urlpatterns = [
    path('preview/', ExcelPreviewView.as_view(), name='excel-preview'),
    path('import/', ExcelImportView.as_view(), name='excel-import'),
    path('export/inventory/', ExportInventoryView.as_view(), name='excel-export-inventory'),
    path('export/sales/', ExportSalesView.as_view(), name='excel-export-sales'),
    path('export/gst/', ExportGSTView.as_view(), name='excel-export-gst'),
    path('export/profit-loss/', ExportProfitLossView.as_view(), name='excel-export-profit-loss'),
    path('export/patient-history/<str:patient_id>/', ExportPatientHistoryView.as_view(), name='excel-export-patient-history'),
]
