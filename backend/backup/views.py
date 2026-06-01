"""
Backup Views - Create, list, and restore database backups
Supports SQLite (file copy) and PostgreSQL (pg_dump/pg_restore)
"""

import os
import shutil
import json
from datetime import datetime
from pathlib import Path

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser
from django.conf import settings
from django.http import FileResponse

from authentication.views import log_activity


def get_backup_dir():
    """Get or create backup directory"""
    backup_dir = getattr(settings, 'BACKUP_DIR', settings.BASE_DIR / 'backups')
    os.makedirs(backup_dir, exist_ok=True)
    return backup_dir


class CreateBackupView(APIView):
    """Create a database backup"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        backup_dir = get_backup_dir()
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        db_engine = settings.DATABASES['default']['ENGINE']
        
        if 'sqlite3' in db_engine:
            # SQLite backup - simple file copy
            db_path = settings.DATABASES['default']['NAME']
            backup_name = f'backup_{timestamp}.sqlite3'
            backup_path = os.path.join(backup_dir, backup_name)
            
            try:
                shutil.copy2(db_path, backup_path)
                file_size = os.path.getsize(backup_path)
                
                # Save backup metadata
                meta = {
                    'name': backup_name,
                    'timestamp': timestamp,
                    'engine': 'sqlite3',
                    'size': file_size,
                    'created_by': request.user.username,
                }
                meta_path = os.path.join(backup_dir, f'backup_{timestamp}.json')
                with open(meta_path, 'w') as f:
                    json.dump(meta, f, indent=2)

                log_activity(request.user, 'BACKUP_CREATE', f'Created backup: {backup_name}', request)
                
                return Response({
                    'message': 'Backup created successfully',
                    'backup': meta,
                })
            except Exception as e:
                return Response({'error': f'Backup failed: {str(e)}'}, status=500)
        
        elif 'postgresql' in db_engine:
            # PostgreSQL backup using pg_dump
            backup_name = f'backup_{timestamp}.sql'
            backup_path = os.path.join(backup_dir, backup_name)
            
            db_settings = settings.DATABASES['default']
            cmd = (
                f'PGPASSWORD="{db_settings["PASSWORD"]}" pg_dump '
                f'-h {db_settings["HOST"]} '
                f'-p {db_settings["PORT"]} '
                f'-U {db_settings["USER"]} '
                f'-d {db_settings["NAME"]} '
                f'-f "{backup_path}"'
            )
            
            exit_code = os.system(cmd)
            if exit_code == 0:
                file_size = os.path.getsize(backup_path)
                meta = {
                    'name': backup_name,
                    'timestamp': timestamp,
                    'engine': 'postgresql',
                    'size': file_size,
                    'created_by': request.user.username,
                }
                meta_path = os.path.join(backup_dir, f'backup_{timestamp}.json')
                with open(meta_path, 'w') as f:
                    json.dump(meta, f, indent=2)
                
                log_activity(request.user, 'BACKUP_CREATE', f'Created backup: {backup_name}', request)
                return Response({'message': 'Backup created successfully', 'backup': meta})
            else:
                return Response({'error': 'pg_dump failed'}, status=500)

        return Response({'error': 'Unsupported database engine'}, status=400)


class ListBackupsView(APIView):
    """List all available backups"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        backup_dir = get_backup_dir()
        backups = []
        
        for f in sorted(os.listdir(backup_dir), reverse=True):
            if f.endswith('.json'):
                try:
                    meta_path = os.path.join(backup_dir, f)
                    with open(meta_path, 'r') as mf:
                        meta = json.load(mf)
                    backups.append(meta)
                except Exception:
                    continue
        
        return Response({'backups': backups})


class RestoreBackupView(APIView):
    """Restore database from a backup"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        backup_name = request.data.get('backup_name')
        if not backup_name:
            return Response({'error': 'backup_name is required'}, status=400)
        
        backup_dir = get_backup_dir()
        backup_path = os.path.join(backup_dir, backup_name)
        
        if not os.path.exists(backup_path):
            return Response({'error': 'Backup file not found'}, status=404)

        db_engine = settings.DATABASES['default']['ENGINE']
        
        if 'sqlite3' in db_engine:
            db_path = settings.DATABASES['default']['NAME']
            try:
                # Create a safety backup first
                safety_backup = os.path.join(backup_dir, f'pre_restore_{datetime.now().strftime("%Y%m%d_%H%M%S")}.sqlite3')
                shutil.copy2(db_path, safety_backup)
                
                # Restore
                shutil.copy2(backup_path, db_path)
                
                log_activity(request.user, 'BACKUP_RESTORE', f'Restored from: {backup_name}', request)
                return Response({'message': 'Database restored successfully. Please restart the server.'})
            except Exception as e:
                return Response({'error': f'Restore failed: {str(e)}'}, status=500)

        return Response({'error': 'Unsupported database engine for restore'}, status=400)


class DownloadBackupView(APIView):
    """Download a backup file"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        backup_name = request.query_params.get('name')
        if not backup_name:
            return Response({'error': 'name parameter required'}, status=400)
        
        backup_dir = get_backup_dir()
        backup_path = os.path.join(backup_dir, backup_name)
        
        if not os.path.exists(backup_path):
            return Response({'error': 'Backup not found'}, status=404)
        
        return FileResponse(open(backup_path, 'rb'), as_attachment=True, filename=backup_name)
