from django.db import models

class Department(models.Model):
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name

class Doctor(models.Model):
    name = models.CharField(max_length=200)
    specialization = models.CharField(max_length=200)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, related_name='doctors')
    contact_number = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    opd_timings = models.CharField(max_length=200, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Dr. {self.name} - {self.specialization}"

class Staff(models.Model):
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other')
    ]
    name = models.CharField(max_length=200)
    role = models.CharField(max_length=150)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, default='M')
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, related_name='staff')
    contact_number = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    salary = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    shift_timings = models.CharField(max_length=200, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.role}"

class Room(models.Model):
    ROOM_TYPES = [
        ('NORMAL', 'Normal'),
        ('GENERAL_WARD', 'General Ward'),
        ('EMERGENCY', 'Emergency'),
        ('PRIVATE_WARD', 'Private Ward'),
        ('PRIVATE_ROOM', 'Private Room'),
        ('SEMI_LUXURY', 'Semi Luxury Room'),
        ('LUXURY_SUITE', 'Luxury Suite'),
        ('STAFF_QUARTERS', 'Staff Quarters'),
        ('DOCTOR_HOUSING', 'Doctor Housing'),
        ('NURSE_QUARTERS', 'Nurse Quarters'),
        ('SECURITY_POST', 'Security Post'),
    ]
    STATUS_CHOICES = [
        ('AVAILABLE', 'Available'),
        ('OCCUPIED', 'Occupied'),
        ('CLEANING', 'Cleaning'),
        ('MAINTENANCE', 'Maintenance'),
        ('EMERGENCY', 'Emergency')
    ]
    OCCUPANT_TYPES = [
        ('P', 'Patient'),
        ('D', 'Doctor'),
        ('N', 'Nurse'),
        ('S', 'Staff'),
        ('EM', 'Emergency')
    ]
    room_number = models.CharField(max_length=50, unique=True)
    room_type = models.CharField(max_length=30, choices=ROOM_TYPES, default='NORMAL')
    floor = models.IntegerField(default=1)
    bed_count = models.IntegerField(default=1)
    current_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='AVAILABLE')
    occupant_type = models.CharField(max_length=5, choices=OCCUPANT_TYPES, blank=True, null=True)
    assigned_doctor = models.ForeignKey('Doctor', on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_housing')
    assigned_staff = models.ForeignKey('Staff', on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_housing')
    last_cleaned = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.room_number} ({self.get_room_type_display()})"

class Patient(models.Model):
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other')
    ]
    name = models.CharField(max_length=255)
    age = models.IntegerField()
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, default='M')
    contact_number = models.CharField(max_length=20)
    address = models.TextField(blank=True, default='')
    ailment = models.CharField(max_length=255, blank=True, default='')
    
    assigned_doctor = models.ForeignKey(Doctor, on_delete=models.SET_NULL, null=True, blank=True, related_name='patients')
    assigned_room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True, related_name='patients')
    
    admission_date = models.DateTimeField(auto_now_add=True)
    advance_deposit = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    is_discharged = models.BooleanField(default=False)
    
    def __str__(self):
        return self.name

class Appointment(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('CONFIRMED', 'Confirmed'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled')
    ]
    patient_name = models.CharField(max_length=255)
    contact_number = models.CharField(max_length=20)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='appointments')
    appointment_date = models.DateField()
    appointment_time = models.TimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.patient_name} with {self.doctor.name} on {self.appointment_date}"

class LabTest(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed')
    ]
    CATEGORY_CHOICES = [
        ('PATHOLOGY', 'Pathology (Blood/Urine)'),
        ('RADIOLOGY', 'Radiology (X-Ray/MRI/CT)'),
        ('CARDIOLOGY', 'Cardiology (ECG)'),
        ('OTHER', 'Other')
    ]
    PRIORITY_CHOICES = [
        ('ROUTINE', 'Routine'),
        ('URGENT', 'Urgent'),
        ('STAT', 'STAT (Emergency)')
    ]
    patient = models.ForeignKey(Patient, on_delete=models.SET_NULL, null=True, blank=True, related_name='lab_tests')
    patient_name = models.CharField(max_length=255, blank=True) # Fallback for walk-ins
    test_name = models.CharField(max_length=255)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='PATHOLOGY')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='ROUTINE')
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    referred_by = models.ForeignKey(Doctor, on_delete=models.SET_NULL, null=True, blank=True)
    result = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.test_name} for {self.patient_name}"

class PharmacyItem(models.Model):
    name = models.CharField(max_length=255, unique=True)
    stock_quantity = models.IntegerField(default=0)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    expiry_date = models.DateField(blank=True, null=True)
    manufacturer = models.CharField(max_length=255, blank=True, default='')

    def __str__(self):
        return self.name

class BloodStock(models.Model):
    blood_group = models.CharField(max_length=50, unique=True)
    bags_available = models.IntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.blood_group} - {self.bags_available} Bags"

class AmbulanceVehicle(models.Model):
    STATUS_CHOICES = [
        ('AVAILABLE', 'Available'),
        ('DISPATCHED', 'Dispatched'),
        ('MAINTENANCE', 'Under Maintenance')
    ]
    TYPE_CHOICES = [
        ('BLS', 'Basic Life Support (BLS)'),
        ('ALS', 'Advanced Life Support (ALS / Mobile ICU)'),
        ('PTS', 'Patient Transport Service (PTS)'),
    ]
    vehicle_number = models.CharField(max_length=50, unique=True)
    driver_name = models.CharField(max_length=255)
    contact_number = models.CharField(max_length=20)
    email = models.EmailField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='AVAILABLE')
    vehicle_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='BLS')
    has_o2 = models.BooleanField(default=False)
    has_defibrillator = models.BooleanField(default=False)
    has_ventilator = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.vehicle_number} ({self.driver_name})"

class AmbulanceDispatch(models.Model):
    ambulance = models.ForeignKey(AmbulanceVehicle, on_delete=models.CASCADE, related_name='dispatches')
    patient = models.ForeignKey(Patient, on_delete=models.SET_NULL, null=True, blank=True, related_name='ambulance_dispatches')
    patient_name = models.CharField(max_length=255, blank=True)
    pickup_location = models.TextField()
    drop_location = models.TextField()
    estimated_eta = models.CharField(max_length=50, blank=True, null=True)
    dispatch_time = models.DateTimeField(auto_now_add=True)
    is_completed = models.BooleanField(default=False)

    def __str__(self):
        return f"Dispatch {self.id} - {self.ambulance.vehicle_number}"


# --- ADVANCED MODULES ---

class MasterInvoice(models.Model):
    STATUS_CHOICES = [('DRAFT', 'Draft'), ('UNPAID', 'Unpaid'), ('PARTIAL', 'Partial'), ('PAID', 'Paid')]
    INSURANCE_CHOICES = [('NONE', 'None'), ('PENDING', 'Pending'), ('APPROVED', 'Approved'), ('REJECTED', 'Rejected')]
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='master_invoices')
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    insurance_claim_id = models.CharField(max_length=100, blank=True, null=True)
    insurance_status = models.CharField(max_length=20, choices=INSURANCE_CHOICES, default='NONE')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Invoice for {self.patient.name} - {self.net_amount}"

class InvoiceItem(models.Model):
    invoice = models.ForeignKey(MasterInvoice, on_delete=models.CASCADE, related_name='items')
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    reference_model = models.CharField(max_length=50, blank=True, null=True)
    reference_id = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

class ConsultationRecord(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='consultations')
    doctor = models.ForeignKey(Doctor, on_delete=models.SET_NULL, null=True)
    appointment = models.ForeignKey(Appointment, on_delete=models.SET_NULL, null=True, blank=True)
    symptoms = models.TextField(blank=True)
    diagnosis = models.TextField(blank=True)
    clinical_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class ConsultationPrescription(models.Model):
    consultation = models.ForeignKey(ConsultationRecord, on_delete=models.CASCADE, related_name='prescriptions')
    medicine_name = models.CharField(max_length=255)
    pharmacy_item_id = models.CharField(max_length=100, blank=True, null=True)
    dosage = models.CharField(max_length=100)
    frequency = models.CharField(max_length=100)
    duration = models.CharField(max_length=100)
    is_dispensed = models.BooleanField(default=False)

class InpatientAdmission(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='admissions')
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True)
    admitting_doctor = models.ForeignKey(Doctor, on_delete=models.SET_NULL, null=True)
    admission_time = models.DateTimeField(auto_now_add=True)
    discharge_time = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=[('ADMITTED', 'Admitted'), ('DISCHARGED', 'Discharged'), ('TRANSFERRED', 'Transferred')], default='ADMITTED')

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        if self.room:
            if self.status == 'ADMITTED':
                self.room.current_status = 'OCCUPIED'
                self.room.occupant_type = 'P'
                self.room.save()
            elif self.status == 'DISCHARGED':
                self.room.current_status = 'CLEANING'
                self.room.occupant_type = None
                self.room.save()

    def delete(self, *args, **kwargs):
        if self.room:
            self.room.current_status = 'CLEANING'
            self.room.occupant_type = None
            self.room.save()
        super().delete(*args, **kwargs)

class SurgerySchedule(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='surgeries')
    lead_surgeon = models.ForeignKey(Doctor, on_delete=models.SET_NULL, null=True)
    ot_room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=[('SCHEDULED', 'Scheduled'), ('IN_PROGRESS', 'In Progress'), ('COMPLETED', 'Completed'), ('CANCELLED', 'Cancelled')], default='SCHEDULED')

class SurgeryTeamMember(models.Model):
    surgery = models.ForeignKey(SurgerySchedule, on_delete=models.CASCADE, related_name='team')
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE)
    role_in_surgery = models.CharField(max_length=100)

class Payroll(models.Model):
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name='payrolls')
    basic_salary = models.DecimalField(max_digits=10, decimal_places=2)
    bonus = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    deductions = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    net_salary = models.DecimalField(max_digits=10, decimal_places=2)
    pay_period_start = models.DateField()
    pay_period_end = models.DateField()
    payment_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=[('PENDING', 'Pending'), ('PAID', 'Paid'), ('CANCELLED', 'Cancelled')], default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    
    def save(self, *args, **kwargs):
        self.net_salary = self.basic_salary + self.bonus - self.deductions
        super().save(*args, **kwargs)
