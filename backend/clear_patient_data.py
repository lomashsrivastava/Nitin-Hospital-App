import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nitin_billing.settings')
django.setup()

from hospital.models import (
    Patient, LabTest, AmbulanceDispatch, MasterInvoice, 
    ConsultationRecord, InpatientAdmission, SurgerySchedule, Room,
    Appointment
)
from billing.models import Invoice

def clear_patient_data():
    print("--- Starting Patient Data Cleanup ---")
    
    try:
        # 1. Delete dependent transactional records
        print("Deleting Lab Tests...")
        LabTest.objects.all().delete()
        
        print("Deleting Ambulance Dispatches...")
        AmbulanceDispatch.objects.all().delete()
        
        print("Deleting Inpatient Admissions...")
        InpatientAdmission.objects.all().delete()
        
        print("Deleting Surgery Schedules...")
        SurgerySchedule.objects.all().delete()
        
        print("Deleting Clinical Consultations...")
        ConsultationRecord.objects.all().delete()
        
        print("Deleting Hospital Master Invoices...")
        MasterInvoice.objects.all().delete()
        
        print("Deleting Appointments...")
        Appointment.objects.all().delete()
        
        # 2. Update Pharmacy Invoices (remove links but keep record if needed)
        print("Removing patient links from Pharmacy Invoices...")
        Invoice.objects.all().update(patient=None)
        
        # 3. Delete the Patients themselves
        count = Patient.objects.count()
        Patient.objects.all().delete()
        print(f"Successfully deleted {count} patient records.")
        
        # 4. Reset Room status for any rooms that were occupied by patients
        print("Resetting Room statuses...")
        rooms_reset = Room.objects.filter(occupant_type='P').update(
            current_status='AVAILABLE', 
            occupant_type=None
        )
        print(f"Reset {rooms_reset} rooms to AVAILABLE status.")
        
        print("--- Cleanup Complete ---")
        
    except Exception as e:
        print(f"ERROR during cleanup: {str(e)}")

if __name__ == "__main__":
    clear_patient_data()
