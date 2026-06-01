import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Plus, CalendarDays, Search, Clock, User, CheckCircle, XCircle, Trash2, Download, Printer } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { generateCustomPatientId } from '../api/patientIdHelper';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import Barcode from 'react-barcode';

export default function Appointments() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ patient_name: '', contact_number: '', doctor: '', appointment_date: '', appointment_time: '' });
  const [completingApt, setCompletingApt] = useState<any | null>(null);
  const [assessmentData, setAssessmentData] = useState({ vitals_bp: '', vitals_pulse: '', vitals_temp: '', symptoms: '', diagnosis: '' });
  const [prescriptions, setPrescriptions] = useState<any[]>([{ medicine_name: '', dosage: '', frequency: '1-0-1', duration: '' }]);
  const [showSlip, setShowSlip] = useState(false);
  const [savedConsultation, setSavedConsultation] = useState<any | null>(null);
  const [pharmacyItems, setPharmacyItems] = useState<any[]>([]);
  const [filteredMeds, setFilteredMeds] = useState<any[]>([]);
  const [activeMedIndex, setActiveMedIndex] = useState<number | null>(null);
  const [orderedLabTest, setOrderedLabTest] = useState('');

  useEffect(() => {
    fetchAppointments();
    fetchDoctors();
    fetchPatients();
    fetchPharmacy();
  }, []);

  const fetchPharmacy = async () => {
    try {
      const res = await api.get('/hospital/pharmacy-items/');
      setPharmacyItems(res.data?.results || res.data || []);
    } catch (e) { }
  };

  const fetchPatients = async () => {
    try {
      const res = await api.get('/hospital/patients/');
      setPatients(res.data?.results || res.data || []);
    } catch (e) { }
  };

  const handleIdLookup = (idInput: string) => {
    if (!idInput.trim()) return;
    const sel = patients.find(p => generateCustomPatientId(p).toLowerCase() === idInput.trim().toLowerCase());
    if (sel) {
      const adm = new Date(sel.admission_date || Date.now());
      const booking = new Date(adm.getTime() + 3 * 60 * 60 * 1000);
      const bDate = booking.toISOString().split('T')[0];
      const bTime = `${String(booking.getHours()).padStart(2, '0')}:${String(booking.getMinutes()).padStart(2, '0')}`;
      
      setFormData({
        patient_name: sel.name,
        contact_number: sel.contact_number,
        doctor: sel.assigned_doctor || '',
        appointment_date: bDate,
        appointment_time: bTime
      });
      toast.success(`Matched Patient ${sel.name}! Auto-scheduled for +3 hours.`);
    }
  };

  const handleAssessmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingApt) return;
    try {
      let targetPatient = patients.find(p => String(p.contact_number) === String(completingApt.contact_number));
      if (!targetPatient) {
        const patRes = await api.post('/hospital/patients/', {
          name: completingApt.patient_name,
          contact_number: completingApt.contact_number,
          age: 30, 
          gender: 'M', 
          address: 'OPD Registered'
        });
        targetPatient = patRes.data;
        if (typeof fetchPatients === 'function') fetchPatients();
      }

      const vitalsStr = `BP: ${assessmentData.vitals_bp || 'N/A'} • Pulse: ${assessmentData.vitals_pulse || 'N/A'} • Temp: ${assessmentData.vitals_temp || 'N/A'}`;
      
      const conRes = await api.post('/hospital/consultations/', {
        patient: targetPatient.id?.id || targetPatient.id,
        doctor: completingApt.doctor?.id || completingApt.doctor || null,
        symptoms: assessmentData.symptoms,
        diagnosis: assessmentData.diagnosis,
        clinical_notes: vitalsStr,
        appointment: completingApt.id?.id || completingApt.id || null
      });

      const createdConsultation = conRes.data;
      setSavedConsultation({
        ...createdConsultation,
        patient_name: completingApt.patient_name,
        doctor_name: completingApt.doctor_name || 'Dr. Pankaj Dubey',
        vitals: vitalsStr,
        prescriptions: prescriptions.filter(p => p.medicine_name.trim()),
        orderedLabTest: orderedLabTest
      });

      for (const p of prescriptions) {
        if (p.medicine_name.trim()) {
          await api.post('/hospital/prescriptions/', {
            consultation: createdConsultation.id?.id || createdConsultation.id,
            medicine_name: p.medicine_name,
            dosage: p.dosage,
            frequency: p.frequency || '1-0-1',
            duration: p.duration
          });
        }
      }

      if (orderedLabTest.trim()) {
        await api.post('/hospital/lab-tests/', {
          patient: targetPatient.id?.id || targetPatient.id,
          test_name: orderedLabTest,
          test_date: new Date().toISOString().split('T')[0],
          status: 'PENDING'
        });
        setOrderedLabTest('');
      }

      const idStr = String(completingApt.id?.id || completingApt.id);
      await api.patch(`/hospital/appointments/${idStr}/`, { status: 'COMPLETED' });

      toast.success('Diagnostic report finalized.');
      setCompletingApt(null);
      setAssessmentData({ vitals_bp: '', vitals_pulse: '', vitals_temp: '', symptoms: '', diagnosis: '', medicine_name: '', dosage: '', duration: '', frequency: '' });
      setShowSlip(true);
      fetchAppointments();
    } catch (err) {
      toast.error('Failure finalizing records.');
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await api.get('/hospital/appointments/');
      setAppointments(res.data?.results || res.data || []);
    } catch (e) {
      toast.error('Failed to load appointments');
    }
  };

  const handleViewReport = async (apt: any) => {
    try {
      const conRes = await api.get('/hospital/consultations/');
      const conArr = conRes.data?.results || conRes.data || [];
      const targetCon = conArr.find((c: any) => String(c.appointment?.id || c.appointment) === String(apt.id?.id || apt.id));
      
      if (targetCon) {
        const presRes = await api.get('/hospital/prescriptions/');
        const presArr = presRes.data?.results || presRes.data || [];
        const targetPres = presArr.filter((p: any) => String(p.consultation?.id || p.consultation) === String(targetCon.id?.id || targetCon.id));

        const labRes = await api.get('/hospital/lab-tests/');
        const labArr = labRes.data?.results || labRes.data || [];
        const targetLab = labArr.find((l: any) => String(l.patient) === String(targetCon.patient) && (l.test_date === targetCon.created_at?.split('T')[0] || String(l.patient) === String(targetCon.patient)));

        setSavedConsultation({
          ...targetCon,
          patient_name: apt.patient_name,
          doctor_name: apt.doctor_name || 'Dr. Pankaj Dubey',
          vitals: targetCon.clinical_notes || 'N/A',
          prescriptions: targetPres,
          orderedLabTest: targetLab ? targetLab.test_name : ''
        });
        setShowSlip(true);
      } else {
        toast.error('Diagnostic slip unavailable.');
      }
    } catch (err) {
      toast.error('Unable to retrieve reports.');
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await api.get('/hospital/doctors/');
      setDoctors(res.data?.results || res.data || []);
    } catch (e) { }
  };

  const downloadPDF = async () => {
    const input = document.getElementById('patient-report-slip');
    if (!input) return;
    
    const oldTransform = input.style.transform;
    input.style.transform = 'none';

    try {
      const toastId = toast.loading('Generating PDF Slip...');
      const canvas = await html2canvas(input, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Consultation_${savedConsultation?.patient_name?.replace(/ /g, '_') || 'Slip'}.pdf`);
      
      toast.dismiss(toastId);
      toast.success('Slip downloaded successfully!');
    } catch (err) {
      toast.error('Failed to generate PDF');
    } finally {
      input.style.transform = oldTransform;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/hospital/appointments/', formData);
      toast.success('Appointment booked successfully!');
      setIsModalOpen(false);
      setFormData({ patient_name: '', contact_number: '', doctor: '', appointment_date: '', appointment_time: '' });
      fetchAppointments();
    } catch (e) {
      toast.error('Error booking appointment');
    }
  };

  const updateStatus = async (id: any, status: string) => {
    try {
      const idStr = String(id?.id || id);
      await api.patch(`/hospital/appointments/${idStr}/`, { status });
      toast.success(`Appointment ${status}`);
      fetchAppointments();
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  const deleteAppointment = async (id: any) => {
    if (!window.confirm('Are you sure you want to permanently delete this appointment?')) return;
    try {
      const idStr = String(id?.id || id);
      setAppointments(prev => prev.filter(a => String(a.id?.id || a.id) !== idStr));
      await api.delete(`/hospital/appointments/${idStr}/`);
      toast.success('Appointment deleted successfully');
    } catch (e) {
      toast.error('Failed to delete appointment');
      fetchAppointments();
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar color="#f43f5e" /> OPD Appointments
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Schedule and manage outpatient consultations</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsModalOpen(true)}
          style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={20} /> Book Appointment
        </motion.button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <AnimatePresence>
          {appointments.map((apt) => (
            <motion.div key={apt.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: apt.status === 'COMPLETED' ? '#10b981' : apt.status === 'CANCELLED' ? '#ef4444' : '#f59e0b' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem' }}>{apt.patient_name}</h3>
                  {(() => {
                    const pMatch = patients.find(p => String(p.contact_number) === String(apt.contact_number));
                    if (pMatch) {
                      return (
                        <div style={{ fontSize: '0.75rem', color: '#10b981', fontFamily: 'monospace', fontWeight: 700, marginTop: '0.25rem' }}>
                          ID: {generateCustomPatientId(pMatch)}
                        </div>
                      );
                    }
                    return null;
                  })()}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                    <User size={14} /> Dr. {apt.doctor_name || 'Unknown'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <div style={{ padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: apt.status === 'COMPLETED' ? 'rgba(16,185,129,0.1)' : apt.status === 'CANCELLED' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', color: apt.status === 'COMPLETED' ? '#10b981' : apt.status === 'CANCELLED' ? '#ef4444' : '#f59e0b' }}>
                    {apt.status}
                  </div>
                  {apt.status !== 'PENDING' && (
                    <button onClick={() => deleteAppointment(apt.id)} style={{ background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '0.25rem' }} title="Delete Appointment">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              {(() => {
                const pMatch = patients.find(p => String(p.contact_number) === String(apt.contact_number));
                const pIdStr = pMatch ? generateCustomPatientId(pMatch) : `PID-${String(apt.id).slice(-6).toUpperCase()}`;
                return (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '0.25rem', background: 'white', borderRadius: '6px', marginBottom: '1rem', opacity: 0.8 }}>
                    <Barcode value={pIdStr} height={30} width={1.1} fontSize={10} margin={2} />
                  </div>
                );
              })()}

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.5rem 0.75rem', borderRadius: '8px', flex: 1 }}>
                  <CalendarDays size={16} color="#f43f5e" />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{apt.appointment_date}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.5rem 0.75rem', borderRadius: '8px', flex: 1 }}>
                  <Clock size={16} color="#0ea5e9" />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{apt.appointment_time}</span>
                </div>
              </div>

              {apt.status === 'PENDING' && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setCompletingApt(apt)} style={{ flex: 1, padding: '0.5rem', border: '1px solid #10b981', background: 'transparent', color: '#10b981', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={16}/> Complete</button>
                  <button onClick={() => updateStatus(apt.id, 'CANCELLED')} style={{ flex: 1, padding: '0.5rem', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}><XCircle size={16}/> Cancel</button>
                </div>
              )}

              {apt.status === 'COMPLETED' && (
                <button onClick={() => handleViewReport(apt)} style={{ width: '100%', padding: '0.6rem', border: '1px solid #6366f1', background: 'rgba(99,102,241,0.05)', color: '#6366f1', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>👁️ View Slip</button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} style={{ position: 'relative', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
              <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><XCircle size={24} /></button>
              <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar color="#f43f5e"/> New Appointment</h2>
              
              <div style={{ marginBottom: '1.5rem', background: 'var(--bg-primary)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#f43f5e', fontSize: '0.85rem', fontWeight: 700 }}>Insert Patient ID (Auto-Sync)</label>
                <input 
                  type="text" 
                  placeholder="e.g. GN-2204-NH-DOC-4258-b87c" 
                  onChange={(e) => handleIdLookup(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: '#10b981', borderRadius: '8px', fontFamily: 'monospace', fontWeight: 700, marginBottom: '1.25rem', outline: 'none' }} 
                />

                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Or Select Registered Patient</label>
                <select onChange={(e) => {
                  const patientId = e.target.value;
                  const sel = patients.find(p => String(p.id?.id || p.id) === patientId);
                  if (sel) {
                    const adm = new Date(sel.admission_date || Date.now());
                    const booking = new Date(adm.getTime() + 3 * 60 * 60 * 1000);
                    const bDate = booking.toISOString().split('T')[0];
                    const bTime = `${String(booking.getHours()).padStart(2, '0')}:${String(booking.getMinutes()).padStart(2, '0')}`;
                    setFormData({
                      patient_name: sel.name,
                      contact_number: sel.contact_number,
                      doctor: sel.assigned_doctor || '',
                      appointment_date: bDate,
                      appointment_time: bTime
                    });
                  }
                }} style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px', outline: 'none' }}>
                  <option value="">-- Select Existing Patient (Optional) --</option>
                  {patients.map(p => {
                      const pid = String(p.id?.id || p.id);
                      return <option key={pid} value={pid}>{p.name} ({p.contact_number})</option>;
                  })}
                </select>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Patient Name</label>
                  <input required type="text" value={formData.patient_name} onChange={e => setFormData({...formData, patient_name: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Contact Number</label>
                  <input required type="text" value={formData.contact_number} onChange={e => setFormData({...formData, contact_number: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Assign Doctor</label>
                  <select required value={formData.doctor} onChange={e => setFormData({...formData, doctor: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px' }}>
                    <option value="">Select Doctor...</option>
                    {doctors.map(d => {
                        const did = String(d.id?.id || d.id);
                        return <option key={did} value={did}>Dr. {d.name} ({d.specialization})</option>;
                    })}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Date</label>
                    <input required type="date" value={formData.appointment_date} onChange={e => setFormData({...formData, appointment_date: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Time</label>
                    <input required type="time" value={formData.appointment_time} onChange={e => setFormData({...formData, appointment_time: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px' }} />
                  </div>
                </div>
                <button type="submit" style={{ marginTop: '1rem', background: 'linear-gradient(135deg, #f43f5e, #e11d48)', color: 'white', border: 'none', padding: '1rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Confirm Appointment</button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Assessment Modal for Completing Appointment */}
        {completingApt && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCompletingApt(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} style={{ position: 'relative', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
              <button onClick={() => setCompletingApt(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><XCircle size={24} /></button>
              <h2 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle color="#10b981"/> Diagnostic Assessment</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Finalizing consultation metrics for {completingApt.patient_name}</p>

              <form onSubmit={handleAssessmentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Vitals Section */}
                <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-primary)', fontSize: '0.9rem' }}>Patient Vitals</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>BP (e.g. 120/80)</label>
                      <input type="text" value={assessmentData.vitals_bp} onChange={e => setAssessmentData({...assessmentData, vitals_bp: e.target.value})} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '6px' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Pulse (bpm)</label>
                      <input type="text" value={assessmentData.vitals_pulse} onChange={e => setAssessmentData({...assessmentData, vitals_pulse: e.target.value})} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '6px' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Temp (°F)</label>
                      <input type="text" value={assessmentData.vitals_temp} onChange={e => setAssessmentData({...assessmentData, vitals_temp: e.target.value})} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '6px' }} />
                    </div>
                  </div>
                </div>

                {/* Symptoms & Diagnosis */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Symptoms</label>
                    <textarea required value={assessmentData.symptoms} onChange={e => setAssessmentData({...assessmentData, symptoms: e.target.value})} rows={3} style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px', resize: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Diagnosis</label>
                    <textarea required value={assessmentData.diagnosis} onChange={e => setAssessmentData({...assessmentData, diagnosis: e.target.value})} rows={3} style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px', resize: 'none' }} />
                  </div>
                </div>

                {/* Prescription Section */}
                <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0, color: '#10b981', fontSize: '1rem', fontWeight: 700 }}>💊 Prescribe Medications</h4>
                    <button 
                      type="button" 
                      onClick={() => setPrescriptions([...prescriptions, { medicine_name: '', dosage: '', frequency: '1-0-1', duration: '' }])}
                      style={{ padding: '0.4rem 0.8rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 700 }}
                    >
                      + Add Medicine
                    </button>
                  </div>

                  {prescriptions.map((p, idx) => (
                    <div key={idx} style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px dashed var(--border)', marginBottom: '1rem', position: 'relative' }}>
                      {prescriptions.length > 1 && (
                        <button 
                          type="button"
                          onClick={() => setPrescriptions(prescriptions.filter((_, i) => i !== idx))}
                          style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
                        >
                          Remove
                        </button>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <div style={{ position: 'relative' }}>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Medicine Name</label>
                          <input 
                            type="text" 
                            value={p.medicine_name} 
                            onChange={async e => {
                              const val = e.target.value;
                              const updated = [...prescriptions];
                              updated[idx].medicine_name = val;
                              setPrescriptions(updated);
                              if (val.trim().length >= 1) {
                                setActiveMedIndex(idx);
                                try {
                                  const res = await api.get(`/inventory/medicines/?search=${val}`);
                                  setFilteredMeds(res.data?.results || res.data || []);
                                } catch (err) {}
                              } else {
                                setFilteredMeds([]);
                                setActiveMedIndex(null);
                              }
                            }} 
                            style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '6px' }} 
                            placeholder="e.g. Paracetamol" 
                          />
                          
                          {activeMedIndex === idx && filteredMeds.length > 0 && (
                            <div style={{ position: 'absolute', background: 'var(--bg-secondary)', border: '1px solid var(--border)', width: '100%', zIndex: 50, maxHeight: '150px', overflowY: 'auto', borderRadius: '6px', boxShadow: '0 10px 20px rgba(0,0,0,0.5)' }}>
                              {filteredMeds.map(m => (
                                <div key={m.id} onClick={() => {
                                  const updated = [...prescriptions];
                                  updated[idx].medicine_name = m.name;
                                  setPrescriptions(updated);
                                  setFilteredMeds([]);
                                  setActiveMedIndex(null);
                                }} style={{ padding: '0.5rem', cursor: 'pointer', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>
                                  {m.name} ({m.category || 'Medicine'})
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Dosage</label>
                          <input 
                            type="text" 
                            value={p.dosage} 
                            onChange={e => {
                              const updated = [...prescriptions];
                              updated[idx].dosage = e.target.value;
                              setPrescriptions(updated);
                            }} 
                            style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '6px' }} 
                            placeholder="e.g. 500mg" 
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Frequency</label>
                          <input 
                            type="text" 
                            value={p.frequency} 
                            onChange={e => {
                              const updated = [...prescriptions];
                              updated[idx].frequency = e.target.value;
                              setPrescriptions(updated);
                            }} 
                            style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '6px' }} 
                            placeholder="e.g. 1-0-1" 
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Duration</label>
                          <input 
                            type="text" 
                            value={p.duration} 
                            onChange={e => {
                              const updated = [...prescriptions];
                              updated[idx].duration = e.target.value;
                              setPrescriptions(updated);
                            }} 
                            style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '6px' }} 
                            placeholder="e.g. 5 days" 
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <h4 style={{ margin: '1rem 0 0.5rem 0', color: '#3b82f6', fontSize: '0.9rem', fontWeight: 700 }}>🔬 Order Lab Test (Optional)</h4>
                  <input 
                    type="text" 
                    value={orderedLabTest} 
                    onChange={e => setOrderedLabTest(e.target.value)} 
                    style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '6px' }} 
                    placeholder="e.g. Blood Count (CBC), Thyroid T3/T4" 
                  />
                </div>

                <button type="submit" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', padding: '1rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', marginTop: '0.5rem' }}>Complete Assessment & Save</button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Printable Slip Modal */}
        {showSlip && savedConsultation && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.85)' }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', gap: '1rem', padding: '1rem 2rem', justifyContent: 'center', alignItems: 'center', zIndex: 201, background: '#111827', color: 'white', borderBottom: '1px solid #374151' }}>
              <span style={{ marginRight: 'auto', fontWeight: 800, fontSize: '1.25rem' }}>Diagnostic Report Slip</span>
              <button onClick={() => {
                const slip = document.getElementById('patient-report-slip');
                if (slip) slip.style.transform = slip.style.transform === 'scale(1)' ? 'scale(0.6)' : 'scale(1)';
              }} style={{ background: '#374151', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}>🔍 Toggle Zoom</button>
              <button onClick={() => window.print()} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.5rem 1.5rem', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>🖨️ Print</button>
              <button onClick={downloadPDF} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.5rem 1.5rem', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Download size={16}/> Download PDF</button>
              <button onClick={() => setShowSlip(false)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.5rem 1.5rem', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>Close</button>
            </div>

            {/* Scrollable Canvas */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '2rem' }} onClick={() => setShowSlip(false)}>
              
              {/* A4 Document Canvas */}
              <div 
                onClick={(e) => e.stopPropagation()} 
                style={{ transformOrigin: 'top center', transition: 'transform 0.3s', transform: 'scale(0.65)', paddingBottom: '3rem' }} 
                id="patient-report-slip"
              >
                <div style={{ background: 'white', width: '210mm', minHeight: '297mm', padding: '20mm', borderRadius: '4px', color: 'black', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', fontFamily: 'Arial, sans-serif', position: 'relative' }}>
                  
                  {/* Blue Official Stamp */}
                  <div style={{ position: 'absolute', top: '40mm', right: '25mm', width: '120px', height: '120px', borderRadius: '50%', border: '4px double #2563eb', color: '#2563eb', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-15deg)', opacity: 0.85, fontWeight: 900, fontSize: '0.8rem', letterSpacing: '1px', background: 'rgba(37, 99, 235, 0.02)', zIndex: 10 }}>
                    <div style={{ fontSize: '0.65rem', borderBottom: '1px solid #2563eb', paddingBottom: '2px', width: '80%', textAlign: 'center' }}>OFFICIAL</div>
                    <div style={{ padding: '4px 0', fontSize: '0.9rem' }}>NITIN</div>
                    <div style={{ fontSize: '0.75rem' }}>HOSPITAL</div>
                    <div style={{ fontSize: '0.6rem', borderTop: '1px solid #2563eb', paddingTop: '2px', width: '80%', textAlign: 'center', marginTop: '4px' }}>VERIFIED</div>
                  </div>

                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #1e293b', paddingBottom: '1rem', marginBottom: '2rem' }}>
                    <div>
                      <h1 style={{ margin: 0, fontSize: '2.25rem', color: '#1e293b', fontWeight: 900, letterSpacing: '1px' }}>NITIN HEALTHCARE</h1>
                      <p style={{ margin: '0.35rem 0 0 0', color: '#475569', fontSize: '1rem', fontWeight: 600 }}>Diagnostic Telemetry & Consultation Slip</p>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.95rem', color: '#475569', lineHeight: '1.5' }}>
                      <div><b>Date:</b> {new Date().toLocaleDateString()}</div>
                      <div><b>Time:</b> {new Date().toLocaleTimeString()}</div>
                    </div>
                  </div>

                  {/* Demographics */}
                  {(() => {
                    const pMatch = patients.find(p => String(p.id) === String(savedConsultation.patient));
                    const pIdStr = pMatch ? generateCustomPatientId(pMatch) : `PID-${String(savedConsultation.patient).slice(-6).toUpperCase()}`;
                    return (
                      <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1rem', border: '1px solid #e2e8f0', marginBottom: '2.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', flex: 1 }}>
                          <div><b>Patient Name:</b> {savedConsultation.patient_name}</div>
                          <div><b>Patient ID:</b> <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#10b981' }}>{pIdStr}</span></div>
                          <div><b>Assigned Clinician:</b> {savedConsultation.doctor_name}</div>
                          <div style={{ marginTop: '0.5rem' }}><b>Clinical Vitals:</b> <span style={{ color: '#2563eb', fontWeight: 700 }}>{savedConsultation.vitals}</span></div>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.5rem', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <Barcode value={pIdStr} height={40} width={1.2} fontSize={10} margin={5} />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Rx Symbol */}
                  <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#1e293b', fontFamily: 'Georgia, serif', marginBottom: '1rem' }}>Rx</div>
                  <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ borderBottom: '2px solid #cbd5e1', paddingBottom: '0.4rem', fontSize: '1.15rem', color: '#1e293b', marginBottom: '0.75rem', fontWeight: 800 }}>Clinical Summary</h3>
                    <div style={{ fontSize: '0.95rem', lineHeight: '1.5', color: '#334155', marginBottom: '1rem' }}>
                      <b>Chief Complaints / Symptoms:</b>
                      <p style={{ margin: '0.35rem 0 1rem 0', whiteSpace: 'pre-wrap', background: '#fdfdfd', padding: '0.6rem', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>{savedConsultation.symptoms}</p>

                      <b>Assessment & Diagnosis:</b>
                      <p style={{ margin: '0.35rem 0 0 0', whiteSpace: 'pre-wrap', background: '#fdfdfd', padding: '0.6rem', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>{savedConsultation.diagnosis}</p>
                    </div>
                  </div>

                  {/* Prescription */}
                  {((savedConsultation.prescriptions && savedConsultation.prescriptions.length > 0) || savedConsultation.medicine_name) && (
                    <div style={{ marginBottom: '2.5rem' }}>
                      <h3 style={{ borderBottom: '2px solid #cbd5e1', paddingBottom: '0.4rem', fontSize: '1.15rem', color: '#1e293b', marginBottom: '0.75rem', fontWeight: 800 }}>Recommended Therapeutics</h3>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                            <th style={{ padding: '0.6rem' }}>Medicine Name</th>
                            <th style={{ padding: '0.6rem' }}>Dosage</th>
                            <th style={{ padding: '0.6rem' }}>Frequency</th>
                            <th style={{ padding: '0.6rem' }}>Duration</th>
                          </tr>
                        </thead>
                        <tbody>
                          {savedConsultation.prescriptions && savedConsultation.prescriptions.length > 0 ? (
                            savedConsultation.prescriptions.map((p: any, i: number) => (
                              <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '0.6rem', fontWeight: 700 }}>{p.medicine_name}</td>
                                <td style={{ padding: '0.6rem' }}>{p.dosage}</td>
                                <td style={{ padding: '0.6rem' }}>{p.frequency}</td>
                                <td style={{ padding: '0.6rem' }}>{p.duration}</td>
                              </tr>
                            ))
                          ) : (
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '0.6rem', fontWeight: 700 }}>{savedConsultation.medicine_name}</td>
                              <td style={{ padding: '0.6rem' }}>{savedConsultation.dosage}</td>
                              <td style={{ padding: '0.6rem' }}>{savedConsultation.frequency || '1-0-1'}</td>
                              <td style={{ padding: '0.6rem' }}>{savedConsultation.duration}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Recommended Lab Diagnostics */}
                  {savedConsultation.orderedLabTest && (
                    <div style={{ marginBottom: '2.5rem' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e293b', fontSize: '1rem', fontWeight: 800 }}>Required Diagnostic Evaluations</h4>
                      <div style={{ background: '#f8fafc', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#2563eb', fontSize: '0.95rem', fontWeight: 700, display: 'inline-block' }}>
                        {savedConsultation.orderedLabTest}
                      </div>
                    </div>
                  )}

                  {/* Dual Signatures Footer (Relative Flow) */}
                  <div style={{ marginTop: '4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    
                    {/* Hospital Authority Block */}
                    <div style={{ textAlign: 'center', width: '200px' }}>
                      <div style={{ fontSize: '1.1rem', color: '#2563eb', fontWeight: 800, fontFamily: 'monospace', marginBottom: '0.5rem', letterSpacing: '2px', border: '1px solid rgba(37, 99, 235, 0.2)', padding: '0.25rem', background: '#f8fafc' }}>
                        APPROVED
                      </div>
                      <div style={{ borderTop: '2px solid #94a3b8', paddingTop: '0.5rem', fontSize: '0.85rem', color: '#1e293b', fontWeight: 700 }}>
                        Hospital Authority Sign
                      </div>
                    </div>

                    {/* Clinician Handwritten Signature */}
                    <div style={{ textAlign: 'center', width: '200px' }}>
                      <div style={{ fontFamily: "'Brush Script MT', 'Dancing Script', 'Georgia', cursive", fontSize: '1.6rem', color: '#0f172a', marginBottom: '0.5rem', transform: 'rotate(-3deg)', fontStyle: 'italic' }}>
                        {savedConsultation.doctor_name}
                      </div>
                      <div style={{ borderTop: '2px solid #94a3b8', paddingTop: '0.5rem', fontSize: '0.85rem', color: '#1e293b', fontWeight: 700 }}>
                        Treating Doctor
                      </div>
                    </div>

                  </div>

                </div>
              </div>
            </div>
          </div>
        )}
        
      </AnimatePresence>
    </div>
  );
}
