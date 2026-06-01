"""
Authentication Models - Activity logging for security audit trail
"""

from django.db import models
from django.contrib.auth.models import User


class ActivityLog(models.Model):
    """Tracks all user actions for security and audit purposes"""
    ACTION_CHOICES = [
        ('LOGIN', 'User Login'),
        ('LOGOUT', 'User Logout'),
        ('CREATE_INVOICE', 'Created Invoice'),
        ('CREATE_PURCHASE', 'Created Purchase'),
        ('ADD_MEDICINE', 'Added Medicine'),
        ('UPDATE_MEDICINE', 'Updated Medicine'),
        ('DELETE_MEDICINE', 'Deleted Medicine'),
        ('IMPORT_EXCEL', 'Imported Excel'),
        ('EXPORT_DATA', 'Exported Data'),
        ('BACKUP_CREATE', 'Created Backup'),
        ('BACKUP_RESTORE', 'Restored Backup'),
        ('SETTINGS_CHANGE', 'Changed Settings'),
        ('PASSWORD_CHANGE', 'Changed Password'),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    details = models.TextField(blank=True, default='')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Activity Log'
        verbose_name_plural = 'Activity Logs'

    def __str__(self):
        return f"{self.user} - {self.action} at {self.timestamp}"
