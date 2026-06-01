"""Reports URL Configuration"""
from django.urls import path
from .views import (
    DailySalesReportView, MonthlySalesReportView,
    ProfitLossReportView, GSTReportView,
    TopProductsReportView, ExpiryReportView,
)

urlpatterns = [
    path('daily-sales/', DailySalesReportView.as_view(), name='report-daily-sales'),
    path('monthly-sales/', MonthlySalesReportView.as_view(), name='report-monthly-sales'),
    path('profit-loss/', ProfitLossReportView.as_view(), name='report-profit-loss'),
    path('gst/', GSTReportView.as_view(), name='report-gst'),
    path('top-products/', TopProductsReportView.as_view(), name='report-top-products'),
    path('expiry/', ExpiryReportView.as_view(), name='report-expiry'),
]
