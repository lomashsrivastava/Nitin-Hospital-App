"""
Authentication Views - JWT login, logout, token refresh, password change, activity logs
"""

from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from django.contrib.auth import authenticate
from .serializers import LoginSerializer, UserSerializer, ChangePasswordSerializer, ActivityLogSerializer
from .models import ActivityLog


def log_activity(user, action, details='', request=None):
    """Helper to create activity log entries"""
    ip = None
    if request:
        ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR'))
        if ip and ',' in ip:
            ip = ip.split(',')[0].strip()
    ActivityLog.objects.create(user=user, action=action, details=details, ip_address=ip)


class LoginView(APIView):
    """Authenticate user and return JWT tokens"""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = authenticate(
            username=serializer.validated_data['username'],
            password=serializer.validated_data['password']
        )

        if user is None:
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            return Response(
                {'error': 'Account is disabled'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        # Log the login
        log_activity(user, 'LOGIN', 'User logged in successfully', request)

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        })


class LogoutView(APIView):
    """Blacklist the refresh token on logout"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            log_activity(request.user, 'LOGOUT', 'User logged out', request)
            return Response({'message': 'Logged out successfully'})
        except Exception:
            return Response({'message': 'Logged out'})


class UserProfileView(APIView):
    """Get current user profile"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class ChangePasswordView(APIView):
    """Change user password"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'error': 'Old password is incorrect'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(serializer.validated_data['new_password'])
        user.save()
        log_activity(user, 'PASSWORD_CHANGE', 'Password changed successfully', request)
        return Response({'message': 'Password changed successfully'})


class ActivityLogListView(generics.ListAPIView):
    """List all activity logs (most recent first)"""
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = ActivityLog.objects.all()
        # Optional filters
        action = self.request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action)
        return queryset[:200]  # Limit to last 200 entries
