"""
Seed script: Adds 10-15 random doctors to each existing department using pymongo directly.
Run from backend directory: python seed_doctors.py
"""
import os
import random
from datetime import datetime, timezone
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv('MONGODB_URI')
DB_NAME = os.getenv('DB_NAME', 'nitin_medical')

# Doctor name pools by specialty
DOCTOR_TEMPLATES = {
    "Neurology": [
        ("Rajesh Kumar", "Neurologist", "9812345678", "9AM-1PM", 800),
        ("Sunita Sharma", "Neuro Specialist", "9823456789", "10AM-2PM", 750),
        ("Vikram Mehta", "Brain & Spine Surgeon", "9834567890", "11AM-3PM", 1000),
        ("Priya Gupta", "Neurologist", "9845678901", "8AM-12PM", 850),
        ("Arun Singh", "Epilepsy Specialist", "9856789012", "Mon-Fri 9AM-1PM", 700),
        ("Meena Patel", "Movement Disorder Specialist", "9867890123", "9AM-2PM", 900),
        ("Sanjay Verma", "Neurosurgeon", "9878901234", "10AM-3PM", 1200),
        ("Kavita Rao", "Stroke Specialist", "9889012345", "8AM-1PM", 800),
        ("Deepak Nair", "Headache Specialist", "9890123456", "9AM-2PM", 650),
        ("Anita Joshi", "Dementia Specialist", "9801234567", "10AM-1PM", 750),
        ("Ramesh Tiwari", "Neurocritical Care", "9712345678", "11AM-4PM", 1100),
        ("Pooja Aggarwal", "Neurology", "9723456789", "9AM-12PM", 700),
    ],
    "Surgery": [
        ("Kiran Desai", "General Surgeon", "9612345678", "8AM-2PM", 1500),
        ("Manish Khanna", "Laparoscopic Surgeon", "9623456789", "9AM-3PM", 1800),
        ("Seema Jain", "Cardiothoracic Surgeon", "9634567890", "10AM-2PM", 2000),
        ("Ashok Pillai", "Orthopedic Surgeon", "9645678901", "8AM-1PM", 1600),
        ("Nisha Saxena", "Plastic & Reconstructive Surgeon", "9656789012", "9AM-12PM", 1700),
        ("Vinod Chauhan", "Gastrointestinal Surgeon", "9667890123", "10AM-3PM", 1900),
        ("Rekha Nair", "Urological Surgeon", "9678901234", "9AM-1PM", 1500),
        ("Suresh Malhotra", "Neurosurgeon", "9689012345", "8AM-2PM", 2200),
        ("Anjali Bose", "Oncological Surgeon", "9690123456", "10AM-2PM", 1800),
        ("Vivek Kumar", "Vascular Surgeon", "9601234567", "9AM-3PM", 1700),
        ("Usha Choudhary", "Transplant Surgeon", "9512345678", "8AM-12PM", 2500),
        ("Ganesh Iyer", "General Surgeon", "9523456789", "10AM-1PM", 1400),
        ("Sunila Reddy", "ENT Surgeon", "9534567890", "9AM-2PM", 1300),
        ("Harish Pandey", "Laparoscopic Surgeon", "9545678901", "8AM-12PM", 1600),
    ],
    "Radiology": [
        ("Prem Shankar", "Radiologist", "9412345678", "9AM-5PM", 600),
        ("Lata Mishra", "Diagnostic Radiologist", "9423456789", "10AM-4PM", 650),
        ("Sunil Dubey", "Interventional Radiologist", "9434567890", "8AM-3PM", 800),
        ("Meera Krishnan", "Nuclear Medicine Specialist", "9445678901", "9AM-2PM", 900),
        ("Rohit Bajaj", "Radiologist", "9456789012", "10AM-5PM", 700),
        ("Sweta Garg", "CT & MRI Specialist", "9467890123", "9AM-4PM", 750),
        ("Nitin Arora", "Sonologist", "9478901234", "8AM-2PM", 500),
        ("Alka Srivastava", "Pediatric Radiologist", "9489012345", "9AM-1PM", 850),
        ("Vivek Shah", "Radiologist", "9490123456", "10AM-3PM", 700),
        ("Divya Menon", "Breast Imaging Specialist", "9401234567", "9AM-2PM", 900),
    ],
    "Gastrology": [
        ("Umesh Kapoor", "Gastroenterologist", "9312345678", "9AM-2PM", 900),
        ("Nalini Bhat", "Hepatologist", "9323456789", "10AM-3PM", 1100),
        ("Aditya Raj", "Endoscopist", "9334567890", "8AM-1PM", 1000),
        ("Sunanda Nanda", "IBD Specialist", "9345678901", "9AM-2PM", 850),
        ("Prakash Shukla", "Gastroenterologist", "9356789012", "10AM-4PM", 900),
        ("Geeta Sinha", "Colorectal Specialist", "9367890123", "9AM-1PM", 950),
        ("Hemant Soni", "Pancreatologist", "9378901234", "8AM-12PM", 1200),
        ("Padma Subramaniam", "Gastroenterologist", "9389012345", "10AM-3PM", 900),
        ("Rakesh Dutta", "Liver Specialist", "9390123456", "9AM-2PM", 1000),
        ("Sudha Kamath", "Gastroenterologist", "9301234567", "10AM-1PM", 850),
        ("Abhijit Paul", "Endoscopy Specialist", "9212345678", "8AM-2PM", 750),
        ("Charulata Iyer", "Gastroenterologist", "9223456789", "9AM-3PM", 900),
    ],
    "Dermatology": [
        ("Ananya Kapoor", "Dermatologist", "9112345678", "10AM-2PM", 700),
        ("Rohit Tiwary", "Cosmetic Dermatologist", "9123456789", "9AM-3PM", 900),
        ("Priti Chawla", "Skin Specialist", "9134567890", "10AM-1PM", 800),
        ("Sameer Khan", "Dermatologist", "9145678901", "9AM-2PM", 750),
        ("Nidhi Vohra", "Hair & Scalp Specialist", "9156789012", "10AM-3PM", 850),
        ("Lalit Mohan", "Aesthetic Dermatologist", "9167890123", "9AM-1PM", 1000),
        ("Shruti Pandey", "Dermatologist", "9178901234", "10AM-2PM", 700),
        ("Mayank Goel", "Acne & Pigmentation Specialist", "9189012345", "9AM-2PM", 800),
        ("Archana Das", "Trichologist", "9190123456", "10AM-1PM", 750),
        ("Sudeep Roy", "Dermatologist", "9101234567", "9AM-3PM", 850),
    ],
    "Oncology": [
        ("Hariom Sharma", "Medical Oncologist", "9012345678", "9AM-2PM", 2000),
        ("Lavanya Seshadri", "Radiation Oncologist", "9023456789", "10AM-3PM", 1800),
        ("Rajiv Bakshi", "Surgical Oncologist", "9034567890", "9AM-1PM", 2500),
        ("Seema Dev", "Gynecological Oncologist", "9045678901", "10AM-2PM", 2200),
        ("Amar Puri", "Hemato-Oncologist", "9056789012", "9AM-2PM", 1900),
        ("Chitra Ramesh", "Breast Cancer Specialist", "9067890123", "10AM-1PM", 2000),
        ("Nikhil Bansal", "Medical Oncologist", "9078901234", "9AM-3PM", 1800),
        ("Anuradha Misra", "Palliative Care Oncologist", "9089012345", "10AM-2PM", 1500),
        ("Subhash Goyal", "Bone Cancer Specialist", "9090123456", "9AM-1PM", 2100),
        ("Kaveri Nair", "Oncologist", "9001234567", "10AM-3PM", 1900),
        ("Dinesh Tripathi", "Leukemia Specialist", "8912345678", "9AM-2PM", 2000),
    ],
    "Obstetrics/Gynecology (OB-GYN)": [
        ("Shilpa Guha", "Obstetrician & Gynecologist", "8812345678", "9AM-2PM", 1000),
        ("Rashmi Ahuja", "High-Risk Pregnancy Specialist", "8823456789", "10AM-3PM", 1200),
        ("Vandana Sethi", "Reproductive Endocrinologist", "8834567890", "9AM-1PM", 1500),
        ("Mina Qureshi", "Gynecologist", "8845678901", "10AM-2PM", 1100),
        ("Kavitha Ramachandran", "Maternal-Fetal Medicine Specialist", "8856789012", "9AM-2PM", 1300),
        ("Anjana Mallik", "Laparoscopic Gynecologist", "8867890123", "10AM-1PM", 1400),
        ("Renuka Pillai", "Gynecologist", "8878901234", "9AM-3PM", 1000),
        ("Prerna Bhati", "IVF Specialist", "8889012345", "10AM-2PM", 1800),
        ("Uma Iyengar", "Gynecologic Oncologist", "8890123456", "9AM-1PM", 1600),
        ("Savita Jha", "Obstetrician", "8801234567", "10AM-3PM", 1000),
        ("Meghna Patil", "Gynecologist", "8712345678", "9AM-2PM", 1100),
        ("Archita Bhatnagar", "Infertility Specialist", "8723456789", "10AM-1PM", 1700),
    ],
    "Pediatrics": [
        ("Santosh Agnihotri", "Pediatrician", "8612345678", "9AM-2PM", 700),
        ("Bindu Saini", "Neonatologist", "8623456789", "10AM-3PM", 1000),
        ("Raghav Mehrotra", "Pediatric Cardiologist", "8634567890", "9AM-1PM", 1200),
        ("Mala Chaudhary", "Pediatrician", "8645678901", "10AM-2PM", 750),
        ("Tarun Saxena", "Pediatric Neurologist", "8656789012", "9AM-2PM", 1100),
        ("Sushma Batra", "Pediatric Surgeon", "8667890123", "10AM-1PM", 1300),
        ("Niraj Rastogi", "Pediatric Endocrinologist", "8678901234", "9AM-3PM", 1000),
        ("Anshul Seth", "Pediatrician", "8689012345", "10AM-2PM", 700),
        ("Shashi Prakash", "Child Development Specialist", "8690123456", "9AM-1PM", 900),
        ("Deepti Kumar", "Pediatric Intensivist", "8601234567", "10AM-3PM", 1100),
        ("Ranjit Kapila", "Pediatrician", "8512345678", "9AM-2PM", 750),
    ],
    "Physician": [
        ("Satish Dubey", "General Physician", "8412345678", "9AM-5PM", 500),
        ("Leela Shenoy", "Internal Medicine Specialist", "8423456789", "10AM-4PM", 700),
        ("Pramod Tandon", "General Physician", "8434567890", "9AM-3PM", 550),
        ("Neeraj Khare", "Family Medicine Physician", "8445678901", "10AM-2PM", 600),
        ("Sudha Pillai", "General Physician", "8456789012", "9AM-4PM", 500),
        ("Subramaniam Rao", "Internal Medicine", "8467890123", "8AM-12PM", 650),
        ("Manisha Bhatt", "General Physician", "8478901234", "9AM-5PM", 550),
        ("Venugopal Hari", "Physician", "8489012345", "10AM-3PM", 500),
        ("Nalini Verma", "General Medicine", "8490123456", "9AM-2PM", 600),
        ("Ashish Trivedi", "Internal Medicine Physician", "8401234567", "10AM-4PM", 700),
    ],
    "Emergency Medicines": [
        ("Shekhar Rathi", "Emergency Medicine Specialist", "8312345678", "24/7 Duty", 1000),
        ("Kamla Bhonsle", "Critical Care Physician", "8323456789", "24/7 Duty", 1200),
        ("Jitendra Sharma", "Emergency Physician", "8334567890", "24/7 Duty", 1000),
        ("Rekha Naidu", "Trauma Specialist", "8345678901", "24/7 Duty", 1100),
        ("Pankaj Dey", "Emergency Medicine", "8356789012", "24/7 Duty", 950),
        ("Urvashi Singh", "Emergency Physician", "8367890123", "24/7 Duty", 1000),
        ("Manoj Tewari", "Resuscitation & Emergency Care", "8378901234", "24/7 Duty", 1100),
        ("Varsha Nayak", "Emergency & Trauma Specialist", "8389012345", "24/7 Duty", 1200),
        ("Jayesh Patel", "Critical Care", "8390123456", "24/7 Duty", 1000),
        ("Devika Rao", "Emergency Physician", "8301234567", "24/7 Duty", 950),
        ("Sanjeev Bajaj", "Emergency Medicine Specialist", "8212345678", "24/7 Duty", 1050),
        ("Preeti Soni", "Emergency Care Physician", "8223456789", "24/7 Duty", 980),
    ],
    "Internal Medicine": [
        ("Vijay Swaroop", "Internist", "8112345678", "9AM-4PM", 800),
        ("Malathi Kumar", "Internal Medicine", "8123456789", "10AM-3PM", 850),
        ("Raj Narayanan", "General Internal Medicine", "8134567890", "9AM-2PM", 750),
        ("Hemalatha Rajan", "Internal Medicine Specialist", "8145678901", "10AM-4PM", 900),
        ("Dinesh Ahuja", "Hospitalist", "8156789012", "9AM-3PM", 800),
        ("Kavya Menon", "Internal Medicine", "8167890123", "10AM-2PM", 850),
        ("Surendra Yadav", "Internist", "8178901234", "9AM-4PM", 750),
        ("Sudha Krishnamurthy", "General Internal Medicine", "8189012345", "10AM-3PM", 900),
        ("Vijayalakshmi Rao", "Internal Medicine", "8190123456", "9AM-2PM", 800),
        ("Parameshwar Iyer", "Hospitalist", "8101234567", "10AM-4PM", 850),
        ("Geetha Subramaniam", "Internist", "8012345678", "9AM-3PM", 750),
    ],
}

def get_templates_for_dept(dept_name):
    """Find templates by exact or partial name match."""
    if dept_name in DOCTOR_TEMPLATES:
        return DOCTOR_TEMPLATES[dept_name]
    for key in DOCTOR_TEMPLATES:
        if key.lower() in dept_name.lower() or dept_name.lower() in key.lower():
            return DOCTOR_TEMPLATES[key]
    return None

def seed_doctors():
    print(f"Connecting to MongoDB: {DB_NAME} ...")
    client = MongoClient(MONGODB_URI)
    db = client[DB_NAME]
    
    dept_coll   = db['hospital_department']
    doctor_coll = db['hospital_doctor']
    
    departments = list(dept_coll.find({}))
    print(f"Found {len(departments)} departments.")
    
    if not departments:
        print("ERROR: No departments found in hospital_department collection!")
        print("Available collections:", db.list_collection_names())
        return
    
    total_created = 0
    now = datetime.now(timezone.utc)
    
    for dept in departments:
        dept_id   = dept['_id']        # Already an ObjectId
        dept_name = dept.get('name', 'Unknown')
        
        templates = get_templates_for_dept(dept_name)
        if not templates:
            # Generic fallback
            templates = [
                (f"Dr. Singh {i}", f"{dept_name} Specialist", f"98{i:08d}", "9AM-2PM", 700 + i*50)
                for i in range(12)
            ]
        
        # Pick 10–15 doctors
        num = random.randint(10, min(15, len(templates)))
        selected = random.sample(templates, min(num, len(templates)))
        
        dept_created = 0
        for name, spec, phone, timings, fee in selected:
            # Skip if doctor with same name already exists in this dept
            if doctor_coll.find_one({'name': name, 'department_id': dept_id}):
                continue
            
            doc = {
                '_id':             ObjectId(),
                'name':            name,
                'specialization':  spec,
                'department_id':   dept_id,   # FK stored as ObjectId
                'contact_number':  phone,
                'email':           f"{name.lower().replace(' ', '.').replace('/', '').replace('&', '')}@nitinhosp.com",
                'consultation_fee': str(fee),
                'opd_timings':     timings,
                'is_active':       True,
                'created_at':      now,
            }
            doctor_coll.insert_one(doc)
            dept_created += 1
            total_created += 1
        
        existing = doctor_coll.count_documents({'department_id': dept_id})
        print(f"  ✓ {dept_name}: Added {dept_created} doctors (Total in dept: {existing})")
    
    total = doctor_coll.count_documents({})
    print(f"\n✅ Done! Total doctors in DB: {total}")
    print(f"✅ New doctors created: {total_created}")

if __name__ == '__main__':
    seed_doctors()
