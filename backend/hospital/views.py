from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import (
    Department, Doctor, Staff, Room, Patient,
    Appointment, LabTest, PharmacyItem, BloodStock,
    AmbulanceVehicle, AmbulanceDispatch, MasterInvoice,
    ConsultationRecord, ConsultationPrescription, InpatientAdmission,
    SurgerySchedule, SurgeryTeamMember, Payroll
)
from .serializers import (
    DepartmentSerializer, DoctorSerializer, StaffSerializer, RoomSerializer, PatientSerializer,
    AppointmentSerializer, LabTestSerializer, PharmacyItemSerializer, BloodStockSerializer,
    AmbulanceVehicleSerializer, AmbulanceDispatchSerializer, MasterInvoiceSerializer,
    ConsultationRecordSerializer, ConsultationPrescriptionSerializer, InpatientAdmissionSerializer,
    SurgeryScheduleSerializer, SurgeryTeamMemberSerializer, PayrollSerializer
)

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all().order_by('name')
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]

class DoctorViewSet(viewsets.ModelViewSet):
    queryset = Doctor.objects.all().select_related('department').order_by('name')
    serializer_class = DoctorSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        department_id = self.request.query_params.get('department', None)
        if department_id is not None:
            queryset = queryset.filter(department_id=department_id)
        
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(name__icontains=search) | queryset.filter(specialization__icontains=search)
            
        return queryset

class StaffViewSet(viewsets.ModelViewSet):
    queryset = Staff.objects.all().select_related('department').order_by('name')
    serializer_class = StaffSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        department_id = self.request.query_params.get('department', None)
        if department_id is not None:
            queryset = queryset.filter(department_id=department_id)
        
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(name__icontains=search) | queryset.filter(role__icontains=search)
            
        return queryset

class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all().select_related('assigned_doctor', 'assigned_staff').order_by('floor', 'room_number')
    serializer_class = RoomSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        room_type = self.request.query_params.get('type', None)
        unoccupied = self.request.query_params.get('unoccupied', None)
        
        if room_type:
            queryset = queryset.filter(room_type=room_type)
        if unoccupied == 'true':
            queryset = queryset.filter(current_status='AVAILABLE')
            
        return queryset

class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all().select_related('assigned_doctor', 'assigned_room').order_by('-admission_date')
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(name__icontains=search) | queryset.filter(contact_number__icontains=search) | queryset.filter(ailment__icontains=search)
        return queryset

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def portal_login(self, request):
        patient_id = request.data.get('patient_id', '').strip()
        if not patient_id:
            return Response({'error': 'Patient ID required'}, status=400)
            
        parts = patient_id.split('-')
        unique_suffix = parts[-1] if len(parts) > 0 else patient_id
        
        target_patient = None
        from .models import Patient
        patients = Patient.objects.all()
        
        for p in patients:
            name_parts = (p.name or '').strip().split()
            initials = 'XX'
            if len(name_parts) > 0:
                initials = name_parts[0][0].upper()
                initials += name_parts[-1][0].upper() if len(name_parts) > 1 else name_parts[0][0].upper()
                
            date_val = p.admission_date
            date_code = '0000'
            if date_val:
                date_code = f"{str(date_val.day).zfill(2)}{str(date_val.month).zfill(2)}"
                
            doc_name = p.assigned_doctor.name if p.assigned_doctor else 'Dr. Pankaj Dubey'
            if not doc_name.lower().startswith('dr'):
                doc_name = 'Dr. ' + doc_name
            doc_initials = "".join([part[0].upper() for part in doc_name.split() if part])
            
            phone = "".join([c for c in (p.contact_number or '') if c.isdigit()])
            short_phone = phone[-4:] if len(phone) >= 4 else phone.zfill(4)
            
            unique_code = str(p.id)
            if len(unique_code) > 8:
                unique_code = unique_code[-4:]
                
            calc_id = f"{initials}-{date_code}-NH-{doc_initials}-{short_phone}-{unique_code}"
            if calc_id.lower() == patient_id.lower():
                target_patient = p
                break
                
        if not target_patient:
            target_patient = Patient.objects.filter(id__endswith=unique_suffix).first()
            
        if not target_patient:
            return Response({'error': 'Invalid Patient ID. Check and try again.'}, status=404)
            
        history_data = {
            'patient': PatientSerializer(target_patient).data,
            'consultations': ConsultationRecordSerializer(target_patient.consultations.all().order_by('-created_at'), many=True).data,
            'admissions': InpatientAdmissionSerializer(target_patient.admissions.all().order_by('-admission_time'), many=True).data,
            'invoices': MasterInvoiceSerializer(target_patient.master_invoices.all().order_by('-created_at'), many=True).data,
            'surgeries': SurgeryScheduleSerializer(target_patient.surgeries.all().order_by('-start_time'), many=True).data
        }
        return Response(history_data)

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        patient = self.get_object()
        
        # Aggregate all relevant data
        history_data = {
            'consultations': ConsultationRecordSerializer(patient.consultations.all().order_by('-created_at'), many=True).data,
            'admissions': InpatientAdmissionSerializer(patient.admissions.all().order_by('-admission_time'), many=True).data,
            'invoices': MasterInvoiceSerializer(patient.master_invoices.all().order_by('-created_at'), many=True).data,
            'surgeries': SurgeryScheduleSerializer(patient.surgeries.all().order_by('-start_time'), many=True).data
        }
        return Response(history_data)

    @action(detail=True, methods=['delete'])
    def purge(self, request, pk=None):
        patient = self.get_object()
        # Cascading deletes should handle relations in most cases, 
        # but we iterate to be extra sure for MongoDB/Djongo contexts if needed.
        patient.delete() 
        return Response({'status': 'Patient and all clinical history purged permanently'})

    @action(detail=True, methods=['get'])
    def prescriptions(self, request, pk=None):
        """Get undispensed prescriptions for this patient"""
        patient = self.get_object()
        prescs = ConsultationPrescription.objects.filter(
            consultation__patient=patient,
            is_dispensed=False
        ).select_related('consultation', 'consultation__doctor').order_by('-consultation__created_at')
        return Response(ConsultationPrescriptionSerializer(prescs, many=True).data)

class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.all().select_related('doctor').order_by('-appointment_date', '-appointment_time')
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated]

class LabTestViewSet(viewsets.ModelViewSet):
    queryset = LabTest.objects.all().select_related('referred_by').order_by('-created_at')
    serializer_class = LabTestSerializer
    permission_classes = [IsAuthenticated]

class PharmacyItemViewSet(viewsets.ModelViewSet):
    queryset = PharmacyItem.objects.all().order_by('name')
    serializer_class = PharmacyItemSerializer
    permission_classes = [IsAuthenticated]

class BloodStockViewSet(viewsets.ModelViewSet):
    queryset = BloodStock.objects.all().order_by('blood_group')
    serializer_class = BloodStockSerializer
    permission_classes = [IsAuthenticated]

class AmbulanceVehicleViewSet(viewsets.ModelViewSet):
    queryset = AmbulanceVehicle.objects.all().order_by('vehicle_number')
    serializer_class = AmbulanceVehicleSerializer
    permission_classes = [IsAuthenticated]

class AmbulanceDispatchViewSet(viewsets.ModelViewSet):
    queryset = AmbulanceDispatch.objects.all().select_related('ambulance').order_by('-dispatch_time')
    serializer_class = AmbulanceDispatchSerializer
    permission_classes = [IsAuthenticated]

class MasterInvoiceViewSet(viewsets.ModelViewSet):
    queryset = MasterInvoice.objects.all().select_related('patient').order_by('-created_at')
    serializer_class = MasterInvoiceSerializer
    permission_classes = [IsAuthenticated]

class ConsultationRecordViewSet(viewsets.ModelViewSet):
    queryset = ConsultationRecord.objects.all().select_related('patient', 'doctor').order_by('-created_at')
    serializer_class = ConsultationRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        patient_id = self.request.query_params.get('patient', None)
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        return queryset

class ConsultationPrescriptionViewSet(viewsets.ModelViewSet):
    queryset = ConsultationPrescription.objects.all().order_by('id')
    serializer_class = ConsultationPrescriptionSerializer
    permission_classes = [IsAuthenticated]

class InpatientAdmissionViewSet(viewsets.ModelViewSet):
    queryset = InpatientAdmission.objects.all().select_related('patient', 'room', 'admitting_doctor').order_by('-admission_time')
    serializer_class = InpatientAdmissionSerializer
    permission_classes = [IsAuthenticated]

from .models import SurgerySchedule
from .serializers import SurgeryScheduleSerializer

class SurgeryScheduleViewSet(viewsets.ModelViewSet):
    queryset = SurgerySchedule.objects.all().select_related('patient', 'lead_surgeon', 'ot_room').prefetch_related('team').order_by('-start_time')
    serializer_class = SurgeryScheduleSerializer
    permission_classes = [IsAuthenticated]

from .models import Payroll
from .serializers import PayrollSerializer

class PayrollViewSet(viewsets.ModelViewSet):
    queryset = Payroll.objects.all().select_related('staff').order_by('-created_at')
    serializer_class = PayrollSerializer
    permission_classes = [IsAuthenticated]

from rest_framework.views import APIView
from django.utils import timezone
from django.db.models import Sum

class HospitalDashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        stats = {
            'active_patients': Patient.objects.filter(is_discharged=False).count(),
            'today_admissions': Patient.objects.filter(admission_date__gte=today_start).count(),
            'total_doctors': Doctor.objects.count(),
            'total_staff': Staff.objects.count(),
            'available_rooms': Room.objects.filter(current_status='AVAILABLE').count(),
            'occupied_rooms': Room.objects.filter(current_status='OCCUPIED').count(),
            'pending_appointments': Appointment.objects.filter(appointment_date__gte=now.date(), status__in=['PENDING', 'CONFIRMED']).count(),
            'active_dispatches': AmbulanceDispatch.objects.filter(is_completed=False).count(),
            'upcoming_surgeries': SurgerySchedule.objects.filter(start_time__gte=now, status='SCHEDULED').count(),
            'pending_lab_tests': LabTest.objects.filter(status='PENDING').count(),
            'pending_prescriptions': ConsultationPrescription.objects.filter(is_dispensed=False).count(),
            'total_blood_bags': BloodStock.objects.aggregate(total=Sum('bags_available'))['total'] or 0,
        }
        return Response(stats)

