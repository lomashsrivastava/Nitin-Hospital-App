from rest_framework import serializers
from bson import ObjectId
from .models import (
    Department, Doctor, Staff, Room, Patient,
    Appointment, LabTest, PharmacyItem, BloodStock,
    AmbulanceVehicle, AmbulanceDispatch
)


def to_object_id(value):
    """Safely convert a value to ObjectId, return None if invalid."""
    if value is None:
        return None
    if isinstance(value, ObjectId):
        return value
    try:
        return ObjectId(str(value))
    except Exception:
        return None


# ─── Custom FK field ──────────────────────────────────────────────────────────
class ObjectIdField(serializers.CharField):
    """
    Handles FK / PK fields backed by MongoDB ObjectId.
    - to_representation: always returns a plain string
    - to_internal_value: returns the raw string (validators on the serializer
      convert it to ObjectId where needed)
    """
    def to_representation(self, value):
        if value is None:
            return None
        if isinstance(value, ObjectId):
            return str(value)
        if hasattr(value, 'pk'):          # model instance
            return str(value.pk)
        return str(value)

    def to_internal_value(self, data):
        if not data:
            return None
        return str(data)

class ObjectIdRelatedField(serializers.PrimaryKeyRelatedField):
    """
    Ensures that the related object's PK (often an ObjectId)
    is serialized as a string to avoid JSON serialization errors.
    """
    def to_representation(self, value):
        return str(super().to_representation(value))


# ─── Helpers ──────────────────────────────────────────────────────────────────
def _get_dept(value):
    """Look up a Department by its ObjectId string and return its instance."""
    oid = to_object_id(value)
    if oid is None:
        raise serializers.ValidationError("Invalid department id.")
    try:
        return Department.objects.get(pk=oid)
    except Department.DoesNotExist:
        raise serializers.ValidationError(f"Department '{value}' does not exist.")


# ─── Serializers ──────────────────────────────────────────────────────────────

class DepartmentSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)

    class Meta:
        model = Department
        fields = '__all__'


class RoomSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    assigned_doctor = ObjectIdField(required=False, allow_null=True)
    assigned_staff = ObjectIdField(required=False, allow_null=True)
    doctor_assigned = serializers.ReadOnlyField(source='assigned_doctor.name', allow_null=True)
    staff_assigned = serializers.ReadOnlyField(source='assigned_staff.name', allow_null=True)

    class Meta:
        model = Room
        fields = '__all__'


class DoctorSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    department = ObjectIdField(required=True)
    department_name = serializers.SerializerMethodField()

    class Meta:
        model = Doctor
        fields = '__all__'

    def get_department_name(self, obj):
        try:
            return obj.department.name if obj.department else None
        except Exception:
            return None

    def validate_department(self, value):
        return _get_dept(value)

    def create(self, validated_data):
        return Doctor.objects.create(**validated_data)

    def update(self, instance, validated_data):
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        return instance


class StaffSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    department = ObjectIdField(required=False, allow_null=True)
    department_name = serializers.SerializerMethodField()

    class Meta:
        model = Staff
        fields = '__all__'

    def get_department_name(self, obj):
        try:
            return obj.department.name if obj.department else None
        except Exception:
            return None

    def validate_department(self, value):
        if not value:
            return None
        return _get_dept(value)

    def update(self, instance, validated_data):
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        return instance


class PatientSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    assigned_doctor = ObjectIdField(required=False, allow_null=True)
    assigned_room = ObjectIdField(required=False, allow_null=True)
    assigned_doctor_name = serializers.SerializerMethodField()
    assigned_room_number = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = '__all__'

    def get_assigned_doctor_name(self, obj):
        try:
            return obj.assigned_doctor.name if obj.assigned_doctor else None
        except Exception:
            return None

    def get_assigned_room_number(self, obj):
        try:
            return obj.assigned_room.room_number if obj.assigned_room else None
        except Exception:
            return None

    def validate_assigned_doctor(self, value):
        if not value:
            return None
        oid = to_object_id(value)
        if oid is None:
            raise serializers.ValidationError("Invalid doctor id.")
        try:
            return Doctor.objects.get(pk=oid)
        except Doctor.DoesNotExist:
            raise serializers.ValidationError(f"Doctor '{value}' does not exist.")

    def validate_assigned_room(self, value):
        if not value:
            return None
        oid = to_object_id(value)
        if oid is None:
            raise serializers.ValidationError("Invalid room id.")
        try:
            return Room.objects.get(pk=oid)
        except Room.DoesNotExist:
            raise serializers.ValidationError(f"Room '{value}' does not exist.")

    def update(self, instance, validated_data):
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        return instance


class AppointmentSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    doctor = ObjectIdField(required=True)
    doctor_name = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = '__all__'

    def get_doctor_name(self, obj):
        try:
            return obj.doctor.name if obj.doctor else None
        except Exception:
            return None

    def validate_doctor(self, value):
        if not value:
            return None
        oid = to_object_id(value)
        if oid is None:
            raise serializers.ValidationError("Invalid doctor id.")
        try:
            return Doctor.objects.get(pk=oid)
        except Doctor.DoesNotExist:
            raise serializers.ValidationError(f"Doctor '{value}' does not exist.")

    def update(self, instance, validated_data):
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        return instance


class LabTestSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    patient = ObjectIdField(required=False, allow_null=True)
    patient_name_display = serializers.SerializerMethodField()
    referred_by = ObjectIdField(required=False, allow_null=True)
    referred_by_name = serializers.SerializerMethodField()

    class Meta:
        model = LabTest
        fields = '__all__'

    def get_patient_name_display(self, obj):
        return obj.patient.name if obj.patient else obj.patient_name

    def validate_patient(self, value):
        if not value: return None
        oid = to_object_id(value)
        if not oid: return None
        return Patient.objects.get(pk=oid)

    def get_referred_by_name(self, obj):
        try:
            return obj.referred_by.name if obj.referred_by else None
        except Exception:
            return None

    def validate_referred_by(self, value):
        if not value:
            return None
        oid = to_object_id(value)
        if oid is None:
            raise serializers.ValidationError("Invalid doctor id.")
        try:
            return Doctor.objects.get(pk=oid)
        except Doctor.DoesNotExist:
            raise serializers.ValidationError(f"Doctor '{value}' does not exist.")

    def update(self, instance, validated_data):
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        return instance


class PharmacyItemSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)

    class Meta:
        model = PharmacyItem
        fields = '__all__'


class BloodStockSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)

    class Meta:
        model = BloodStock
        fields = '__all__'


class AmbulanceVehicleSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)

    class Meta:
        model = AmbulanceVehicle
        fields = '__all__'


class AmbulanceDispatchSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    ambulance = ObjectIdField(required=True)
    patient = ObjectIdField(required=False, allow_null=True)
    ambulance_details = serializers.SerializerMethodField()
    patient_name_display = serializers.SerializerMethodField()

    class Meta:
        model = AmbulanceDispatch
        fields = '__all__'

    def get_ambulance_details(self, obj):
        return f"{obj.ambulance.vehicle_number} ({obj.ambulance.driver_name})" if obj.ambulance else "Unknown"

    def get_patient_name_display(self, obj):
        return obj.patient.name if obj.patient else obj.patient_name

    def validate_patient(self, value):
        if not value: return None
        oid = to_object_id(value)
        if not oid: return None
        return Patient.objects.get(pk=oid)

    def validate_ambulance(self, value):
        oid = to_object_id(value)
        return AmbulanceVehicle.objects.get(pk=oid)

    def get_driver_name(self, obj):
        try:
            return obj.ambulance.driver_name if obj.ambulance else None
        except Exception:
            return None

    def validate_ambulance(self, value):
        if not value:
            return None
        oid = to_object_id(value)
        if oid is None:
            raise serializers.ValidationError("Invalid ambulance id.")
        try:
            return AmbulanceVehicle.objects.get(pk=oid)
        except AmbulanceVehicle.DoesNotExist:
            raise serializers.ValidationError(f"Ambulance '{value}' does not exist.")

    def update(self, instance, validated_data):
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        return instance

# --- ADVANCED MODULE SERIALIZERS ---
from .models import (
    MasterInvoice, InvoiceItem, ConsultationRecord, ConsultationPrescription,
    InpatientAdmission, SurgerySchedule, SurgeryTeamMember
)

class InvoiceItemSerializer(serializers.ModelSerializer):
    id = ObjectIdField(read_only=True)
    invoice = ObjectIdRelatedField(queryset=MasterInvoice.objects.all())
    class Meta:
        model = InvoiceItem
        fields = '__all__'

class MasterInvoiceSerializer(serializers.ModelSerializer):
    id = ObjectIdField(read_only=True)
    patient = ObjectIdRelatedField(queryset=Patient.objects.all())
    items = InvoiceItemSerializer(many=True, read_only=True)
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    
    class Meta:
        model = MasterInvoice
        fields = '__all__'

class ConsultationPrescriptionSerializer(serializers.ModelSerializer):
    id = ObjectIdField(read_only=True)
    consultation = ObjectIdRelatedField(queryset=ConsultationRecord.objects.all())
    doctor_name = serializers.CharField(source='consultation.doctor.name', read_only=True)
    date = serializers.DateTimeField(source='consultation.created_at', read_only=True)
    class Meta:
        model = ConsultationPrescription
        fields = '__all__'

class ConsultationRecordSerializer(serializers.ModelSerializer):
    id = ObjectIdField(read_only=True)
    patient = ObjectIdRelatedField(queryset=Patient.objects.all())
    doctor = ObjectIdRelatedField(queryset=Doctor.objects.all())
    appointment = ObjectIdRelatedField(queryset=Appointment.objects.all(), required=False, allow_null=True)
    prescriptions = ConsultationPrescriptionSerializer(many=True, read_only=True)
    doctor_name = serializers.CharField(source='doctor.name', read_only=True)
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    
    class Meta:
        model = ConsultationRecord
        fields = '__all__'

class InpatientAdmissionSerializer(serializers.ModelSerializer):
    id = ObjectIdField(read_only=True)
    patient = ObjectIdRelatedField(queryset=Patient.objects.all())
    room = ObjectIdRelatedField(queryset=Room.objects.all())
    admitting_doctor = ObjectIdRelatedField(queryset=Doctor.objects.all(), required=False, allow_null=True)
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    room_number = serializers.CharField(source='room.room_number', read_only=True)
    
    class Meta:
        model = InpatientAdmission
        fields = '__all__'

class SurgeryTeamMemberSerializer(serializers.ModelSerializer):
    id = ObjectIdField(read_only=True)
    surgery = ObjectIdRelatedField(queryset=SurgerySchedule.objects.all())
    staff = ObjectIdRelatedField(queryset=Staff.objects.all())
    staff_name = serializers.CharField(source='staff.name', read_only=True)
    class Meta:
        model = SurgeryTeamMember
        fields = '__all__'

class SurgeryScheduleSerializer(serializers.ModelSerializer):
    id = ObjectIdField(read_only=True)
    patient = ObjectIdRelatedField(queryset=Patient.objects.all())
    lead_surgeon = ObjectIdRelatedField(queryset=Doctor.objects.all())
    ot_room = ObjectIdRelatedField(queryset=Room.objects.all())
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    lead_surgeon_name = serializers.CharField(source='lead_surgeon.name', read_only=True)
    ot_room_number = serializers.CharField(source='ot_room.room_number', read_only=True)
    team = SurgeryTeamMemberSerializer(many=True, read_only=True)
    
    class Meta:
        model = SurgerySchedule
        fields = '__all__'

from .models import Payroll

class PayrollSerializer(serializers.ModelSerializer):
    id = ObjectIdField(read_only=True)
    staff = ObjectIdRelatedField(queryset=Staff.objects.all())
    staff_name = serializers.CharField(source='staff.name', read_only=True)
    staff_role = serializers.CharField(source='staff.role', read_only=True)
    
    class Meta:
        model = Payroll
        fields = '__all__'

