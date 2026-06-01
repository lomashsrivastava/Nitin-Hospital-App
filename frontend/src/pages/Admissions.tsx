import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bed, Activity, DoorOpen, Plus, Search, Calendar, User, UserPlus, Clock, LogOut, Trash2 } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function Admissions() {
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedAdmId, setSelectedAdmId] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const [formData, setFormData] = useState({
    patient: '',
    room: '',
    admitting_doctor: '',
    status: 'ADMITTED'
  });

  const fetchData = async () => {
    try {
      const [resAdmissions, resPatients, resRooms, resDoctors] = await Promise.all([
        api.get('/hospital/admissions/'),
        api.get('/hospital/patients/'),
        api.get('/hospital/rooms/?unoccupied=true'), // Get vacant rooms
        api.get('/hospital/doctors/')
      ]);
      setAdmissions(resAdmissions.data?.results || resAdmissions.data || []);
      setPatients(resPatients.data?.results || resPatients.data || []);
      setRooms(resRooms.data?.results || resRooms.data || []);
      setDoctors(resDoctors.data?.results || resDoctors.data || []);
    } catch {
      toast.error('Failed to load admissions data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDischarge = async (id: any) => {
    try {
      const rid = String(id?.id || id);
      await api.patch(`/hospital/admissions/${rid}/`, { status: 'DISCHARGED', discharge_time: new Date().toISOString() });
      toast.success('Patient Discharged Successfully');
      setShowConfirmModal(false);
      fetchData();
    } catch {
      toast.error('Failed to discharge');
    }
  };

  const handleDelete = async (id: any) => {
    const rid = String(id?.id || id);
    if(!window.confirm('Are you sure you want to delete this admission record permanently?')) return;
    try {
      await api.delete(`/hospital/admissions/${rid}/`);
      toast.success('Admission Record Deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete record');
    }
  };

  const handleAdmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        admitting_doctor: formData.admitting_doctor || null,
        patient: String(formData.patient),
        room: String(formData.room)
      };
      await api.post('/hospital/admissions/', payload);
      toast.success('Patient Admitted successfully!');
      setShowModal(false);
      setFormData({ patient: '', room: '', admitting_doctor: '', status: 'ADMITTED' });
      fetchData();
    } catch {
      toast.error('Failed to admit patient');
    }
  };

  const filteredAdm = admissions.filter(a => 
    (a.patient_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.room_number || '').includes(searchTerm)
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DoorOpen size={28} className="text-gradient" style={{ color: 'var(--primary)' }} />
            <span className="text-gradient">Ward & Admissions</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Manage inpatient bed allocations and discharges.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> New Admission
        </button>
      </header>

      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', position: 'relative' }}>
        <Search size={18} style={{ position: 'absolute', left: '2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input 
          type="text" className="input" placeholder="Search by patient name or room number..." 
          value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
          style={{ paddingLeft: '2.5rem', width: '100%' }} 
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', flex: 1, overflowY: 'auto' }}>
        <AnimatePresence>
          {filteredAdm.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((adm, idx) => (
            <motion.div 
              key={adm.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: idx * 0.05 }}
              className="card" style={{ padding: '1.5rem', borderTop: adm.status === 'ADMITTED' ? '4px solid #10b981' : '4px solid #9ca3af' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={18} color="var(--primary)" /> {adm.patient_name || `Patient #${adm.patient}`}
                  </h3>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <span className={`badge ${adm.status === 'ADMITTED' ? 'badge-success' : 'badge-warning'}`}>{adm.status}</span>
                    <span className="badge badge-primary"><Bed size={12} style={{ marginRight: 4 }}/> Room {adm.room_number || adm.room}</span>
                  </div>
                </div>
              </div>
              
              <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                   <Calendar size={15} color="var(--text-muted)" /> Admitted: {new Date(adm.admission_time).toLocaleString()}
                </div>
                {adm.discharge_time && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                     <LogOut size={15} color="#f59e0b" /> Discharged: {new Date(adm.discharge_time).toLocaleString()}
                  </div>
                )}
              </div>

               {adm.status === 'ADMITTED' && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', textAlign: 'right' }}>
                  <button className="btn btn-secondary" onClick={() => { setSelectedAdmId(adm.id); setShowConfirmModal(true); }}>
                    <LogOut size={16} /> Mark Discharge
                  </button>
                </div>
              )}

              {adm.status === 'DISCHARGED' && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', textAlign: 'right' }}>
                  <button className="btn btn-ghost" style={{ color: 'var(--error)' }} onClick={() => handleDelete(adm.id)}>
                    <Trash2 size={16} /> Delete Record
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="success-overlay" style={{ zIndex: 110 }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="card" style={{ width: '100%', maxWidth: 400, padding: '2rem', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                <div style={{ padding: '1rem', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)' }}>
                  <LogOut size={32} />
                </div>
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Confirm Discharge</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Are you sure you want to discharge this patient? This will mark the bed as vacant.</p>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowConfirmModal(false)}>Cancel</button>
                <button className="btn btn-danger" style={{ flex: 1, background: 'var(--error)' }} onClick={() => selectedAdmId && handleDischarge(selectedAdmId)}>
                  Yes, Discharge
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {!loading && filteredAdm.length > ITEMS_PER_PAGE && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
          <button className="btn btn-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>Prev</button>
          <span style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', fontWeight: 600 }}>Page {currentPage} of {Math.ceil(filteredAdm.length / ITEMS_PER_PAGE)}</span>
          <button className="btn btn-secondary" disabled={currentPage === Math.ceil(filteredAdm.length / ITEMS_PER_PAGE)} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
        </div>
      )}

      {/* New Admission Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="success-overlay" style={{ zIndex: 100 }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="card" style={{ width: '100%', maxWidth: 500, padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Allocate Bed (Admit)</h2>
                <button onClick={() => setShowModal(false)} className="btn btn-ghost" style={{ padding: '0.5rem' }}>Cancel</button>
              </div>

              <form onSubmit={handleAdmit} style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label className="label">Select Patient</label>
                    <select required className="input select" value={formData.patient} onChange={e => {
                      const patientId = e.target.value;
                      const patient = patients.find(p => String(p.id?.id || p.id) === patientId);
                      setFormData({
                        ...formData, 
                        patient: patientId, 
                        admitting_doctor: patient?.assigned_doctor || ''
                      });
                    }}>
                    <option value="">-- Choose Patient --</option>
                    {patients.map(p => {
                        const pid = String(p.id?.id || p.id);
                        return <option key={pid} value={pid}>{p.name} ({p.contact_number})</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="label">Allocate Room / Bed</label>
                  <select required className="input select" value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})}>
                    <option value="">-- Choose Vacant Room --</option>
                    {rooms.map(r => {
                        const rid = String(r.id?.id || r.id);
                        return <option key={rid} value={rid}>Floor {r.floor} - Room {r.room_number} ({r.room_type})</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="label">Admitting Doctor</label>
                  <select className="input select" value={formData.admitting_doctor} onChange={e => setFormData({...formData, admitting_doctor: e.target.value})}>
                    <option value="">-- Primary Doctor --</option>
                    {doctors.map(d => {
                        const did = String(d.id?.id || d.id);
                        return <option key={did} value={did}>Dr. {d.name} ({d.specialization})</option>;
                    })}
                  </select>
                </div>
                
                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn-primary"><UserPlus size={18}/> Admit Patient</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
