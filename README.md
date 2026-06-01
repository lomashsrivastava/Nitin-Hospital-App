<div align="center">

# 🏥 Nitin Hospital
### AI-Powered Hospital Management System

![Dashboard](screenshots/02_dashboard.png)

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Netlify-00C7B7?style=for-the-badge)](https://nitinhospital.netlify.app)
[![API](https://img.shields.io/badge/🔌_Backend_API-Render-46E3B7?style=for-the-badge)](https://nitin-hospital-backend.onrender.com)
[![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Django](https://img.shields.io/badge/Django_5-092E20?style=for-the-badge&logo=django)](https://djangoproject.com)
[![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com/atlas)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)

**Full-stack production Hospital Management System with 23 clinical modules, real-time dashboards, JWT authentication, and one-click deployment.**

</div>

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [📸 Module Screenshots](#-module-screenshots)
- [🛠 Tech Stack](#-tech-stack)
- [🚀 Quick Deploy](#-quick-deploy)
  - [Backend → Render](#backend--render-5-minutes)
  - [Frontend → Netlify](#frontend--netlify-3-minutes)
- [💻 Local Development](#-local-development)
  - [With Docker](#option-a-docker-recommended)
  - [Without Docker](#option-b-manual-setup)
- [🔐 Default Login](#-default-login)
- [🌐 API Reference](#-api-reference)
- [📁 Project Structure](#-project-structure)

---

## ✨ Features

| Category | Modules | Description |
|---|---|---|
| 🏥 **Clinical** | Patients, Doctors, EMR, Admissions, OT | Full patient lifecycle management |
| 💊 **Pharmacy** | Billing POS, Inventory, Purchases | GST-compliant pharmacy billing with barcode search |
| 🔬 **Diagnostics** | Laboratory, Blood Bank | Lab test orders & blood inventory |
| 🚑 **Emergency** | Ambulance & Transport | Fleet dispatch & GPS ETA tracking |
| 👥 **HR** | Staff, Payroll, Appointments | Employee management & scheduling |
| 💰 **Finance** | Master Billing, Discharge, Reports | Consolidated patient accounts & analytics |
| 🔄 **Data** | Excel Import/Export | Bulk data operations |
| 🔐 **Auth** | Staff + Patient Portal | Dual-panel JWT authentication |

### 🌟 Key Highlights
- ⚡ **Keyboard shortcuts** — F2 to search, F9 to generate bill, Esc to close
- 📊 **Real-time dashboard** — Live KPIs: doctors, staff, rooms, active patients
- 📄 **PDF generation** — Invoices, discharge summaries, lab reports
- 🆔 **Smart Patient IDs** — Unique format: `AB-0000-NH-DOC-0000-x0`
- 🌙 **Dark mode** — Premium glassmorphism UI
- 📱 **Responsive** — Works on desktop and tablet

---

## 📸 Module Screenshots

### 🔐 Login — Staff Gateway & Patient Vault
> Dual glassmorphism panels — staff JWT login + patient ID portal

![Login Page](screenshots/01_login.png)

---

### 📊 Hospital Command Center (Dashboard)
> Live KPIs: 50 doctors • 98 staff • 1,424 rooms • real-time occupancy

![Dashboard](screenshots/02_dashboard.png)

---

### 👤 Patient Registry
> Full CRUD with smart search, admission tracking, custom Patient IDs, and room assignment

![Patients](screenshots/03_patients.png)

---

### 🩺 Doctors
> Doctor profiles, specializations, department assignment, and availability management

![Doctors](screenshots/04_doctors.png)

---

### 👥 Staff Management
> HR portal — roles, departments, contact info, and employee records

![Staff](screenshots/05_staff.png)

---

### 🛏️ Room Registry
> 1,500+ room inventory with bed availability, ward types, and real-time occupancy status

![Rooms](screenshots/06_rooms.png)

---

### 📅 Appointments
> Appointment booking with doctor-patient mapping and scheduling calendar

![Appointments](screenshots/07_appointments.png)

---

### 🏨 IPD Admissions
> Inpatient admission management with room/doctor assignment and status tracking

![Admissions](screenshots/08_admissions.png)

---

### 📋 Clinical EMR
> Electronic Medical Records — consultations, prescriptions, clinical notes, diagnoses

![EMR](screenshots/09_emr.png)

---

### 🔪 Operation Theatre
> OT scheduling, surgical team assignment, and procedure tracking

![Operation Theatre](screenshots/10_operation_theatre.png)

---

### 🔬 Laboratory
> Lab test orders, result management, category tracking, and cost billing

![Laboratory](screenshots/11_laboratory.png)

---

### 💊 Pharmacy
> Medicine dispensing, prescription fulfillment, and outpatient drug management

![Pharmacy](screenshots/12_pharmacy.png)

---

### 🩸 Blood Bank
> Blood group inventory, donor records, and transfusion management

![Blood Bank](screenshots/13_blood_bank.png)

---

### 🚑 Ambulance & Emergency Transport
> Fleet management, dispatch coordination, driver assignment, and ETA tracking

![Ambulance](screenshots/14_ambulance.png)

---

### 🧾 Pharmacy Billing (POS)
> Full POS with barcode medicine search, GST auto-calc, cart management, PDF invoice, and cash/UPI/card payment

![Billing](screenshots/15_billing.png)

---

### 💰 Master Billing & Discharge
> Consolidated final account — all consultations + lab + pharmacy + ambulance rolled into discharge receipt with PDF export

![Master Billing](screenshots/16_master_billing.png)

---

### 📦 Medicine Inventory
> Stock management, expiry tracking, low-stock alerts, and category filtering

![Inventory](screenshots/17_inventory.png)

---

### 🛒 Purchases & Procurement
> Supplier management, purchase orders, GRN, and procurement tracking

![Purchases](screenshots/18_purchases.png)

---

### 💼 HR & Payroll
> Employee salary slips, payroll processing, and attendance management

![HR Payroll](screenshots/19_payroll.png)

---

### 📈 Reports & Analytics
> Revenue analytics, occupancy rates, department performance, and financial summaries

![Reports](screenshots/20_reports.png)

---

### 📊 Excel Import / Export
> Bulk data operations — import patients, medicines, staff; export any module to Excel

![Excel](screenshots/21_excel.png)

---

### ⚙️ Settings
> System configuration, hospital profile, user preferences, and security settings

![Settings](screenshots/22_settings.png)

---

### 📜 Patient History
> Full longitudinal record — all visits, diagnoses, medications, and test results in one view

![Patient History](screenshots/23_patient_history.png)

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 19 + TypeScript | UI framework |
| **Build Tool** | Vite 8 | Fast builds & dev server |
| **Styling** | Custom CSS + Framer Motion | Dark mode, animations |
| **State** | Zustand | Auth & global state |
| **Backend** | Django 5 + DRF | REST API |
| **Database** | MongoDB Atlas | Cloud NoSQL database |
| **Auth** | JWT (SimpleJWT) | Token-based authentication |
| **PDF** | jsPDF + autoTable | Invoice & receipt generation |
| **Icons** | Lucide React | Icon library |
| **Charts** | Recharts | Analytics visualizations |
| **Frontend Deploy** | Netlify | Static hosting with CDN |
| **Backend Deploy** | Render | Docker-based hosting |
| **Containerization** | Docker + Compose | Local development |

---

## 🚀 Quick Deploy

### Backend → Render *(5 minutes)*

> Render hosts the Django API as a Docker container. MongoDB Atlas is your database (already configured).

**Step 1 — Create Render Account**
1. Go to [render.com](https://render.com) → Sign up with GitHub

**Step 2 — New Web Service**
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repo: `lomashsrivastava/Nitin-Hospital-App`
3. Select the repository and click **"Connect"**

**Step 3 — Configure the Service**

| Setting | Value |
|---|---|
| **Name** | `nitin-hospital-backend` |
| **Runtime** | `Docker` |
| **Dockerfile Path** | `./backend/Dockerfile` |
| **Docker Context** | `./backend` |
| **Plan** | `Free` |

**Step 4 — Add Environment Variables**

In Render → **Environment** tab, add these:

| Variable | Value |
|---|---|
| `MONGODB_URI` | `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?appName=Cluster0` *(get from MongoDB Atlas → Connect)* |
| `DB_NAME` | `nitin_medical` |
| `DJANGO_SECRET_KEY` | *(click "Generate" for a random key)* |
| `DJANGO_DEBUG` | `False` |
| `DJANGO_ALLOWED_HOSTS` | `.onrender.com,localhost` |
| `CORS_ALLOWED_ORIGINS` | *(add after Netlify deploy — your Netlify URL)* |

**Step 5 — Deploy**
1. Click **"Create Web Service"**
2. Wait ~3-5 minutes for Docker build
3. Your API will be live at: `https://nitin-hospital-backend.onrender.com`

> ⚠️ **Free tier note:** Render free services spin down after 15 min of inactivity. First request may take ~30s to wake up.

---

### Frontend → Netlify *(3 minutes)*

> Netlify builds and hosts the React app as a static site.

**Step 1 — Create Netlify Account**
1. Go to [netlify.com](https://netlify.com) → Sign up with GitHub

**Step 2 — Import Repository**
1. Click **"Add new site"** → **"Import an existing project"**
2. Choose **GitHub** → Select `lomashsrivastava/Nitin-Hospital-App`

**Step 3 — Configure Build**

Netlify auto-detects from `netlify.toml` — just verify:

| Setting | Value |
|---|---|
| **Base directory** | `frontend` |
| **Build command** | `npm install && npm run build` |
| **Publish directory** | `frontend/dist` |

**Step 4 — Add Environment Variables**

In Netlify → **Site Settings → Environment Variables**, add:

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://nitin-hospital-backend.onrender.com` |

> 📌 Replace with your actual Render URL from Step above

**Step 5 — Deploy**
1. Click **"Deploy site"**
2. Wait ~2 minutes for build
3. Your app will be live at: `https://your-site.netlify.app`

**Step 6 — Update CORS on Render**
1. Go back to Render → Environment Variables
2. Set `CORS_ALLOWED_ORIGINS` = `https://your-site.netlify.app`
3. Redeploy backend

---

## 💻 Local Development

### Option A: Docker *(Recommended)*

```bash
# 1. Clone the repository
git clone https://github.com/lomashsrivastava/Nitin-Hospital-App.git
cd Nitin-Hospital-App

# 2. Create environment file
cp .env.example .env
# Edit .env and add your MONGODB_URI

# 3. Start everything
docker-compose up --build

# App is now running at:
# Frontend → http://localhost:3000
# Backend  → http://localhost:8000
```

### Option B: Manual Setup

**Backend (Django)**
```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env → add MONGODB_URI

# Run migrations
python manage.py migrate

# Create admin user
python ensure_user.py

# Start server
python manage.py runserver
# API runs at: http://localhost:8000
```

**Frontend (React/Vite)**
```bash
cd frontend

# Install dependencies
npm install

# Start dev server (proxies /api to localhost:8000)
npm run dev
# App runs at: http://localhost:5173
```

---

## 🔐 Default Login

| Role | Username | Password |
|---|---|---|
| **Staff / Admin** | `admin@nitinhospital.com` | `admin@nitinhospital.com` |
| **Patient** | Enter Patient ID | Format: `AB-0000-NH-DOC-0000-x0` |

> ⚠️ **Change the password immediately after first login** in Settings → Security

---

## 🌐 API Reference

Base URL: `https://nitin-hospital-backend.onrender.com/api`

| Endpoint | Method | Description |
|---|---|---|
| `/auth/login/` | POST | Get JWT tokens |
| `/auth/refresh/` | POST | Refresh access token |
| `/auth/profile/` | GET | Current user profile |
| `/hospital/patients/` | GET/POST | Patient CRUD |
| `/hospital/doctors/` | GET/POST | Doctor management |
| `/hospital/staff/` | GET/POST | Staff management |
| `/hospital/rooms/` | GET/POST | Room registry |
| `/hospital/appointments/` | GET/POST | Appointment booking |
| `/hospital/lab-tests/` | GET/POST | Laboratory tests |
| `/hospital/ambulance-dispatch/` | GET/POST | Ambulance dispatch |
| `/billing/invoices/` | GET/POST | Pharmacy billing |
| `/inventory/medicines/` | GET/POST | Medicine inventory |
| `/inventory/medicines/search/` | GET | Medicine search |
| `/purchases/orders/` | GET/POST | Purchase orders |
| `/reports/summary/` | GET | Financial reports |
| `/excel/export/` | GET | Excel data export |

All endpoints (except auth) require: `Authorization: Bearer <token>`

---

## 📁 Project Structure

```
Nitin-Hospital-App/
│
├── 📄 docker-compose.yml        # Local development (Docker)
├── 📄 Dockerfile                # Frontend container
├── 📄 netlify.toml              # Netlify deployment config
├── 📄 render.yaml               # Render deployment config
├── 📄 .env.example              # Environment variables template
│
├── 🐍 backend/
│   ├── 📄 Dockerfile            # Backend container (for Render)
│   ├── 📄 build.sh              # Render build script
│   ├── 📄 Procfile              # Process definition
│   ├── 📄 requirements.txt      # Python dependencies
│   ├── 📄 manage.py
│   ├── 📄 ensure_user.py        # Auto-create admin user
│   │
│   ├── 🗂️ nitin_billing/        # Django project settings
│   ├── 🗂️ authentication/       # JWT auth, login, profile
│   ├── 🗂️ hospital/             # Core: patients, doctors, rooms, etc.
│   ├── 🗂️ billing/              # Pharmacy invoices & payments
│   ├── 🗂️ inventory/            # Medicine stock management
│   ├── 🗂️ purchases/            # Procurement & suppliers
│   ├── 🗂️ reports/              # Analytics & reporting
│   └── 🗂️ excel_handler/        # Import/export utilities
│
├── ⚛️  frontend/
│   ├── 📄 package.json
│   ├── 📄 vite.config.ts        # Vite + dev proxy config
│   └── 🗂️ src/
│       ├── 🗂️ pages/            # 23 feature pages
│       ├── 🗂️ components/       # AppLayout, Sidebar, shared UI
│       ├── 🗂️ api/              # Axios instance & helpers
│       ├── 🗂️ store/            # Zustand auth stores
│       └── 🗂️ types/            # TypeScript interfaces
│
└── 🖼️  screenshots/              # All 23 module screenshots
    ├── 01_login.png
    ├── 02_dashboard.png
    └── ...
```

---

## 📜 License

This project is proprietary software developed for **Nitin Hospital Medical Center**.

---

<div align="center">

**Made with ❤️ for better healthcare management**

[🌐 Live Demo](https://nitinhospital.netlify.app) • [🔌 API](https://nitin-hospital-backend.onrender.com) • [📧 Contact](mailto:info@nitinhospital.com)

</div>
