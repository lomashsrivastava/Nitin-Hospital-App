/**
 * App.tsx - Main application with routing
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { useEffect } from 'react';
import Login from './pages/Login';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Billing from './pages/Billing';
import Inventory from './pages/Inventory';
import Purchases from './pages/Purchases';
import Reports from './pages/Reports';
import ExcelImportExport from './pages/ExcelImportExport';
import Settings from './pages/Settings';
import Doctors from './pages/Doctors';
import Staff from './pages/Staff';
import Patients from './pages/Patients';
import Rooms from './pages/Rooms';
import Appointments from './pages/Appointments';
import Laboratory from './pages/Laboratory';
import Pharmacy from './pages/Pharmacy';
import BloodBank from './pages/BloodBank';
import AmbulanceTransport from './pages/AmbulanceTransport';
import EMR from './pages/EMR';
import Admissions from './pages/Admissions';
import OperationTheatre from './pages/OperationTheatre';
import HRPayroll from './pages/HRPayroll';
import PatientHistory from './pages/PatientHistory';
import MasterBilling from './pages/MasterBilling';
import PatientList from './pages/PatientList';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

import PatientDashboard from './pages/PatientDashboard';
import { usePatientAuthStore } from './store/patientAuthStore';

function PatientProtectedRoute({ children }: { children: React.ReactNode }) {
  const isPatientAuthenticated = usePatientAuthStore((s) => s.isPatientAuthenticated);
  if (!isPatientAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '10px',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/patient-portal" element={<PatientProtectedRoute><PatientDashboard /></PatientProtectedRoute>} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/patients" element={<Patients />} />
                  <Route path="/patients-detailed" element={<PatientList />} />
                  <Route path="/doctors" element={<Doctors />} />
                  <Route path="/staff" element={<Staff />} />
                  <Route path="/rooms" element={<Rooms />} />
                  <Route path="/appointments" element={<Appointments />} />
                  <Route path="/laboratory" element={<Laboratory />} />
                  <Route path="/pharmacy" element={<Pharmacy />} />
                  <Route path="/bloodbank" element={<BloodBank />} />
                  <Route path="/ambulance" element={<AmbulanceTransport />} />
                  <Route path="/emr" element={<EMR />} />
                  <Route path="/history" element={<PatientHistory />} />
                  <Route path="/admissions" element={<Admissions />} />
                  <Route path="/ot" element={<OperationTheatre />} />
                  <Route path="/payroll" element={<HRPayroll />} />
                  <Route path="/billing" element={<Billing />} />
                  <Route path="/master-billing" element={<MasterBilling />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/purchases" element={<Purchases />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/excel" element={<ExcelImportExport />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AppLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
