"""Backup URL Configuration"""
from django.urls import path
from .views import CreateBackupView, ListBackupsView, RestoreBackupView, DownloadBackupView

urlpatterns = [
    path('create/', CreateBackupView.as_view(), name='backup-create'),
    path('list/', ListBackupsView.as_view(), name='backup-list'),
    path('restore/', RestoreBackupView.as_view(), name='backup-restore'),
    path('download/', DownloadBackupView.as_view(), name='backup-download'),
]
