import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Search, Plus, Calendar, FileText, Pill, Save, X, User, Trash2,
  Stethoscope, Thermometer, ClipboardList, Info, AlertCircle, Printer, Download
} from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { generateCustomPatientId } from '../api/patientIdHelper';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function EMR() {
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewConsultationModal, setShowNewConsultationModal] = useState(false);
  const [medSearch, setMedSearch] = useState('');
  const [selectedConsultationDetails, setSelectedConsultationDetails] = useState<any | null>(null);
  
  // New Consultation Form States
  const [newConsultation, setNewConsultation] = useState({
    doctor: '',
    symptoms: '',
    diagnosis: '',
    clinical_notes: ''
  });
  
  // Prescriptions for new consultation
  const [prescriptions, setPrescriptions] = useState([{ medicine_name: '', dosage: '', frequency: '', duration: '' }]);

  const emrRef = useRef<HTMLDivElement>(null);

  const downloadEMRPDF = async () => {
    const input = emrRef.current;
    if (!input) return;
    
    try {
      const toastId = toast.loading('Compiling Medical File...');
      const canvas = await html2canvas(input, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const pName = activePatient?.name || 'Patient';
      pdf.save(`EMR_Summary_${pName.replace(/ /g, '_')}.pdf`);
      
      toast.dismiss(toastId);
      toast.success('Full EMR File Downloaded!');
    } catch (err) {
      toast.error('Failed to build historical log.');
    }
  };

  const fetchData = async () => {
    try {
      const [patientsRes, doctorsRes, medsRes] = await Promise.all([
        api.get('/hospital/patients/'),
        api.get('/hospital/doctors/'),
        api.get('/inventory/medicines/')
      ]);
      setPatients(patientsRes.data?.results || patientsRes.data || []);
      setDoctors(doctorsRes.data?.results || doctorsRes.data || []);
      setMedicines(medsRes.data?.results || medsRes.data || []);
    } catch (err: any) {
      toast.error('Clinical data sync failed');
    }
  };

  useEffect(() => { fetchData(); }, []);

  const loadPatientConsultations = async (patientId: any) => {
    try {
      const idStr = String(patientId?.id || patientId);
      setSelectedPatientId(idStr);
      setConsultations([]); // Clear previous to prevent flash
      const res = await api.get(`/hospital/consultations/?patient=${idStr}`);
      setConsultations(res.data?.results || res.data || []);
    } catch (err) {
      toast.error('Failed to load patient history');
    }
  };

  const handleOpenNewConsultation = () => {
    if (!selectedPatientId) return;
    const patient = patients.find(p => String(p.id?.id || p.id) === selectedPatientId);
    setNewConsultation({
      doctor: String(patient?.assigned_doctor?.id || patient?.assigned_doctor || ''),
      diagnosis: patient?.ailment || '',
      symptoms: '', 
      clinical_notes: ''
    });
    setPrescriptions([{ medicine_name: '', dosage: '', frequency: '', duration: '' }]);
    setShowNewConsultationModal(true);
  };

  const handleSaveConsultation = async () => {
    if (!selectedPatientId || !newConsultation.doctor) {
      toast.error('Assigning Physician is mandatory');
      return;
    }
    
    try {
      const consultPayload = {
        patient: selectedPatientId,
        doctor: newConsultation.doctor,
        symptoms: newConsultation.symptoms,
        diagnosis: newConsultation.diagnosis,
        clinical_notes: newConsultation.clinical_notes
      };
      
      const consultRes = await api.post('/hospital/consultations/', consultPayload);
      const consultId = consultRes.data.id;

      // Batch prescriptions
      const validPrescriptions = prescriptions.filter(p => p.medicine_name.trim());
      if (validPrescriptions.length > 0) {
        await Promise.all(validPrescriptions.map(p => 
          api.post('/hospital/prescriptions/', { consultation: consultId, ...p })
        ));
      }

      toast.success('Clinical Record Finalized');
      setShowNewConsultationModal(false);
      loadPatientConsultations(selectedPatientId);
    } catch (err: any) {
      toast.error('Validation Error: Check all fields');
    }
  };

  const handleDeleteConsultation = async (id: any) => {
    if (!window.confirm('Permanently remove this clinical entry?')) return;
    try {
      const rid = String(id?.id || id);
      await api.delete(`/hospital/consultations/${rid}/`);
      toast.success('Record purged');
      setConsultations(prev => prev.filter(c => String(c.id?.id || c.id) !== rid));
    } catch {
      toast.error('Delete operation failed');
    }
  };

  const filteredPatients = patients.filter(p => 
    (p?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p?.contact_number || '').includes(searchQuery)
  );

  const activePatient = useMemo(() => 
    patients.find(p => String(p.id?.id || p.id) === selectedPatientId),
    [patients, selectedPatientId]
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden' }}>
      
      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <div style={{ padding: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '10px' }}>
              <Activity size={24} color="var(--primary)" />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>Clinical Records (EMR)</h1>
          </div>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.875rem' }}>Centralized patient health monitoring and diagnostics.</p>
        </div>
        {selectedPatientId && (
          <button className="btn btn-primary" onClick={handleOpenNewConsultation} style={{ padding: '0.75rem 1.5rem', borderRadius: '14px' }}>
            <Plus size={18} /> New Clinical Entry
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0 }}>
        
        {/* Patient Index Sidebar */}
        <div style={{ width: '320px', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', borderRadius: '20px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                 <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                 <input 
                   type="text" placeholder="Filter patient index..." 
                   className="input" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                   style={{ paddingLeft: '2.75rem', borderRadius: '12px' }}
                 />
              </div>
              <div style={{ position: 'relative' }}>
                 <input 
                   type="text" placeholder="Paste Patient ID to Sync..." 
                   className="input" 
                   style={{ borderRadius: '12px', fontSize: '0.85rem' }}
                   onChange={(e) => {
                     const pastedId = e.target.value.trim();
                     const foundPatient = patients.find(p => generateCustomPatientId(p) === pastedId);
                     if (foundPatient) {
                       const pid = String(foundPatient.id?.id || foundPatient.id);
                       loadPatientConsultations(pid);
                       toast.success(`Synced Patient: ${foundPatient.name}`);
                     }
                   }}
                 />
              </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }} className="custom-scrollbar">
            {filteredPatients.map(p => {
              const pid = String(p.id?.id || p.id);
              const isActive = selectedPatientId === pid;
              return (
                <button
                  key={pid} onClick={() => loadPatientConsultations(pid)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '1rem', border: 'none',
                    background: isActive ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                    borderRadius: '12px', cursor: 'pointer', marginBottom: '4px',
                    display: 'flex', alignItems: 'center', gap: '1rem', transition: 'all 0.2s'
                  }}
                >
                  <div style={{ width: 42, height: 42, borderRadius: '12px', background: isActive ? 'var(--primary)' : 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isActive ? 'white' : 'var(--text-muted)' }}>
                    <User size={20} />
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontWeight: 700, color: isActive ? 'var(--primary)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.contact_number}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Clinical History Viewport */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', borderRadius: '20px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          {!selectedPatientId ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
               <ClipboardList size={80} style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }} />
               <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Select Patient Record</h3>
               <p style={{ fontSize: '0.875rem' }}>Choose a patient from the left index to view history.</p>
            </div>
          ) : (
            <>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', background: 'rgba(99, 102, 241, 0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>{activePatient?.name}</h2>
                      <span className="badge badge-primary">ID: {selectedPatientId.slice(-6)}</span>
                   </div>
                   <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      <span>{activePatient?.age} Yrs • {activePatient?.gender}</span>
                      <span>{activePatient?.contact_number}</span>
                   </div>
                </div>

                {consultations.length > 0 && (
                  <button onClick={downloadEMRPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.6rem 1.25rem', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>
                    <Download size={18} /> Download History File
                  </button>
                )}
              </div>

              {/* ALWAYS VISIBLE VITALS PANEL */}
              {(() => {
                const latestWithVitals = consultations.find(c => c.clinical_notes && c.clinical_notes.includes('BP:'));
                if (!latestWithVitals) return null;
                
                const bpMatch = latestWithVitals.clinical_notes.match(/BP:\s*([^\s•]+)/);
                const pulseMatch = latestWithVitals.clinical_notes.match(/Pulse:\s*([^\s•]+)/);
                const tempMatch = latestWithVitals.clinical_notes.match(/Temp:\s*([^\s•]+)/);

                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', padding: '1.25rem', background: 'rgba(99, 102, 241, 0.03)', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <div style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', color: '#ef4444' }}><Activity size={20} /></div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>BLOOD PRESSURE</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ef4444' }}>{bpMatch ? bpMatch[1] : 'N/A'}</div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <div style={{ padding: '0.5rem', background: 'rgba(14, 165, 233, 0.1)', borderRadius: '8px', color: '#0ea5e9' }}><ClipboardList size={20} /></div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>PULSE RATE</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0ea5e9' }}>{pulseMatch ? pulseMatch[1] : 'N/A'} bpm</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <div style={{ padding: '0.5rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', color: '#f59e0b' }}><Thermometer size={20} /></div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>BODY TEMP</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b' }}>{tempMatch ? tempMatch[1] : 'N/A'} °F</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div ref={emrRef} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: '#f8fafc', color: '#1e293b' }} className="custom-scrollbar">

                {consultations.length === 0 ? (
                  <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Info size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                    <p>No prior clinical consultations recorded.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.25rem' }}>
                    {consultations.map((consult, idx) => (
                      <motion.div 
                        key={consult.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                        onClick={() => setSelectedConsultationDetails(consult)}
                        style={{ padding: '1.25rem', background: 'white', borderRadius: '16px', border: '1px solid var(--border)', cursor: 'pointer', position: 'relative', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                        whileHover={{ y: -4, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', borderColor: 'var(--primary)' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                           <div style={{ padding: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '10px', color: 'var(--primary)' }}>
                              <Calendar size={20} />
                           </div>
                           <div>
                              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>{new Date(consult.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Dr. {consult.doctor_name}</div>
                           </div>
                        </div>

                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>Diagnosis</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ef4444', marginBottom: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {consult.diagnosis || 'General Consultation'}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                           <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>View Details →</span>
                           <button onClick={(e) => { e.stopPropagation(); handleDeleteConsultation(consult.id); }} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }} title="Delete Record">
                              <Trash2 size={16} />
                           </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modern Side Drawer for New Record */}
      <AnimatePresence>
        {showNewConsultationModal && (
          <div className="modal-overlay" onClick={() => setShowNewConsultationModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(1px)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              onClick={e => e.stopPropagation()}
              style={{ width: '450px', height: '100%', background: 'var(--bg-secondary)', padding: '1.5rem', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 30px rgba(0,0,0,0.1)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Clinical Assessment</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                     <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                     <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary)' }}>{activePatient?.name}</span>
                  </div>
                </div>
                <button onClick={() => setShowNewConsultationModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingRight: '0.25rem' }} className="custom-scrollbar">
                <div>
                  <label className="label" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Consulting Physician</label>
                  <select required className="input select" value={newConsultation.doctor} onChange={e => setNewConsultation({...newConsultation, doctor: e.target.value})} style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem' }}>
                    <option value="">-- Assign Doctor --</option>
                    {doctors.map(d => <option key={d.id} value={String(d.id?.id || d.id)}>Dr. {d.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="label" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Symptoms</label>
                  <textarea className="input" rows={3} placeholder="Patient complaints..." value={newConsultation.symptoms} onChange={e => setNewConsultation({...newConsultation, symptoms: e.target.value})} style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem' }} />
                </div>

                <div>
                  <label className="label" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Diagnosis</label>
                  <textarea className="input" rows={3} placeholder="Clinical diagnosis..." value={newConsultation.diagnosis} onChange={e => setNewConsultation({...newConsultation, diagnosis: e.target.value})} style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem' }} />
                </div>

                <div>
                  <label className="label" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Clinical Notes / Vitals</label>
                  <input className="input" placeholder="BP, Pulse, Temp" value={newConsultation.clinical_notes} onChange={e => setNewConsultation({...newConsultation, clinical_notes: e.target.value})} style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem' }} />
                </div>

                <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Pill size={16} /> Prescriptions</h4>
                    <button type="button" className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setPrescriptions([...prescriptions, { medicine_name: '', dosage: '', frequency: '', duration: '' }])}>+ Add</button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {prescriptions.map((p, idx) => (
                      <div key={idx} style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', position: 'relative' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                           <div style={{ flex: 1, position: 'relative' }}>
                              <input 
                                className="input" placeholder="Search medicine..." 
                                value={p.medicine_name} 
                                onChange={e => {
                                  const newP = [...prescriptions]; newP[idx].medicine_name = e.target.value; setPrescriptions(newP);
                                  setMedSearch(e.target.value);
                                }} 
                                style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem' }}
                              />
                              {medSearch && p.medicine_name === medSearch && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '6px', zIndex: 10, maxHeight: '120px', overflowY: 'auto', boxShadow: 'var(--shadow-md)', marginTop: '2px' }}>
                                  {medicines.filter(m => m.name.toLowerCase().includes(medSearch.toLowerCase())).map(m => (
                                    <div key={m.id} onClick={() => {
                                      const newP = [...prescriptions]; newP[idx].medicine_name = m.name; setPrescriptions(newP); setMedSearch('');
                                    }} style={{ padding: '0.4rem 0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', fontSize: '0.8rem' }}>
                                       {m.name}
                                    </div>
                                  ))}
                                </div>
                              )}
                           </div>
                           {prescriptions.length > 1 && (
                             <button style={{ color: 'var(--error)', border: 'none', background: 'transparent', cursor: 'pointer' }} onClick={() => {
                                const newP = [...prescriptions]; newP.splice(idx, 1); setPrescriptions(newP);
                             }}><Trash2 size={16}/></button>
                           )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '0.35rem' }}>
                          <input className="input" placeholder="Dosage" value={p.dosage} onChange={e => { const newP = [...prescriptions]; newP[idx].dosage = e.target.value; setPrescriptions(newP); }} style={{ padding: '0.35rem', fontSize: '0.8rem' }} />
                          <input className="input" placeholder="Freq" value={p.frequency} onChange={e => { const newP = [...prescriptions]; newP[idx].frequency = e.target.value; setPrescriptions(newP); }} style={{ padding: '0.35rem', fontSize: '0.8rem' }} />
                          <input className="input" placeholder="Days" value={p.duration} onChange={e => { const newP = [...prescriptions]; newP[idx].duration = e.target.value; setPrescriptions(newP); }} style={{ padding: '0.35rem', fontSize: '0.8rem' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', padding: '1rem 0 0 0', borderTop: '1px solid var(--border)', marginTop: '1rem' }}>
                <button className="btn btn-secondary" style={{ flex: 1, padding: '0.6rem' }} onClick={() => setShowNewConsultationModal(false)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex: 2, padding: '0.6rem' }} onClick={handleSaveConsultation}>Save Assessment</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Consultation Details Modal Popup */}
      <AnimatePresence>
        {selectedConsultationDetails && (
          <div className="modal-overlay" onClick={() => setSelectedConsultationDetails(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '600px', maxWidth: '100%', background: 'white', padding: '2rem', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
            >
              <button onClick={() => setSelectedConsultationDetails(null)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={24} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                <div style={{ padding: '0.75rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', color: 'var(--primary)' }}><FileText size={24} /></div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>Clinical Consultation File</h3>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Dated: {new Date(selectedConsultationDetails.created_at).toLocaleDateString(undefined, { dateStyle: 'full' })}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Primary Symptoms</span>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: '#334155', fontWeight: 600 }}>{selectedConsultationDetails.symptoms || 'No documentation available.'}</p>
                </div>
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Diagnosis & Findings</span>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: '#ef4444', fontWeight: 700 }}>{selectedConsultationDetails.diagnosis || 'Standard clinical tracking.'}</p>
                </div>
              </div>

              {selectedConsultationDetails.clinical_notes && (
                <div style={{ background: '#fef2f2', padding: '1rem', borderRadius: '14px', border: '1px solid #fee2e2', color: '#991b1b', fontSize: '0.9rem', fontStyle: 'italic' }}>
                  <b>Clinical Notes / Vitals:</b> {selectedConsultationDetails.clinical_notes}
                </div>
              )}

              {selectedConsultationDetails.prescriptions && selectedConsultationDetails.prescriptions.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Pill size={18} color="var(--primary)" /> Prescribed Medications
                  </h4>
                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '14px', border: '1px solid #e2e8f0', maxHeight: '150px', overflowY: 'auto' }}>
                    {selectedConsultationDetails.prescriptions.map((p: any, pIdx: number) => (
                      <div key={pIdx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: pIdx < selectedConsultationDetails.prescriptions.length - 1 ? '1px dashed #e2e8f0' : 'none', fontSize: '0.9rem' }}>
                        <span style={{ fontWeight: 700, color: '#334155' }}>{p.medicine_name}</span>
                        <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{p.dosage} • {p.frequency} • {p.duration} Days</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Attending: <b>Dr. {selectedConsultationDetails.doctor_name}</b></div>
                <button className="btn btn-secondary" onClick={() => setSelectedConsultationDetails(null)} style={{ padding: '0.5rem 1.5rem', borderRadius: '10px' }}>Dismiss</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
