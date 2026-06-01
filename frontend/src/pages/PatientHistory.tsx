import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  History, Search, Download, Trash2, Calendar, User, Users,
  Stethoscope, Bed, Receipt, ChevronRight, Activity, ArrowRight, AlertTriangle
} from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function PatientHistory() {
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [history, setHistory] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [purgeInput, setPurgeInput] = useState('');

  const fetchPatients = async () => {
    try {
      const res = await api.get('/hospital/patients/');
      setPatients(res.data?.results || res.data || []);
    } catch (err) {
      toast.error('Failed to load patients');
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const loadHistory = async (patient: any) => {
    setLoading(true);
    try {
      const res = await api.get(`/hospital/patients/${patient.id}/history/`);
      setHistory(res.data);
      setSelectedPatient(patient);
    } catch (err) {
      toast.error('Failed to load patient history');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (patientId: string, patientName: string) => {
    try {
      const response = await api.get(`/excel/export/patient-history/${patientId}/`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new File([response.data], `History_${patientName}.xlsx`));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `History_${patientName}_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      toast.success('Excel Report Generated');
    } catch (err) {
      toast.error('Export failed');
    }
  };

  const handlePurge = async () => {
    if (purgeInput !== selectedPatient.name) {
      toast.error('Patient name mismatch');
      return;
    }

    try {
      await api.delete(`/hospital/patients/${selectedPatient.id}/purge/`);
      toast.success('Patient History Purged Successfully');
      setShowPurgeConfirm(false);
      setSelectedPatient(null);
      setHistory(null);
      fetchPatients();
    } catch (err) {
      toast.error('Purge operation failed');
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.contact_number.includes(searchTerm)
  );

  const getTimeline = () => {
    if (!history) return [];
    
    const items: any[] = [];
    
    history.consultations?.forEach((c: any) => items.push({
      date: new Date(c.created_at),
      type: 'CONSULT',
      title: `Consultation with Dr. ${c.doctor_name || 'Medical Team'}`,
      detail: c.diagnosis || 'General Checkup',
      icon: Stethoscope,
      color: '#6366f1'
    }));

    history.admissions?.forEach((a: any) => items.push({
      date: new Date(a.admission_time),
      type: 'ADMISSION',
      title: `Admitted to Room ${a.room_number}`,
      detail: `Status: ${a.status}`,
      icon: Bed,
      color: '#ec4899'
    }));

    history.invoices?.forEach((i: any) => items.push({
      date: new Date(i.created_at),
      type: 'BILL',
      title: `Invoice Generated: ₹${i.net_amount}`,
      detail: `Status: ${i.status}`,
      icon: Receipt,
      color: '#10b981'
    }));

    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  return (
    <div style={{ height: '100%', display: 'flex', gap: '2rem' }}>
      {/* Left: Patient List */}
      <div style={{ width: 350, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={20} color="var(--primary)" /> Patients
          </h2>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" className="input" placeholder="Search patients..." 
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredPatients.map(p => (
            <motion.button
              key={p.id}
              whileHover={{ x: 5 }}
              onClick={() => loadHistory(p)}
              className="card"
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '1rem',
                cursor: 'pointer',
                borderLeft: selectedPatient?.id === p.id ? '4px solid var(--primary)' : '1px solid var(--border)',
                background: selectedPatient?.id === p.id ? 'var(--bg-tertiary)' : 'var(--bg-secondary)'
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                <span>{p.contact_number}</span>
                <span>{p.gender} | {p.age}y</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Right: History Ledger */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', overflow: 'hidden' }}>
        {selectedPatient ? (
          <>
            <div className="card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }} className="text-gradient">
                  {selectedPatient.name}'s History
                </h1>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.875rem' }}>Full clinical and financial journal</p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => handleExport(selectedPatient.id, selectedPatient.name)}
                >
                  <Download size={18} /> Export Excel
                </button>
                <button 
                  className="btn btn-danger" 
                  style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', border: '1px solid var(--error)' }}
                  onClick={() => setShowPurgeConfirm(true)}
                >
                  <Trash2 size={18} /> Archive & Purge
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
                  <div className="loading-spinner"></div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 0' }}>
                  {getTimeline().length > 0 ? (
                    getTimeline().map((item, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        style={{ display: 'flex', gap: '1.5rem', position: 'relative' }}
                      >
                        {/* Timeline Marker */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 40 }}>
                          <div style={{ 
                            width: 32, height: 32, borderRadius: '50%', backgroundColor: `${item.color}20`, 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color,
                            zIndex: 2, border: `2px solid ${item.color}`
                          }}>
                            <item.icon size={16} />
                          </div>
                          {idx !== getTimeline().length - 1 && (
                            <div style={{ width: 2, flex: 1, background: 'var(--border)', margin: '0.5rem 0' }}></div>
                          )}
                        </div>

                        {/* Event Content */}
                        <div className="card" style={{ flex: 1, padding: '1.25rem', marginBottom: '1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                {item.date.toLocaleDateString()} at {item.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{item.title}</h3>
                              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{item.detail}</p>
                            </div>
                            <div className="badge" style={{ background: `${item.color}10`, color: item.color, border: `1px solid ${item.color}30` }}>
                              {item.type}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
                      No history found for this patient.
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <History size={64} strokeWidth={1} style={{ marginBottom: '1.5rem', opacity: 0.3 }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Select a Patient</h2>
            <p>Choose a patient from the list to view their complete clinical & financial history.</p>
          </div>
        )}
      </div>

      {/* Archive & Purge Master Modal */}
      <AnimatePresence>
        {showPurgeConfirm && (
          <div className="success-overlay" style={{ zIndex: 110 }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="card" style={{ width: '100%', maxWidth: 500, padding: '2.5rem', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <div style={{ padding: '1.25rem', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)' }}>
                  <AlertTriangle size={48} />
                </div>
              </div>
              
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--error)' }}>Final Warning: Purge History</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                This operation will **permanently delete** {selectedPatient?.name}'s entire medical journey, including admissions, bills, and prescriptions from the active system.
              </p>

              <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius)', marginBottom: '1.5rem', textAlign: 'left' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>To confirm, please type the patient's name:</p>
                <input 
                  type="text" className="input" placeholder={selectedPatient?.name} 
                  value={purgeInput} onChange={e => setPurgeInput(e.target.value)}
                  style={{ borderColor: purgeInput === selectedPatient?.name ? 'var(--primary)' : 'var(--border)' }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowPurgeConfirm(false)}>Cancel</button>
                <button 
                  className="btn btn-danger" 
                  style={{ flex: 2, background: 'var(--error)' }} 
                  disabled={purgeInput !== selectedPatient?.name}
                  onClick={() => {
                    handleExport(selectedPatient.id, selectedPatient.name);
                    handlePurge();
                  }}
                >
                  Download & Purge Forever
                </button>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
                * A complete history file will be downloaded before deletion.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
