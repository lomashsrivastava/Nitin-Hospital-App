"""
Excel Handler Views - Upload, preview, import, and export
"""

import pandas as pd
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser
from django.http import HttpResponse
from datetime import datetime

from .importers import auto_map_columns, validate_and_import
from .exporters import export_inventory, export_sales, export_gst_report, export_profit_loss, export_full_patient_data
from authentication.views import log_activity


class ExcelPreviewView(APIView):
    """Upload and preview Excel/CSV before importing"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file uploaded'}, status=400)

        filename = file.name.lower()
        try:
            if filename.endswith('.csv'):
                df = pd.read_csv(file)
            elif filename.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(file)
            else:
                return Response({'error': 'Unsupported file format. Use .xlsx, .xls, or .csv'}, status=400)
        except Exception as e:
            return Response({'error': f'Failed to read file: {str(e)}'}, status=400)

        # Auto-detect column mappings
        column_mapping = auto_map_columns(df.columns)
        
        # Preview first 20 rows
        preview_data = df.head(20).fillna('').to_dict(orient='records')
        
        return Response({
            'columns': list(df.columns),
            'column_mapping': column_mapping,
            'row_count': len(df),
            'preview': preview_data,
        })


class ExcelImportView(APIView):
    """Import Excel/CSV data into inventory"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file uploaded'}, status=400)

        # Get custom column mapping from request (or auto-detect)
        custom_mapping = request.data.get('column_mapping')
        update_existing = request.data.get('update_existing', 'true').lower() == 'true'

        filename = file.name.lower()
        try:
            if filename.endswith('.csv'):
                df = pd.read_csv(file)
            elif filename.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(file)
            else:
                return Response({'error': 'Unsupported format'}, status=400)
        except Exception as e:
            return Response({'error': f'Failed to read file: {str(e)}'}, status=400)

        # Use custom mapping or auto-detect
        if custom_mapping and isinstance(custom_mapping, dict):
            column_mapping = custom_mapping
        else:
            column_mapping = auto_map_columns(df.columns)

        if 'name' not in column_mapping:
            return Response({
                'error': 'Could not detect medicine name column. Please provide column mapping.',
                'detected_columns': list(df.columns),
            }, status=400)

        # Run import
        result = validate_and_import(df, column_mapping, update_existing)
        
        log_activity(
            request.user, 'IMPORT_EXCEL',
            f'Imported {result["success_count"]} items from {file.name}',
            request
        )

        return Response(result)


class ExportInventoryView(APIView):
    """Export inventory to Excel"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        buffer = export_inventory()
        
        response = HttpResponse(
            buffer,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="Inventory_{datetime.now().strftime("%Y%m%d")}.xlsx"'
        
        log_activity(request.user, 'EXPORT_DATA', 'Exported inventory to Excel', request)
        return response


class ExportSalesView(APIView):
    """Export sales report to Excel"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        days = int(request.query_params.get('days', 30))
        buffer = export_sales(days=days)
        
        response = HttpResponse(
            buffer,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="Sales_Report_{datetime.now().strftime("%Y%m%d")}.xlsx"'
        
        log_activity(request.user, 'EXPORT_DATA', 'Exported sales report', request)
        return response


class ExportGSTView(APIView):
    """Export GST report to Excel"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        days = int(request.query_params.get('days', 30))
        buffer = export_gst_report(days=days)
        
        response = HttpResponse(
            buffer,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="GST_Report_{datetime.now().strftime("%Y%m%d")}.xlsx"'
        
        log_activity(request.user, 'EXPORT_DATA', 'Exported GST report', request)
        return response


class ExportProfitLossView(APIView):
    """Export profit/loss report to Excel"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        days = int(request.query_params.get('days', 30))
        buffer = export_profit_loss(days=days)
        
        response = HttpResponse(
            buffer,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="ProfitLoss_{datetime.now().strftime("%Y%m%d")}.xlsx"'
        
        log_activity(request.user, 'EXPORT_DATA', 'Exported profit/loss report', request)
        return response

class ExportPatientHistoryView(APIView):
    """Export complete patient history to Excel"""
    permission_classes = [IsAuthenticated]

    def get(self, request, patient_id):
        buffer = export_full_patient_data(patient_id)
        
        from hospital.models import Patient
        patient = Patient.objects.get(id=patient_id)
        
        response = HttpResponse(
            buffer,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        safe_name = "".join([c for c in patient.name if c.isalnum() or c in (' ', '.', '-')]).strip()
        response['Content-Disposition'] = f'attachment; filename="History_{safe_name}_{datetime.now().strftime("%Y%m%d")}.xlsx"'
        
        log_activity(request.user, 'EXPORT_DATA', f'Exported history for patient {patient.name}', request)
        return response
