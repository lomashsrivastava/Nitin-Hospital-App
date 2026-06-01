"""
Authentication Serializers
"""

from rest_framework import serializers
from django.contrib.auth.models import User
from .models import ActivityLog


class LoginSerializer(serializers.Serializer):
    """Serializer for login credentials"""
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(max_length=128, write_only=True)


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user info"""
    id = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_joined', 'last_login']
        read_only_fields = fields



class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for password change"""
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, min_length=6)


class ActivityLogSerializer(serializers.ModelSerializer):
    """Serializer for activity logs"""
    id = serializers.CharField(read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True, default='System')

    class Meta:
        model = ActivityLog
        fields = ['id', 'user_name', 'action', 'details', 'ip_address', 'timestamp']
        read_only_fields = fields

