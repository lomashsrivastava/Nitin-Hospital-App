"""
Complete seed script using Django ORM (same path as running server).
Seeds departments AND doctors into hospital_department and hospital_doctor collections.
Run: python seed_hospital_data.py
"""
import os
import sys
import django
import random
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nitin_billing.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from hospital.models import Department, Doctor

DEPARTMENTS = [
    ("Neurology", "Diagnosis and treatment of disorders of the nervous system"),
    ("Surgery", "Operative procedures for treatment of diseases and injuries"),
    ("Radiology", "Medical imaging to diagnose and treat disease"),
    ("Gastrology", "Disorders of digestive system, liver and pancreas"),
    ("Dermatology", "Conditions related to skin, nails and hair"),
    ("Oncology", "Diagnosis and treatment of cancer"),
    ("Obstetrics/Gynecology (OB-GYN)", "Women's reproductive health, pregnancy and childbirth"),
    ("Pediatrics", "Medical care for infants, children and adolescents"),
    ("Physician", "General medicine and primary care"),
    ("Emergency Medicines", "Acute care for undifferentiated urgent medical conditions"),
    ("Internal Medicine", "Non-surgical diagnosis and treatment of adult diseases"),
]

DOCTOR_DATA = {
    "Neurology": [
        ("Rajesh Kumar", "Neurologist", "9812345678", "9AM-1PM", "800.00"),
        ("Sunita Sharma", "Neuro Specialist", "9823456789", "10AM-2PM", "750.00"),
        ("Vikram Mehta", "Brain & Spine Surgeon", "9834567890", "11AM-3PM", "1000.00"),
        ("Priya Gupta", "Neurologist", "9845678901", "8AM-12PM", "850.00"),
        ("Arun Singh", "Epilepsy Specialist", "9856789012", "Mon-Fri 9AM-1PM", "700.00"),
        ("Meena Patel", "Movement Disorder Specialist", "9867890123", "9AM-2PM", "900.00"),
        ("Sanjay Verma", "Neurosurgeon", "9878901234", "10AM-3PM", "1200.00"),
        ("Kavita Rao", "Stroke Specialist", "9889012345", "8AM-1PM", "800.00"),
        ("Deepak Nair", "Headache Specialist", "9890123456", "9AM-2PM", "650.00"),
        ("Anita Joshi", "Dementia Specialist", "9801234567", "10AM-1PM", "750.00"),
        ("Ramesh Tiwari", "Neurocritical Care", "9712345678", "11AM-4PM", "1100.00"),
        ("Pooja Aggarwal", "Neurology", "9723456789", "9AM-12PM", "700.00"),
    ],
    "Surgery": [
        ("Kiran Desai", "General Surgeon", "9612345678", "8AM-2PM", "1500.00"),
        ("Manish Khanna", "Laparoscopic Surgeon", "9623456789", "9AM-3PM", "1800.00"),
        ("Seema Jain", "Cardiothoracic Surgeon", "9634567890", "10AM-2PM", "2000.00"),
        ("Ashok Pillai", "Orthopedic Surgeon", "9645678901", "8AM-1PM", "1600.00"),
        ("Nisha Saxena", "Plastic & Reconstructive Surgeon", "9656789012", "9AM-12PM", "1700.00"),
        ("Vinod Chauhan", "Gastrointestinal Surgeon", "9667890123", "10AM-3PM", "1900.00"),
        ("Rekha Nair", "Urological Surgeon", "9678901234", "9AM-1PM", "1500.00"),
        ("Suresh Malhotra", "Neurosurgeon", "9689012345", "8AM-2PM", "2200.00"),
        ("Anjali Bose", "Oncological Surgeon", "9690123456", "10AM-2PM", "1800.00"),
        ("Vivek Kumar", "Vascular Surgeon", "9601234567", "9AM-3PM", "1700.00"),
        ("Usha Choudhary", "Transplant Surgeon", "9512345678", "8AM-12PM", "2500.00"),
        ("Ganesh Iyer", "ENT Surgeon", "9523456789", "10AM-1PM", "1400.00"),
        ("Harish Pandey", "Laparoscopic Surgeon", "9545678901", "8AM-12PM", "1600.00"),
    ],
    "Radiology": [
        ("Prem Shankar", "Radiologist", "9412345678", "9AM-5PM", "600.00"),
        ("Lata Mishra", "Diagnostic Radiologist", "9423456789", "10AM-4PM", "650.00"),
        ("Sunil Dubey", "Interventional Radiologist", "9434567890", "8AM-3PM", "800.00"),
        ("Meera Krishnan", "Nuclear Medicine Specialist", "9445678901", "9AM-2PM", "900.00"),
        ("Rohit Bajaj", "Radiologist", "9456789012", "10AM-5PM", "700.00"),
        ("Sweta Garg", "CT & MRI Specialist", "9467890123", "9AM-4PM", "750.00"),
        ("Nitin Arora", "Sonologist", "9478901234", "8AM-2PM", "500.00"),
        ("Alka Srivastava", "Pediatric Radiologist", "9489012345", "9AM-1PM", "850.00"),
        ("Vivek Shah", "Radiologist", "9490123456", "10AM-3PM", "700.00"),
        ("Divya Menon", "Breast Imaging Specialist", "9401234567", "9AM-2PM", "900.00"),
    ],
    "Gastrology": [
        ("Umesh Kapoor", "Gastroenterologist", "9312345678", "9AM-2PM", "900.00"),
        ("Nalini Bhat", "Hepatologist", "9323456789", "10AM-3PM", "1100.00"),
        ("Aditya Raj", "Endoscopist", "9334567890", "8AM-1PM", "1000.00"),
        ("Sunanda Nanda", "IBD Specialist", "9345678901", "9AM-2PM", "850.00"),
        ("Prakash Shukla", "Gastroenterologist", "9356789012", "10AM-4PM", "900.00"),
        ("Geeta Sinha", "Colorectal Specialist", "9367890123", "9AM-1PM", "950.00"),
        ("Hemant Soni", "Pancreatologist", "9378901234", "8AM-12PM", "1200.00"),
        ("Padma Subramaniam", "Gastroenterologist", "9389012345", "10AM-3PM", "900.00"),
        ("Rakesh Dutta", "Liver Specialist", "9390123456", "9AM-2PM", "1000.00"),
        ("Sudha Kamath", "Gastroenterologist", "9301234567", "10AM-1PM", "850.00"),
        ("Abhijit Paul", "Endoscopy Specialist", "9212345678", "8AM-2PM", "750.00"),
        ("Charulata Iyer", "Gastroenterologist", "9223456789", "9AM-3PM", "900.00"),
    ],
    "Dermatology": [
        ("Ananya Kapoor", "Dermatologist", "9112345678", "10AM-2PM", "700.00"),
        ("Rohit Tiwary", "Cosmetic Dermatologist", "9123456789", "9AM-3PM", "900.00"),
        ("Priti Chawla", "Skin Specialist", "9134567890", "10AM-1PM", "800.00"),
        ("Sameer Khan", "Dermatologist", "9145678901", "9AM-2PM", "750.00"),
        ("Nidhi Vohra", "Hair & Scalp Specialist", "9156789012", "10AM-3PM", "850.00"),
        ("Lalit Mohan", "Aesthetic Dermatologist", "9167890123", "9AM-1PM", "1000.00"),
        ("Shruti Pandey", "Dermatologist", "9178901234", "10AM-2PM", "700.00"),
        ("Mayank Goel", "Acne & Pigmentation Specialist", "9189012345", "9AM-2PM", "800.00"),
        ("Archana Das", "Trichologist", "9190123456", "10AM-1PM", "750.00"),
        ("Sudeep Roy", "Dermatologist", "9101234567", "9AM-3PM", "850.00"),
        ("Narmada Singh", "Vitiligo Specialist", "9102345678", "10AM-2PM", "700.00"),
    ],
    "Oncology": [
        ("Hariom Sharma", "Medical Oncologist", "9012345678", "9AM-2PM", "2000.00"),
        ("Lavanya Seshadri", "Radiation Oncologist", "9023456789", "10AM-3PM", "1800.00"),
        ("Rajiv Bakshi", "Surgical Oncologist", "9034567890", "9AM-1PM", "2500.00"),
        ("Seema Dev", "Gynecological Oncologist", "9045678901", "10AM-2PM", "2200.00"),
        ("Amar Puri", "Hemato-Oncologist", "9056789012", "9AM-2PM", "1900.00"),
        ("Chitra Ramesh", "Breast Cancer Specialist", "9067890123", "10AM-1PM", "2000.00"),
        ("Nikhil Bansal", "Medical Oncologist", "9078901234", "9AM-3PM", "1800.00"),
        ("Anuradha Misra", "Palliative Care Oncologist", "9089012345", "10AM-2PM", "1500.00"),
        ("Subhash Goyal", "Bone Cancer Specialist", "9090123456", "9AM-1PM", "2100.00"),
        ("Kaveri Nair", "Oncologist", "9001234567", "10AM-3PM", "1900.00"),
        ("Dinesh Tripathi", "Leukemia Specialist", "8912345678", "9AM-2PM", "2000.00"),
    ],
    "Obstetrics/Gynecology (OB-GYN)": [
        ("Shilpa Guha", "Obstetrician & Gynecologist", "8812345678", "9AM-2PM", "1000.00"),
        ("Rashmi Ahuja", "High-Risk Pregnancy Specialist", "8823456789", "10AM-3PM", "1200.00"),
        ("Vandana Sethi", "Reproductive Endocrinologist", "8834567890", "9AM-1PM", "1500.00"),
        ("Mina Qureshi", "Gynecologist", "8845678901", "10AM-2PM", "1100.00"),
        ("Kavitha Ramachandran", "Maternal-Fetal Medicine Specialist", "8856789012", "9AM-2PM", "1300.00"),
        ("Anjana Mallik", "Laparoscopic Gynecologist", "8867890123", "10AM-1PM", "1400.00"),
        ("Renuka Pillai", "Gynecologist", "8878901234", "9AM-3PM", "1000.00"),
        ("Prerna Bhati", "IVF Specialist", "8889012345", "10AM-2PM", "1800.00"),
        ("Uma Iyengar", "Gynecologic Oncologist", "8890123456", "9AM-1PM", "1600.00"),
        ("Savita Jha", "Obstetrician", "8801234567", "10AM-3PM", "1000.00"),
        ("Meghna Patil", "Gynecologist", "8712345678", "9AM-2PM", "1100.00"),
        ("Archita Bhatnagar", "Infertility Specialist", "8723456789", "10AM-1PM", "1700.00"),
    ],
    "Pediatrics": [
        ("Santosh Agnihotri", "Pediatrician", "8612345678", "9AM-2PM", "700.00"),
        ("Bindu Saini", "Neonatologist", "8623456789", "10AM-3PM", "1000.00"),
        ("Raghav Mehrotra", "Pediatric Cardiologist", "8634567890", "9AM-1PM", "1200.00"),
        ("Mala Chaudhary", "Pediatrician", "8645678901", "10AM-2PM", "750.00"),
        ("Tarun Saxena", "Pediatric Neurologist", "8656789012", "9AM-2PM", "1100.00"),
        ("Sushma Batra", "Pediatric Surgeon", "8667890123", "10AM-1PM", "1300.00"),
        ("Niraj Rastogi", "Pediatric Endocrinologist", "8678901234", "9AM-3PM", "1000.00"),
        ("Anshul Seth", "Pediatrician", "8689012345", "10AM-2PM", "700.00"),
        ("Shashi Prakash", "Child Development Specialist", "8690123456", "9AM-1PM", "900.00"),
        ("Deepti Kumar", "Pediatric Intensivist", "8601234567", "10AM-3PM", "1100.00"),
        ("Ranjit Kapila", "Pediatrician", "8512345678", "9AM-2PM", "750.00"),
        ("Sonal Gupta", "Child Psychologist", "8523456789", "9AM-12PM", "800.00"),
    ],
    "Physician": [
        ("Satish Dubey", "General Physician", "8412345678", "9AM-5PM", "500.00"),
        ("Leela Shenoy", "Internal Medicine Specialist", "8423456789", "10AM-4PM", "700.00"),
        ("Pramod Tandon", "General Physician", "8434567890", "9AM-3PM", "550.00"),
        ("Neeraj Khare", "Family Medicine Physician", "8445678901", "10AM-2PM", "600.00"),
        ("Sudha Pillai", "General Physician", "8456789012", "9AM-4PM", "500.00"),
        ("Subramaniam Rao", "Internal Medicine", "8467890123", "8AM-12PM", "650.00"),
        ("Manisha Bhatt", "General Physician", "8478901234", "9AM-5PM", "550.00"),
        ("Venugopal Hari", "Physician", "8489012345", "10AM-3PM", "500.00"),
        ("Nalini Verma", "General Medicine", "8490123456", "9AM-2PM", "600.00"),
        ("Ashish Trivedi", "Internal Medicine Physician", "8401234567", "10AM-4PM", "700.00"),
        ("Kamala Devi", "General Physician", "8402345678", "9AM-3PM", "550.00"),
    ],
    "Emergency Medicines": [
        ("Shekhar Rathi", "Emergency Medicine Specialist", "8312345678", "24/7 Duty", "1000.00"),
        ("Kamla Bhonsle", "Critical Care Physician", "8323456789", "24/7 Duty", "1200.00"),
        ("Jitendra Sharma", "Emergency Physician", "8334567890", "24/7 Duty", "1000.00"),
        ("Rekha Naidu", "Trauma Specialist", "8345678901", "24/7 Duty", "1100.00"),
        ("Pankaj Dey", "Emergency Medicine", "8356789012", "24/7 Duty", "950.00"),
        ("Urvashi Singh", "Emergency Physician", "8367890123", "24/7 Duty", "1000.00"),
        ("Manoj Tewari", "Resuscitation Specialist", "8378901234", "24/7 Duty", "1100.00"),
        ("Varsha Nayak", "Emergency & Trauma Specialist", "8389012345", "24/7 Duty", "1200.00"),
        ("Jayesh Patel", "Critical Care", "8390123456", "24/7 Duty", "1000.00"),
        ("Devika Rao", "Emergency Physician", "8301234567", "24/7 Duty", "950.00"),
        ("Sanjeev Bajaj", "Emergency Medicine Specialist", "8212345678", "24/7 Duty", "1050.00"),
        ("Preeti Soni", "Emergency Care Physician", "8223456789", "24/7 Duty", "980.00"),
    ],
    "Internal Medicine": [
        ("Vijay Swaroop", "Internist", "8112345678", "9AM-4PM", "800.00"),
        ("Malathi Kumar", "Internal Medicine", "8123456789", "10AM-3PM", "850.00"),
        ("Raj Narayanan", "General Internal Medicine", "8134567890", "9AM-2PM", "750.00"),
        ("Hemalatha Rajan", "Internal Medicine Specialist", "8145678901", "10AM-4PM", "900.00"),
        ("Dinesh Ahuja", "Hospitalist", "8156789012", "9AM-3PM", "800.00"),
        ("Kavya Menon", "Internal Medicine", "8167890123", "10AM-2PM", "850.00"),
        ("Surendra Yadav", "Internist", "8178901234", "9AM-4PM", "750.00"),
        ("Sudha Krishnamurthy", "General Internal Medicine", "8189012345", "10AM-3PM", "900.00"),
        ("Vijayalakshmi Rao", "Internal Medicine", "8190123456", "9AM-2PM", "800.00"),
        ("Parameshwar Iyer", "Hospitalist", "8101234567", "10AM-4PM", "850.00"),
        ("Geetha Subramaniam", "Internist", "8012345678", "9AM-3PM", "750.00"),
        ("Vikas Chaudhary", "Internal Medicine", "8013456789", "10AM-4PM", "820.00"),
    ],
}

def seed():
    print("\n=== Starting Hospital Data Seeding ===\n")

    
    # Step 1: Create/verify departments
    dept_map = {}
    for dept_name, dept_desc in DEPARTMENTS:
        dept, created = Department.objects.get_or_create(
            name=dept_name,
            defaults={'description': dept_desc}
        )
        dept_map[dept_name] = dept
        status = "✅ Created" if created else "↩️  Exists"
        print(f"{status}: {dept_name}")
    
    print(f"\nTotal departments: {Department.objects.count()}\n")
    
    # Step 2: Seed doctors
    print("👨‍⚕️ Seeding doctors...\n")
    total_created = 0
    
    for dept_name, dept_desc in DEPARTMENTS:
        dept = dept_map[dept_name]
        doctors_data = DOCTOR_DATA.get(dept_name, [])
        
        if not doctors_data:
            continue
        
        # Pick 10-15 random doctors
        num = random.randint(10, min(15, len(doctors_data)))
        selected = random.sample(doctors_data, num)
        
        dept_created = 0
        for name, spec, phone, timings, fee in selected:
            _, created = Doctor.objects.get_or_create(
                name=name,
                department=dept,
                defaults={
                    'specialization': spec,
                    'contact_number': phone,
                    'opd_timings': timings,
                    'consultation_fee': Decimal(fee),
                    'email': f"{name.lower().replace(' ', '.').replace('/', '').replace('&', '')}@nitinhosp.com",
                    'is_active': True,
                }
            )
            if created:
                dept_created += 1
                total_created += 1
        
        existing = Doctor.objects.filter(department=dept).count()
        print(f"  ✓ {dept_name}: +{dept_created} new | Total: {existing}")
    
    print(f"\n{'='*50}")
    print(f"✅ Seeding complete!")
    print(f"📊 Total Departments: {Department.objects.count()}")
    print(f"👨‍⚕️ Total Doctors:     {Doctor.objects.count()}")
    print(f"🆕 New Doctors Added: {total_created}")

if __name__ == '__main__':
    seed()
