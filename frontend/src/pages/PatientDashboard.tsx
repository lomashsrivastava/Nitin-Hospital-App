import { usePatientAuthStore } from '../store/patientAuthStore';
import { motion } from 'framer-motion';
import { LogOut, Heart, Shield, IndianRupee, FileText, Calendar, Stethoscope, Bed } from 'lucide-react';

export default function PatientDashboard() {
  const { patientData, patientLogout } = usePatientAuthStore();

  if (!patientData) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        No valid diagnostic session mapped.
      </div>
    );
  }

  const { patient, consultations, admissions, invoices } = patientData;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', padding: '2rem' }}>
      
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Heart size={32} style={{ color: '#ef4444', animation: 'pulse 2s infinite' }} />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0 }}>Nitin Health Portal</h1>
        </div>
        <button 
          onClick={patientLogout}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.5rem 1rem', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
        >
          <LogOut size={18} /> Secure Exit
        </button>
      </div>

      {/* Profile Node */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '24px', border: '1px solid var(--border)', display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center', boxShadow: 'var(--shadow-md)', marginBottom: '2.5rem' }}
      >
        <div style={{ width: 80, height: 80, borderRadius: '24px', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', color: 'white', fontWeight: 800 }}>
          {(patient.name || 'P').charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{patient.name}</h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Age: {patient.age}Y • Gender: {patient.gender === 'M' ? 'Male' : 'Female'} • Phone: {patient.contact_number}
          </div>
          <div style={{ display: 'inline-block', marginTop: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.25rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, fontFamily: 'monospace' }}>
            PATIENT ID: {localStorage.getItem('patient_portal_id')}
          </div>
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        {/* Clinical Invoices */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="card" style={{ padding: '1.5rem', borderRadius: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem', color: '#10b981' }}>
            <IndianRupee size={22} /> Billing & Invoices
          </h3>
          {invoices.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No invoices settled or outstanding.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {invoices.map((inv: any) => (
                <div key={inv.id} style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>Invoice #{inv.invoice_number || inv.id}</span>
                    <span style={{ color: inv.is_paid ? '#10b981' : '#f59e0b' }}>
                      {inv.is_paid ? 'PAID' : 'PENDING'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Date: {new Date(inv.created_at).toLocaleDateString()}
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, marginTop: '0.5rem', color: 'var(--text-primary)' }}>
                    ₹{Number(inv.total_amount).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Consultations & Diagnosis */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="card" style={{ padding: '1.5rem', borderRadius: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem', color: '#6366f1' }}>
            <FileText size={22} /> Clinical Consultations
          </h3>
          {consultations.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No medical consultation history logged.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {consultations.map((con: any) => (
                <div key={con.id} style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                    <Stethoscope size={16} style={{ color: '#6366f1' }} />
                    <span>Dr. {con.doctor_name || 'Pankaj Dubey'}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Date: {new Date(con.created_at).toLocaleDateString()}
                  </div>
                  {con.symptoms && (
                    <div style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                      <b>Symptoms:</b> {con.symptoms}
                    </div>
                  )}
                  {con.diagnosis && (
                    <div style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: 'var(--text-primary)' }}>
                      <b>Diagnosis:</b> {con.diagnosis}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
