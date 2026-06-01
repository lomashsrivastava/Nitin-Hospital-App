from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import (
    Patient, Appointment, ConsultationRecord, ConsultationPrescription,
    PharmacyItem, MasterInvoice, InvoiceItem, LabTest, InpatientAdmission, Room
)

@receiver(post_save, sender=Patient)
def create_patient_default_invoice(sender, instance, created, **kwargs):
    """Ensure every patient has at least a draft master invoice for tracking."""
    if created:
        MasterInvoice.objects.create(patient=instance, status='DRAFT', total_amount=0)

@receiver(post_save, sender=Appointment)
def trigger_appointment_billing(sender, instance, created, **kwargs):
    if created and instance.doctor:
        # Get or create the master invoice for this patient
        # Note: appointment patient_name is a string in the current schema. 
        # In a real integration, Appointment should FK to Patient, but if not, 
        # we will attach it if we find the matching patient name.
        patient = Patient.objects.filter(name=instance.patient_name, contact_number=instance.contact_number).first()
        if patient:
            invoice, _ = MasterInvoice.objects.get_or_create(patient=patient, status='DRAFT')
            InvoiceItem.objects.create(
                invoice=invoice,
                description=f"Consultation Fee - Dr. {instance.doctor.name}",
                amount=instance.doctor.consultation_fee,
                reference_model='APPOINTMENT',
                reference_id=str(instance.id)
            )

@receiver(post_save, sender=LabTest)
def trigger_labtest_billing(sender, instance, created, **kwargs):
    if created and instance.cost > 0:
        # Match patient
        patient = Patient.objects.filter(name=instance.patient_name).first()
        if patient:
            invoice, _ = MasterInvoice.objects.get_or_create(patient=patient, status='DRAFT')
            InvoiceItem.objects.create(
                invoice=invoice,
                description=f"Lab Test - {instance.test_name}",
                amount=instance.cost,
                reference_model='LABTEST',
                reference_id=str(instance.id)
            )

@receiver(post_save, sender=InpatientAdmission)
def handle_patient_admission(sender, instance, created, **kwargs):
    if created and instance.room:
        # Mark room as occupied by Patient
        Room.objects.filter(id=instance.room.id).update(current_status='OCCUPIED', occupant_type='P')
    elif not created and instance.status == 'DISCHARGED' and instance.room:
        # Mark for cleaning
        Room.objects.filter(id=instance.room.id).update(current_status='CLEANING', occupant_type=None)
        # Note: A real system would calculate days * daily_rate here and add to Billing.

@receiver(post_save, sender=ConsultationPrescription)
def handle_pharmacy_dispensation(sender, instance, **kwargs):
    # Standard medicine deduction if dispensed
    if instance.is_dispensed and instance.pharmacy_item_id:
        try:
            from bson import ObjectId
            pharmacy_item = PharmacyItem.objects.get(id=ObjectId(instance.pharmacy_item_id))
            # Optional inventory deduction logic
            # pharmacy_item.stock_quantity -= 1
            # pharmacy_item.save()
            
            # Post to billing
            invoice, _ = MasterInvoice.objects.get_or_create(patient=instance.consultation.patient, status='DRAFT')
            
            # Prevent duplicate item charge by checking
            if not InvoiceItem.objects.filter(invoice=invoice, reference_model='PRESCRIPTION', reference_id=str(instance.id)).exists():
                InvoiceItem.objects.create(
                    invoice=invoice,
                    description=f"Pharmacy - {instance.medicine_name}",
                    amount=pharmacy_item.price,
                    reference_model='PRESCRIPTION',
                    reference_id=str(instance.id)
                )
        except Exception as e:
            print("Error handling pharmacy billing:", e)

