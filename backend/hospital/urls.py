from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DepartmentViewSet, DoctorViewSet, StaffViewSet, RoomViewSet, PatientViewSet,
    AppointmentViewSet, LabTestViewSet, PharmacyItemViewSet, BloodStockViewSet,
    AmbulanceVehicleViewSet, AmbulanceDispatchViewSet,
    MasterInvoiceViewSet, ConsultationRecordViewSet, ConsultationPrescriptionViewSet,
    InpatientAdmissionViewSet, SurgeryScheduleViewSet, PayrollViewSet,
    HospitalDashboardStatsView
)

router = DefaultRouter()
router.register(r'departments', DepartmentViewSet)
router.register(r'doctors', DoctorViewSet)
router.register(r'staff', StaffViewSet)
router.register(r'rooms', RoomViewSet)
router.register(r'patients', PatientViewSet)
router.register(r'appointments', AppointmentViewSet)
router.register(r'lab-tests', LabTestViewSet)
router.register(r'pharmacy-items', PharmacyItemViewSet)
router.register(r'blood-stock', BloodStockViewSet)
router.register(r'ambulance-vehicles', AmbulanceVehicleViewSet)
router.register(r'ambulance-dispatch', AmbulanceDispatchViewSet)
router.register(r'invoices', MasterInvoiceViewSet)
router.register(r'consultations', ConsultationRecordViewSet)
router.register(r'prescriptions', ConsultationPrescriptionViewSet)
router.register(r'admissions', InpatientAdmissionViewSet)
router.register(r'surgeries', SurgeryScheduleViewSet)
router.register(r'payroll', PayrollViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard-stats/', HospitalDashboardStatsView.as_view(), name='hospital-dashboard-stats'),
]
