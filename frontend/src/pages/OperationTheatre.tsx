import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Calendar, Clock, Plus, Search, ShieldAlert, CheckCircle, Trash2, Users, X } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { generateCustomPatientId } from '../api/patientIdHelper';

export default function OperationTheatre() {
  const [surgeries, setSurgeries] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [otRooms, setOtRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    patient: '',
    lead_surgeon: '',
    ot_room: '',
    start_time: '',
    end_time: '',
    status: 'SCHEDULED'
  });

  const fetchData = async () => {
    try {
      const [resSurg, resPat, resDoc, resRooms] = await Promise.all([
        api.get('/hospital/surgeries/'),
        api.get('/hospital/patients/'),
        api.get('/hospital/doctors/'),
        api.get('/hospital/rooms/?unoccupied=true')
      ]);
      setSurgeries(resSurg.data?.results || resSurg.data || []);
      setPatients(resPat.data?.results || resPat.data || []);
      setDoctors(resDoc.data?.results || resDoc.data || []);
      
      const allRooms = resRooms.data?.results || resRooms.data || [];
      // Filter for clinical rooms only
      const clinicalRooms = allRooms.filter((r: any) => 
        !['STAFF_QUARTERS', 'DOCTOR_HOUSING', 'NURSE_QUARTERS', 'SECURITY_POST'].includes(r.room_type)
      );
      setOtRooms(clinicalRooms);
    } catch {
      toast.error('Failed to load OT data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(formData.start_time) >= new Date(formData.end_time)) {
      return toast.error('End time must be after start time');
    }

    try {
      await api.post('/hospital/surgeries/', formData);
      toast.success('Surgery successfully scheduled!');
      setShowModal(false);
      fetchData();
      setFormData({ patient: '', lead_surgeon: '', ot_room: '', start_time: '', end_time: '', status: 'SCHEDULED' });
    } catch (err: any) {
      toast.error('Failed to schedule surgery. Check conflicts.');
    }
  };

  const deleteSurgery = async (id: any) => {
    if(!window.confirm('Cancel this surgery schedule?')) return;
    try {
      const idStr = String(id?.id || id);
      setSurgeries(prev => prev.filter(s => String(s.id?.id || s.id) !== idStr));
      await api.delete(`/hospital/surgeries/${idStr}/`);
      toast.success('Surgery cancelled');
    } catch {
      toast.error('Deletion failed');
      fetchData();
    }
  };

  const updateStatus = async (id: any, newStatus: string) => {
    try {
      const idStr = String(id?.id || id);
      await api.patch(`/hospital/surgeries/${idStr}/`, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      fetchData();
    } catch { toast.error('Status update failed'); }
  };

  const filteredSurgeries = surgeries.filter(s => 
    (s.patient_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.lead_surgeon_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={28} className="text-gradient" style={{ color: 'var(--primary)' }} />
            <span className="text-gradient">Operation Theatre (OT)</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Manage surgical schedules, lead surgeons, and OT allocations.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Schedule Surgery
        </button>
      </header>

      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', position: 'relative' }}>
        <Search size={18} style={{ position: 'absolute', left: '2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input 
          type="text" className="input" placeholder="Search by patient or surgeon..." 
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          style={{ paddingLeft: '2.5rem', width: '100%' }} 
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.5rem', flex: 1, overflowY: 'auto', paddingBottom: '2rem' }}>
        <AnimatePresence>
          {filteredSurgeries.map((surg, idx) => (
            <motion.div 
              key={surg.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: idx * 0.03 }}
              className="card" style={{ 
                padding: '1.5rem', 
                borderLeft: surg.status === 'SCHEDULED' ? '4px solid #3b82f6' : 
                            surg.status === 'IN_PROGRESS' ? '4px solid #f59e0b' : 
                            surg.status === 'COMPLETED' ? '4px solid #10b981' : '4px solid #ef4444' 
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>
                     Patient: <span style={{ color: 'var(--primary)' }}>{surg.patient_name || `ID ${surg.patient}`}</span>
                  </h3>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <span className={`badge ${
                      surg.status === 'SCHEDULED' ? 'badge-primary' :
                      surg.status === 'IN_PROGRESS' ? 'badge-warning' :
                      surg.status === 'COMPLETED' ? 'badge-success' : 'badge-error'
                    }`}>{surg.status.replace('_', ' ')}</span>
                  </div>
                </div>
                <button className="btn-icon" onClick={() => deleteSurgery(surg.id)} style={{ color: 'var(--error)', background: 'transparent' }}>
                  <Trash2 size={16} />
                </button>
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                   <ShieldAlert size={16} color="var(--primary)" /> <b>Surgeon:</b> Dr. {surg.lead_surgeon_name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                   <Activity size={16} color="#8b5cf6" /> <b>OT Room:</b> {surg.ot_room_number || 'Unallocated Room'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-tertiary)', padding: '0.5rem', borderRadius: '4px' }}>
                   <Clock size={16} color="var(--text-muted)" /> 
                   <span>
                     {new Date(surg.start_time).toLocaleString()} 
                     <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>➔</span> 
                     {new Date(surg.end_time).toLocaleTimeString()}
                   </span>
                </div>
              </div>

              {surg.status !== 'COMPLETED' && surg.status !== 'CANCELLED' && (
                <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem' }}>
                  {surg.status === 'SCHEDULED' && (
                    <button className="btn btn-warning" style={{ flex: 1 }} onClick={() => updateStatus(surg.id, 'IN_PROGRESS')}>
                      Start Surgery
                    </button>
                  )}
                  {surg.status === 'IN_PROGRESS' && (
                    <button className="btn btn-success" style={{ flex: 1 }} onClick={() => updateStatus(surg.id, 'COMPLETED')}>
                       <CheckCircle size={16} /> Mark Complete
                    </button>
                  )}
                  <button className="btn btn-ghost" style={{ color: 'var(--error)' }} onClick={() => updateStatus(surg.id, 'CANCELLED')}>
                    Cancel
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {!loading && filteredSurgeries.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
             No surgeries scheduled.
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} 
                className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 550, padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Schedule Surgery</h2>
                <button onClick={() => setShowModal(false)} className="btn btn-ghost" style={{ padding: '0.5rem' }}><X size={20}/></button>
              </div>

              <form onSubmit={handleScheduleSubmit} style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label className="label">Patient Profile</label>
                  <select required className="input select" value={formData.patient} onChange={e => setFormData({...formData, patient: e.target.value})}>
                    <option value="">-- Select Patient --</option>
                    {patients.map(p => <option key={p.id} value={String(p.id?.id || p.id)}>{p.name} ({generateCustomPatientId(p)})</option>)}
                  </select>
                  <div style={{ marginTop: '0.5rem' }}>
                    <input 
                      type="text" 
                      placeholder="Paste Patient ID to Sync..." 
                      className="input" 
                      style={{ fontSize: '0.85rem' }}
                      onChange={(e) => {
                        const pastedId = e.target.value.trim();
                        const foundPatient = patients.find(p => generateCustomPatientId(p) === pastedId);
                        if (foundPatient) {
                          setFormData({...formData, patient: String(foundPatient.id?.id || foundPatient.id)});
                          toast.success(`Synced Patient: ${foundPatient.name}`);
                        }
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Lead Surgeon</label>
                  <select required className="input select" value={formData.lead_surgeon} onChange={e => setFormData({...formData, lead_surgeon: e.target.value})}>
                    <option value="">-- Choose Surgeon --</option>
                    {doctors.map(d => <option key={d.id} value={String(d.id?.id || d.id)}>Dr. {d.name} ({d.specialization})</option>)}
                  </select>
                </div>

                <div>
                  <label className="label">Operation Theatre (Room)</label>
                  <select required className="input select" value={formData.ot_room} onChange={e => setFormData({...formData, ot_room: e.target.value})}>
                    <option value="">-- Allocate OT --</option>
                    {otRooms.map(r => <option key={r.id} value={String(r.id?.id || r.id)}>Room {r.room_number} ({r.room_type})</option>)}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="label">Start Time</label>
                    <input type="datetime-local" required className="input" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} />
                  </div>
                  <div>
                    <label className="label">Estimated End Time</label>
                    <input type="datetime-local" required className="input" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} />
                  </div>
                </div>
                
                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn-primary"><Calendar size={18}/> Schedule Block</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
