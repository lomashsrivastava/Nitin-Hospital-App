import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ambulance, Plus, Navigation, Phone, Car, MapPin, XCircle, CheckCircle, Wind, Zap, Beaker, Clock, Trash2, Users } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { generateCustomPatientId } from '../api/patientIdHelper';

export default function AmbulanceTransport() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [selectedAmbulance, setSelectedAmbulance] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'fleet' | 'dispatches' | 'history'>('fleet');

  const [vehicleData, setVehicleData] = useState({ 
    vehicle_number: '', driver_name: '', contact_number: '', email: '', 
    vehicle_type: 'BLS', has_o2: false, has_defibrillator: false, has_ventilator: false 
  });
  const [dispatchData, setDispatchData] = useState({ 
    patient: '', patient_name: '', pickup_location: '', drop_location: 'Nitin Hospital Banda', estimated_eta: '30 Mins',
    priority: 'NORMAL' 
  });
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [patientIdInput, setPatientIdInput] = useState('');
  const [pickupEta, setPickupEta] = useState('5');
  const [dropEta, setDropEta] = useState('30');
  const [additionalFeatures, setAdditionalFeatures] = useState({
    reason: 'TRANSFER',
    condition: 'STABLE',
    notes: '',
    req_o2: false,
    req_defib: false,
    req_vent: false,
    traffic_level: 'MEDIUM',
    escort_type: 'NONE',
    assigned_clinician: 'PARAMEDIC'
  });
  const [selectedDispatchForMap, setSelectedDispatchForMap] = useState<any | null>(null);

  const handlePatientIdChange = (idInput: string) => {
    setPatientIdInput(idInput);
    if (!idInput.trim()) {
      setDispatchData(prev => ({ ...prev, patient: '', patient_name: '' }));
      return;
    }
    
    const foundPatient = patients.find(p => {
      const customId = generateCustomPatientId(p).toLowerCase();
      return customId === idInput.toLowerCase() || customId.includes(idInput.toLowerCase());
    });

    if (foundPatient) {
      setDispatchData(prev => ({
        ...prev,
        patient: foundPatient.id,
        patient_name: foundPatient.name
      }));
      toast.success(`Synced: ${foundPatient.name}`, { id: 'sync-success' });
    } else {
      setDispatchData(prev => ({ ...prev, patient: '', patient_name: '' }));
    }
  };

  useEffect(() => {
    fetchVehicles();
    fetchDispatches();
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const res = await api.get('/hospital/patients/');
      setPatients(res.data?.results || res.data || []);
    } catch {}
  };

  const fetchVehicles = async () => {
    try {
      const res = await api.get('/hospital/ambulance-vehicles/');
      setVehicles(res.data?.results || res.data || []);
    } catch (e) { toast.error('Failed to load vehicles'); }
  };

  const fetchDispatches = async () => {
    try {
      const res = await api.get('/hospital/ambulance-dispatch/');
      setDispatches(res.data?.results || res.data || []);
    } catch (e) { toast.error('Failed to load dispatches'); }
  };

  const submitVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingVehicleId) {
        await api.put(`/hospital/ambulance-vehicles/${editingVehicleId}/`, vehicleData);
        toast.success('Vehicle Configuration Updated');
      } else {
        await api.post('/hospital/ambulance-vehicles/', vehicleData);
        toast.success('Advanced Ambulance Registered');
      }
      setIsVehicleModalOpen(false);
      setEditingVehicleId(null);
      setVehicleData({ vehicle_number: '', driver_name: '', contact_number: '', email: '', vehicle_type: 'BLS', has_o2: false, has_defibrillator: false, has_ventilator: false });
      fetchVehicles();
    } catch (e) { toast.error('Error saving vehicle'); }
  };

  const submitDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAmbulance) return toast.error('Select an ambulance first');
    try {
      const combinedPickup = `Loc: ${dispatchData.pickup_location} | Reason: ${additionalFeatures.reason} | Cond: ${additionalFeatures.condition} | Eq: ${[
        additionalFeatures.req_o2 ? 'O2' : '',
        additionalFeatures.req_defib ? 'Defib' : '',
        additionalFeatures.req_vent ? 'Vent' : ''
      ].filter(Boolean).join(', ') || 'None'} | Staff: ${additionalFeatures.assigned_clinician} | Escort: ${additionalFeatures.escort_type} | Traffic: ${additionalFeatures.traffic_level} | Notes: ${additionalFeatures.notes}`;

      const returnCalc = (parseInt(dropEta) || 0) + 20;
      const totalEta = `P:${pickupEta}m | D:${dropEta}m | R:${returnCalc}m`;

      const payload = {
        ambulance: selectedAmbulance,
        patient: dispatchData.patient || null,
        patient_name: dispatchData.patient_name,
        pickup_location: combinedPickup,
        drop_location: dispatchData.drop_location,
        estimated_eta: totalEta,
        is_completed: false
      };
      await api.post('/hospital/ambulance-dispatch/', payload);
      await api.patch(`/hospital/ambulance-vehicles/${selectedAmbulance}/`, { status: 'DISPATCHED' });
      toast.success('Ambulance Dispatched! Mission Live.');
      setIsDispatchModalOpen(false);
      setDispatchData({ patient: '', patient_name: '', pickup_location: '', drop_location: 'Nitin Hospital Banda', estimated_eta: '30 Mins' });
      setPatientIdInput('');
      setAdditionalFeatures({ reason: 'TRANSFER', condition: 'STABLE', notes: '', req_o2: false, req_defib: false, req_vent: false });
      setSelectedAmbulance(null);
      fetchVehicles();
      fetchDispatches();
    } catch (e) { toast.error('Dispatch failed'); }
  };

  const completeDispatch = async (dispatchId: number, ambulanceId: number) => {
    try {
      await api.patch(`/hospital/ambulance-dispatch/${dispatchId}/`, { is_completed: true });
      await api.patch(`/hospital/ambulance-vehicles/${ambulanceId}/`, { status: 'AVAILABLE' });
      toast.success('Mission Complete. Vehicle returned to base.');
      fetchVehicles();
      fetchDispatches();
    } catch (e) { toast.error('Failed to mark complete'); }
  };

  const deleteVehicle = async (id: number) => {
    try {
      await api.delete(`/hospital/ambulance-vehicles/${id}/`);
      toast.success('Vehicle retired from active duty');
      fetchVehicles();
    } catch (e) { toast.error('Failed to retire vehicle'); }
  };

  const deleteDispatch = async (id: number) => {
    try {
      await api.delete(`/hospital/ambulance-dispatch/${id}/`);
      toast.success('Dispatch record purged');
      fetchDispatches();
    } catch (e: any) { 
      console.error('Delete dispatch failed:', e);
      toast.error(e.response?.data?.error || 'Failed to delete dispatch'); 
    }
  };

  const editVehicle = (v: any) => {
    setEditingVehicleId(v.id);
    setVehicleData({
      vehicle_number: v.vehicle_number,
      driver_name: v.driver_name,
      contact_number: v.contact_number,
      email: v.email || '',
      vehicle_type: v.vehicle_type,
      has_o2: v.has_o2,
      has_defibrillator: v.has_defibrillator,
      has_ventilator: v.has_ventilator
    });
    setIsVehicleModalOpen(true);
  };

  const toggleMaintenance = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'MAINTENANCE' ? 'AVAILABLE' : 'MAINTENANCE';
    try {
      await api.patch(`/hospital/ambulance-vehicles/${id}/`, { status: newStatus });
      toast.success(`Vehicle status updated to ${newStatus}`);
      fetchVehicles();
    } catch (e) { toast.error('Status update failed'); }
  };

  const getStats = () => {
    return {
      total: vehicles.length,
      available: vehicles.filter(v => v.status === 'AVAILABLE').length,
      dispatched: vehicles.filter(v => v.status === 'DISPATCHED').length,
      maintenance: vehicles.filter(v => v.status === 'MAINTENANCE').length
    };
  };

  const stats = getStats();

  const getTypeColor = (type: string) => {
    if (type === 'ALS') return '#f43f5e'; // Red for Advanced ICU
    if (type === 'BLS') return '#0ea5e9'; // Blue for Basic
    return '#10b981'; // Green for Patient Transport
  };

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Ambulance color="#f59e0b" /> Emergency Transport
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Advanced Fleet Command & Hardware Tracker</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsVehicleModalOpen(true)}
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '0.75rem 1.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>
          <Car size={20} /> Register New Vehicle
        </motion.button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <StatCard label="Total Fleet" value={stats.total} icon={<Ambulance size={20}/>} color="#6366f1" />
        <StatCard label="Available" value={stats.available} icon={<CheckCircle size={20}/>} color="#10b981" />
        <StatCard label="In Transit" value={stats.dispatched} icon={<Navigation size={20}/>} color="#f59e0b" />
        <StatCard label="Maintenance" value={stats.maintenance} icon={<Zap size={20}/>} color="#ef4444" />
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        <TabButton active={activeTab === 'fleet'} onClick={() => setActiveTab('fleet')} label="Fleet Control" count={vehicles.length} />
        <TabButton active={activeTab === 'dispatches'} onClick={() => setActiveTab('dispatches')} label="Live Dispatches" count={dispatches.filter(d => !d.is_completed).length} />
        <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} label="Mission History" count={dispatches.filter(d => d.is_completed).length} />
      </div>

      <div style={{ minHeight: '400px' }}>
        {activeTab === 'fleet' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
              <AnimatePresence>
                {vehicles.map(v => (
                  <motion.div key={v.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
                    
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '6px', height: '100%', background: getTypeColor(v.vehicle_type) }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2rem' }}>{v.vehicle_number}</h3>
                          <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem', background: `${getTypeColor(v.vehicle_type)}22`, color: getTypeColor(v.vehicle_type), borderRadius: '4px', fontWeight: 800 }}>{v.vehicle_type}</span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Users size={14}/> {v.driver_name}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => toggleMaintenance(v.id, v.status)} style={{ background: 'transparent', border: 'none', color: v.status === 'MAINTENANCE' ? '#10b981' : '#f59e0b', cursor: 'pointer' }} title={v.status === 'MAINTENANCE' ? "End Maintenance" : "Start Maintenance"}>
                          <Zap size={18} />
                        </button>
                        <button onClick={() => editVehicle(v)} style={{ background: 'transparent', border: 'none', color: '#14b8a6', cursor: 'pointer' }}>
                          <Users size={18} />
                        </button>
                        <button onClick={() => deleteVehicle(v.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Phone size={14}/> {v.contact_number}</div>
                    
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                      <HardwareIcon active={v.has_o2} icon={<Beaker size={14}/>} label="O2" />
                      <HardwareIcon active={v.has_defibrillator} icon={<Zap size={14}/>} label="Defib" />
                      <HardwareIcon active={v.has_ventilator} icon={<Wind size={14}/>} label="Vent" />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: v.status === 'AVAILABLE' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: v.status === 'AVAILABLE' ? '#10b981' : '#f59e0b' }}>{v.status}</span>
                      {v.status === 'AVAILABLE' && (
                        <button onClick={() => { 
                          setSelectedAmbulance(v.id); 
                          setIsDispatchModalOpen(true); 
                          setPickupEta(Math.floor(Math.random() * 6 + 5).toString());
                          setDispatchData({
                            patient: '', 
                            patient_name: '', 
                            pickup_location: '', 
                            drop_location: '', 
                            estimated_eta: '30 Mins',
                            priority: 'NORMAL'
                          });
                        }} style={{ padding: '0.6rem 1.2rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 15px rgba(245,158,11,0.3)' }}><Navigation size={16}/> Dispatch</button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {vehicles.length === 0 && <div style={{ gridColumn: '1/-1', color: 'var(--text-muted)', textAlign: 'center', padding: '4rem', border: '1px dashed var(--border)', borderRadius: '16px' }}>No vehicles in registry. Start by adding a new ambulance.</div>}
            </div>
          </motion.div>
        )}

        {activeTab === 'dispatches' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            
            {/* Combined Fleet Map - Always show if at least 1 active */}
            {dispatches.filter(d => !d.is_completed).length >= 1 && (
              <div style={{ marginBottom: '2rem', background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Navigation color="#f59e0b" /> Combined Fleet Command Center Map
                </h3>
                <CombinedMissionMap dispatches={dispatches.filter(d => !d.is_completed)} />
              </div>
            )}

            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <th style={{ padding: '1rem' }}>Vehicle & Driver</th>
                    <th style={{ padding: '1rem' }}>Patient Details</th>
                    <th style={{ padding: '1rem' }}>Mission Route</th>
                    <th style={{ padding: '1rem' }}>ETA & Priority</th>
                    <th style={{ padding: '1rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                  {dispatches.filter(d => !d.is_completed).map(d => {
                    const driverName = vehicles.find(v => v.id === d.ambulance)?.driver_name || "N/A";
                    const contactNo = vehicles.find(v => v.id === d.ambulance)?.contact_number || "N/A";
                    return (
                      <tr key={d.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 700 }}>{d.ambulance_details}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Driver: {driverName} ({contactNo})</div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 700 }}>{d.patient_name_display}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ID: {d.patient || 'N/A'}</div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div><span style={{ color: '#0ea5e9', fontWeight: 800 }}>PICKUP:</span> {d.pickup_location}</div>
                            <div><span style={{ color: '#a855f7', fontWeight: 800 }}>DROP:</span> {d.drop_location}</div>
                            <div><span style={{ color: '#10b981', fontWeight: 800 }}>RETURN:</span> Nitin Hospital Banda</div>
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ padding: '0.25rem 0.5rem', background: '#f59e0b22', color: '#f59e0b', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 900 }}>{d.estimated_eta}</span>
                          <span style={{ marginLeft: '0.5rem', padding: '0.25rem 0.5rem', background: d.priority === 'EMERGENCY' ? '#ef444422' : '#10b98122', color: d.priority === 'EMERGENCY' ? '#ef4444' : '#10b981', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 900 }}>{d.priority}</span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => completeDispatch(d.id, d.ambulance)} style={{ padding: '0.4rem 0.8rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle size={14}/> Complete</button>
                            <button onClick={() => deleteDispatch(d.id)} style={{ padding: '0.4rem', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16}/></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <th style={{ padding: '1rem' }}>Vehicle</th>
                    <th style={{ padding: '1rem' }}>Patient</th>
                    <th style={{ padding: '1rem' }}>Pickup</th>
                    <th style={{ padding: '1rem' }}>Drop</th>
                    <th style={{ padding: '1rem' }}>Completed Date</th>
                    <th style={{ padding: '1rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                  {dispatches.filter(d => d.is_completed).map(d => (
                    <tr key={d.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem' }}>{d.ambulance_details}</td>
                      <td style={{ padding: '1rem' }}>{d.patient_name_display}</td>
                      <td style={{ padding: '1rem' }}>{d.pickup_location.substring(0, 30)}...</td>
                      <td style={{ padding: '1rem' }}>{d.drop_location.substring(0, 30)}...</td>
                      <td style={{ padding: '1rem' }}>{new Date(d.dispatch_time).toLocaleDateString()}</td>
                      <td style={{ padding: '1rem' }}><button onClick={() => deleteDispatch(d.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>

      {/* Add Vehicle Modal */}
      <AnimatePresence>
        {isVehicleModalOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsVehicleModalOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} style={{ position: 'relative', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '600px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
              <button onClick={() => setIsVehicleModalOpen(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><XCircle size={24} /></button>
              <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Plus color="#0ea5e9"/> Register Advanced Vehicle</h2>
              <form onSubmit={submitVehicle} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Vehicle Type Class</label>
                    <select required value={vehicleData.vehicle_type} onChange={e => setVehicleData({...vehicleData, vehicle_type: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px' }}>
                      <option value="BLS">Basic Life Support (BLS)</option>
                      <option value="ALS">Advanced Life Support / ICU (ALS)</option>
                      <option value="PTS">Patient Transport Van (PTS)</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Vehicle Number / Plates</label>
                    <input required type="text" placeholder="e.g. UP32-AMB-1002" value={vehicleData.vehicle_number} onChange={e => setVehicleData({...vehicleData, vehicle_number: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Driver Full Name</label>
                    <input required type="text" placeholder="Driver Name" value={vehicleData.driver_name} onChange={e => setVehicleData({...vehicleData, driver_name: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Contact Number</label>
                    <input required type="text" placeholder="Mobile" value={vehicleData.contact_number} onChange={e => setVehicleData({...vehicleData, contact_number: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px' }} />
                  </div>
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '1rem', color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600 }}>Hardware Loadout Tracker</label>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: 'var(--bg-primary)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', flex: 1, minWidth: '150px' }}>
                      <input type="checkbox" checked={vehicleData.has_o2} onChange={e => setVehicleData({...vehicleData, has_o2: e.target.checked})} style={{ width: '18px', height: '18px', accentColor: '#10b981' }} />
                      <span style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Beaker size={16} color="#10b981"/> Oxygen Cyl.</span>
                    </label>
                    
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: 'var(--bg-primary)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', flex: 1, minWidth: '150px' }}>
                      <input type="checkbox" checked={vehicleData.has_defibrillator} onChange={e => setVehicleData({...vehicleData, has_defibrillator: e.target.checked})} style={{ width: '18px', height: '18px', accentColor: '#ef4444' }} />
                      <span style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Zap size={16} color="#ef4444"/> Defibrillator</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: 'var(--bg-primary)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', flex: 1, minWidth: '150px' }}>
                      <input type="checkbox" checked={vehicleData.has_ventilator} onChange={e => setVehicleData({...vehicleData, has_ventilator: e.target.checked})} style={{ width: '18px', height: '18px', accentColor: '#0ea5e9' }} />
                      <span style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Wind size={16} color="#0ea5e9"/> Mobile Vent.</span>
                    </label>

                  </div>
                </div>

                <button type="submit" style={{ background: 'linear-gradient(135deg, #0ea5e9, #2563eb)', color: 'white', border: 'none', padding: '1rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', marginTop: '1rem' }}>Lock In Regsitry Payload</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dispatch Modal */}
      <AnimatePresence>
        {isDispatchModalOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDispatchModalOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} style={{ position: 'relative', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '2rem', width: '90%', maxWidth: '1000px', maxHeight: '95vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
              <button onClick={() => setIsDispatchModalOpen(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><XCircle size={24} /></button>
              <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Navigation color="#f59e0b"/> Transmit Mission Payload</h2>
              <form onSubmit={submitDispatch} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
                
                {/* Left Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Patient ID Search */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Integrate Patient ID (Auto-Sync)</label>
                    <input 
                      type="text" 
                      placeholder="Enter ID e.g. AB-0000-NH..." 
                      value={patientIdInput} 
                      onChange={e => handlePatientIdChange(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px', fontFamily: 'monospace' }} 
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Patient Name (Synced)</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="Auto-populated or Manual" 
                      value={dispatchData.patient_name} 
                      onChange={e => setDispatchData({...dispatchData, patient_name: e.target.value})} 
                      style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px' }} 
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span>1. Pickup Location / Coordinates</span>
                      <span style={{ color: '#f59e0b', fontWeight: 800 }}>ETA: {pickupEta} Mins</span>
                    </label>
                    <textarea 
                      required 
                      placeholder="Enter coordinates or landmark" 
                      value={dispatchData.pickup_location} 
                      onChange={e => setDispatchData({...dispatchData, pickup_location: e.target.value})} 
                      style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px', minHeight: '50px', resize: 'vertical' }} 
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span>2. Patient Drop Location</span>
                      <span style={{ color: '#a855f7', fontWeight: 800 }}>ETA (Mins):</span>
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <textarea 
                        required 
                        placeholder="Enter patient drop-off point" 
                        value={dispatchData.drop_location} 
                        onChange={e => setDispatchData({...dispatchData, drop_location: e.target.value})} 
                        style={{ flex: 1, padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px', minHeight: '50px', resize: 'vertical' }} 
                      />
                      <input 
                        type="number" 
                        value={dropEta}
                        onChange={e => setDropEta(e.target.value)}
                        style={{ width: '80px', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px', textAlign: 'center' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span>3. Return Drop Location (Fixed)</span>
                      <span style={{ color: '#10b981', fontWeight: 800 }}>ETA: {(parseInt(dropEta) || 0) + 20} Mins</span>
                    </label>
                    <input 
                      type="text" 
                      readOnly
                      value="Nitin Hospital Banda" 
                      style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: '8px', cursor: 'not-allowed' }} 
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Reason for Dispatch</label>
                      <select 
                        value={additionalFeatures.reason} 
                        onChange={e => setAdditionalFeatures({...additionalFeatures, reason: e.target.value})} 
                        style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px' }}
                      >
                        <option value="TRANSFER">Hospital Transfer</option>
                        <option value="TRAUMA">Trauma / Accident</option>
                        <option value="CARDIAC">Cardiac Emergency</option>
                        <option value="RESPIRATORY">Respiratory Distress</option>
                        <option value="OTHER">Other Medical</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Patient Condition</label>
                      <select 
                        value={additionalFeatures.condition} 
                        onChange={e => setAdditionalFeatures({...additionalFeatures, condition: e.target.value})} 
                        style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px' }}
                      >
                        <option value="STABLE">Stable</option>
                        <option value="UNSTABLE">Unstable</option>
                        <option value="CRITICAL">Critical</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Traffic Level</label>
                      <select 
                        value={additionalFeatures.traffic_level} 
                        onChange={e => setAdditionalFeatures({...additionalFeatures, traffic_level: e.target.value})} 
                        style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px' }}
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Assigned Clinician</label>
                      <select 
                        value={additionalFeatures.assigned_clinician} 
                        onChange={e => setAdditionalFeatures({...additionalFeatures, assigned_clinician: e.target.value})} 
                        style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px' }}
                      >
                        <option value="PARAMEDIC">Paramedic</option>
                        <option value="NURSE">Nurse</option>
                        <option value="DOCTOR">Doctor</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Required Equipment</label>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={additionalFeatures.req_o2} onChange={e => setAdditionalFeatures({...additionalFeatures, req_o2: e.target.checked})} />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>Oxygen</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={additionalFeatures.req_defib} onChange={e => setAdditionalFeatures({...additionalFeatures, req_defib: e.target.checked})} />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>Defibrillator</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={additionalFeatures.req_vent} onChange={e => setAdditionalFeatures({...additionalFeatures, req_vent: e.target.checked})} />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>Ventilator</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Mission Priority</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {['NORMAL', 'CRITICAL', 'EMERGENCY'].map(p => (
                        <button key={p} type="button" onClick={() => setDispatchData({...dispatchData, priority: p})} style={{ 
                          flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
                          background: dispatchData.priority === p ? (p === 'NORMAL' ? '#10b981' : p === 'CRITICAL' ? '#f59e0b' : '#ef4444') : 'var(--bg-primary)',
                          color: dispatchData.priority === p ? 'white' : 'var(--text-muted)'
                        }}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Mission Notes</label>
                    <textarea 
                      placeholder="Additional instructions..." 
                      value={additionalFeatures.notes} 
                      onChange={e => setAdditionalFeatures({...additionalFeatures, notes: e.target.value})} 
                      style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px', minHeight: '40px' }} 
                    />
                  </div>
                  
                  <button type="submit" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', border: 'none', padding: '1rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', marginTop: '0.5rem', width: '100%' }}>Confirm & Launch Code 3</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Individual Map Popup */}
      <AnimatePresence>
        {selectedDispatchForMap && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedDispatchForMap(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ position: 'relative', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '600px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
              <button onClick={() => setSelectedDispatchForMap(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><XCircle size={24} /></button>
              <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Live Tracking: {selectedDispatchForMap.ambulance_details}</h3>
              <MissionMap dispatch={selectedDispatchForMap} onComplete={() => {}} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const getRoute = (index: number) => {
  const variations = [
    [
      { x: 10, y: 50, label: 'Base' },
      { x: 20, y: 30 }, { x: 35, y: 30 }, { x: 35, y: 20, label: 'Pickup' },
      { x: 50, y: 20 }, { x: 50, y: 60 }, { x: 70, y: 60, label: 'Drop' },
      { x: 70, y: 80 }, { x: 40, y: 80 }, { x: 40, y: 50 }, { x: 10, y: 50, label: 'Return' }
    ],
    [
      { x: 10, y: 50, label: 'Base' },
      { x: 15, y: 70 }, { x: 30, y: 70 }, { x: 30, y: 80, label: 'Pickup' },
      { x: 50, y: 80 }, { x: 50, y: 40 }, { x: 80, y: 40, label: 'Drop' },
      { x: 80, y: 20 }, { x: 40, y: 20 }, { x: 40, y: 50 }, { x: 10, y: 50, label: 'Return' }
    ],
    [
      { x: 10, y: 50, label: 'Base' },
      { x: 25, y: 40 }, { x: 45, y: 40 }, { x: 45, y: 30, label: 'Pickup' },
      { x: 65, y: 30 }, { x: 65, y: 70 }, { x: 85, y: 70, label: 'Drop' },
      { x: 85, y: 90 }, { x: 30, y: 90 }, { x: 30, y: 50 }, { x: 10, y: 50, label: 'Return' }
    ],
    [
      { x: 10, y: 50, label: 'Base' },
      { x: 35, y: 60 }, { x: 55, y: 60 }, { x: 55, y: 75, label: 'Pickup' },
      { x: 75, y: 75 }, { x: 75, y: 35 }, { x: 90, y: 35, label: 'Drop' },
      { x: 90, y: 15 }, { x: 20, y: 15 }, { x: 20, y: 50 }, { x: 10, y: 50, label: 'Return' }
    ],
  ];
  return variations[index % variations.length];
};

const singleRoute = getRoute(0);

const getRouteProgress = (route: {x: number, y: number}[], prog: number) => {
  if (prog <= 0) return { currentPos: route[0], activePoints: [route[0]], segmentIndex: 0 };
  if (prog >= 100) return { currentPos: route[route.length - 1], activePoints: route, segmentIndex: route.length - 2 };
  
  const totalSegments = route.length - 1;
  const segmentWeight = 100 / totalSegments;
  const segmentIndex = Math.min(Math.floor(prog / segmentWeight), totalSegments - 1);
  
  const segmentProg = (prog - (segmentIndex * segmentWeight)) / segmentWeight;
  
  const start = route[segmentIndex];
  const end = route[segmentIndex + 1];
  
  const currentPos = {
    x: start.x + (end.x - start.x) * segmentProg,
    y: start.y + (end.y - start.y) * segmentProg
  };
  
  const activePoints = [...route.slice(0, segmentIndex + 1), currentPos];
  
  return { currentPos, activePoints, segmentIndex };
};

const backgroundRoads = [
  { x1: 0, y1: 20, x2: 100, y2: 20 },
  { x1: 0, y1: 40, x2: 100, y2: 40 },
  { x1: 0, y1: 60, x2: 100, y2: 60 },
  { x1: 0, y1: 80, x2: 100, y2: 80 },
  { x1: 20, y1: 0, x2: 20, y2: 100 },
  { x1: 40, y1: 0, x2: 40, y2: 100 },
  { x1: 60, y1: 0, x2: 60, y2: 100 },
  { x1: 80, y1: 0, x2: 80, y2: 100 },
];

const backgroundBuildings = [
  { x: 5, y: 5, w: 10, h: 10 }, { x: 25, y: 5, w: 10, h: 10 }, { x: 45, y: 5, w: 10, h: 10 }, { x: 65, y: 5, w: 10, h: 10 }, { x: 85, y: 5, w: 10, h: 10 },
  { x: 5, y: 25, w: 10, h: 10 }, { x: 25, y: 25, w: 10, h: 10 }, { x: 45, y: 25, w: 10, h: 10 }, { x: 65, y: 25, w: 10, h: 10 }, { x: 85, y: 25, w: 10, h: 10 },
  { x: 5, y: 45, w: 10, h: 10 }, { x: 25, y: 45, w: 10, h: 10 }, { x: 45, y: 45, w: 10, h: 10 }, { x: 65, y: 45, w: 10, h: 10 }, { x: 85, y: 45, w: 10, h: 10 },
  { x: 5, y: 65, w: 10, h: 10 }, { x: 25, y: 65, w: 10, h: 10 }, { x: 45, y: 65, w: 10, h: 10 }, { x: 65, y: 65, w: 10, h: 10 }, { x: 85, y: 65, w: 10, h: 10 },
  { x: 5, y: 85, w: 10, h: 10 }, { x: 25, y: 85, w: 10, h: 10 }, { x: 45, y: 85, w: 10, h: 10 }, { x: 65, y: 85, w: 10, h: 10 }, { x: 85, y: 85, w: 10, h: 10 }
];

const MissionMap = ({ dispatch, onComplete }: any) => {
  const [progress, setProgress] = useState(0);
  const [telemetry, setTelemetry] = useState(0);
  
  useEffect(() => {
    const etaMatch = (dispatch.estimated_eta || "10").match(/\d+/);
    const durationMinutes = etaMatch ? parseInt(etaMatch[0]) : 10;
    const durationMs = durationMinutes * 60 * 1000;
    const startTime = new Date(dispatch.dispatch_time).getTime();
    
    const updateProgress = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const currentProgress = Math.min(100, (elapsed / durationMs) * 100);
      setProgress(currentProgress);
      setTelemetry(Math.random() * 100);
      
      if (currentProgress >= 100 && !dispatch.is_completed) {
        onComplete(dispatch.id, dispatch.ambulance);
      }
    };
    
    updateProgress();
    const interval = setInterval(updateProgress, 1000);
    return () => clearInterval(interval);
  }, [dispatch, onComplete]);

  const priorityColor = dispatch.priority === 'EMERGENCY' ? '#ef4444' : dispatch.priority === 'CRITICAL' ? '#f59e0b' : '#3b82f6';

  const { currentPos, activePoints } = getRouteProgress(singleRoute, progress);

  return (
    <div style={{ 
      marginTop: '1.5rem', 
      background: '#050505', 
      borderRadius: '20px', 
      height: '240px', 
      position: 'relative', 
      overflow: 'hidden', 
      border: `1px solid ${priorityColor}44`,
      perspective: '1200px',
      boxShadow: `inset 0 0 50px ${priorityColor}11`
    }}>
      <style>{`
        @keyframes routeFlow {
          to {
            stroke-dashoffset: -15;
          }
        }
        @keyframes blink {
          0% { opacity: 0.4; }
          100% { opacity: 1; }
        }
        @keyframes blinkText {
          0% { opacity: 0.3; transform: translateX(-50%) scale(0.95); }
          100% { opacity: 1; transform: translateX(-50%) scale(1.05); }
        }
        .blinking-text {
          animation: blinkText 1s infinite alternate ease-in-out;
        }
      `}</style>

      {/* 3D Holographic Base Grid */}
      <motion.div 
        style={{ 
          position: 'absolute', 
          inset: '-100%', 
          opacity: 0.05, 
          backgroundImage: `linear-gradient(${priorityColor} 1px, transparent 1px), linear-gradient(90deg, ${priorityColor} 1px, transparent 1px)`, 
          backgroundSize: '30px 30px',
          transform: 'rotateX(70deg) rotateZ(10deg) translateZ(-50px)',
        }}
        animate={{ backgroundPositionY: ['0px', '30px'] }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />

      {/* City Blocks Simulation - Optimized */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', transform: 'rotateX(70deg) rotateZ(10deg)', transformStyle: 'preserve-3d', opacity: 0.1 }}>
         {[10, 30, 50, 70, 90].map((x, i) => [20, 40, 60, 80].map((y, j) => (
           <div key={`${i}-${j}`} style={{ 
             position: 'absolute', left: `${x}%`, top: `${y}%`, 
             width: '20px', height: '20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
             transform: 'translateZ(15px)',
           }} />
         )))}
      </div>

      {/* Traffic Simulation */}
      {[...Array(5)].map((_, i) => (
        <motion.div key={i}
          style={{ position: 'absolute', width: '4px', height: '4px', background: '#fff', borderRadius: '50%', opacity: 0.2 }}
          animate={{ 
            left: ['0%', '100%'], 
            top: [`${20 + i*15}%`, `${25 + i*15}%`] 
          }}
          transition={{ duration: 10 + i*5, repeat: Infinity, ease: 'linear' }}
        />
      ))}

      {/* Main Mission Path */}
      <div style={{ position: 'absolute', inset: 0, transform: 'rotateX(35deg)', transformStyle: 'preserve-3d' }}>
        
        {/* Dynamic Signal Pulse at Base */}
        <motion.div 
           style={{ position: 'absolute', left: `${singleRoute[0].x}%`, top: `${singleRoute[0].y}%`, transform: 'translate(-50%, -50%)', width: '60px', height: '60px', borderRadius: '50%', border: `1px solid ${priorityColor}`, zIndex: 1 }}
           animate={{ scale: [1, 2], opacity: [0.5, 0] }}
           transition={{ duration: 2, repeat: Infinity }}
        />

        {/* SVG Route Lines */}
        <svg 
          viewBox="0 0 100 100" 
          preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        >
          {/* Background Buildings */}
          {backgroundBuildings.map((b, i) => (
            <rect key={`b-${i}`} x={b.x} y={b.y} width={b.w} height={b.h} fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
          ))}

          {/* Background Roads */}
          {backgroundRoads.map((r, i) => (
            <line key={`r-${i}`} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" strokeDasharray="2, 2" vectorEffect="non-scaling-stroke" />
          ))}

          {/* Full Route */}
          <path 
            d={`M ${singleRoute.map(p => `${p.x} ${p.y}`).join(' L ')}`}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {/* Active Route (Blinking/Pulsing Flow) */}
          <path 
            d={`M ${activePoints.map(p => `${p.x} ${p.y}`).join(' L ')}`}
            fill="none"
            stroke={priorityColor}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            strokeDasharray="10, 5"
            style={{ 
              filter: `drop-shadow(0 0 12px ${priorityColor})`,
              animation: 'routeFlow 1s linear infinite, blink 1.5s infinite alternate'
            }}
          />
        </svg>

        {/* 1. Nitin Base */}
        <div style={{ position: 'absolute', left: `${singleRoute[0].x}%`, top: `${singleRoute[0].y}%`, transform: 'translate(-50%, -50%) translateZ(20px)' }}>
          <div style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 20px #10b981' }} />
          <div className="blinking-text" style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', color: '#10b981', fontSize: '0.6rem', fontWeight: 900, marginTop: '6px', whiteSpace: 'nowrap' }}>NITIN BASE</div>
        </div>

        {/* 2. Pickup Point */}
        {singleRoute.find(p => p.label === 'Pickup') && (() => {
          const p = singleRoute.find(p => p.label === 'Pickup')!;
          const isReached = progress >= 30;
          return (
            <div style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%) translateZ(20px)' }}>
              <div style={{ width: '12px', height: '12px', background: isReached ? '#0ea5e9' : '#4b5563', borderRadius: '50%', boxShadow: isReached ? '0 0 20px #0ea5e9' : 'none' }} />
              <div className="blinking-text" style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', color: isReached ? '#0ea5e9' : '#9ca3af', fontSize: '0.6rem', fontWeight: 900, marginTop: '6px', whiteSpace: 'nowrap' }}>PICKUP</div>
            </div>
          );
        })()}

        {/* 3. Drop-off Point */}
        {singleRoute.find(p => p.label === 'Drop') && (() => {
          const p = singleRoute.find(p => p.label === 'Drop')!;
          const isReached = progress >= 60;
          return (
            <div style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%) translateZ(20px)' }}>
              <div style={{ width: '12px', height: '12px', background: isReached ? '#a855f7' : '#4b5563', borderRadius: '50%', boxShadow: isReached ? '0 0 20px #a855f7' : 'none' }} />
              <div className="blinking-text" style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', color: isReached ? '#a855f7' : '#9ca3af', fontSize: '0.6rem', fontWeight: 900, marginTop: '6px', whiteSpace: 'nowrap' }}>DROP-OFF</div>
            </div>
          );
        })()}

        {/* 3D Ambulance Unit */}
        <motion.div 
          style={{ position: 'absolute', left: `${currentPos.x}%`, top: `${currentPos.y}%`, transform: 'translate(-50%, -100%) translateZ(40px)', zIndex: 10 }}
          animate={{ z: [40, 50, 40], rotateY: [-5, 5, -5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <div style={{ position: 'relative' }}>
             <Ambulance size={40} color="#fff" style={{ filter: `drop-shadow(0 0 15px ${priorityColor})` }} />
              <div style={{ position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.9)', padding: '4px 10px', borderRadius: '6px', border: `1px solid ${priorityColor}`, fontSize: '0.7rem', color: priorityColor, fontWeight: 900, letterSpacing: '0.05em' }}>
                UNIT: {dispatch.ambulance_details?.split(' ')[0]} | {dispatch.patient_name_display}
              </div>
             {/* Dual Beacons */}
             <motion.div 
               style={{ position: 'absolute', top: '12px', right: '12px', width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 20px #ef4444' }}
               animate={{ opacity: [1, 0, 1] }}
               transition={{ repeat: Infinity, duration: 0.15 }}
             />
             <motion.div 
               style={{ position: 'absolute', top: '12px', left: '12px', width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 20px #3b82f6' }}
               animate={{ opacity: [0, 1, 0] }}
               transition={{ repeat: Infinity, duration: 0.15 }}
             />
          </div>
        </motion.div>

        {/* 3D Shadow Trail */}
        <motion.div 
           style={{ position: 'absolute', left: `${currentPos.x}%`, top: `${currentPos.y}%`, transform: 'translate(-50%, -50%)', width: '40px', height: '15px', background: 'rgba(0,0,0,0.6)', filter: 'blur(8px)', borderRadius: '50%' }}
        />

      </div>

      {/* Advanced Telemetry Overlays */}
      <div style={{ position: 'absolute', top: '1.25rem', left: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }} />
          <div style={{ fontSize: '0.75rem', color: priorityColor, fontWeight: 900, letterSpacing: '0.2em' }}>PRIORITY: {dispatch.priority}</div>
        </div>
        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>SIGNAL_STRENGTH: {Math.round(telemetry)}%</div>
        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>LATENCY: 12ms</div>
      </div>

      {/* HUD Telemetry Table */}
      <div style={{ position: 'absolute', bottom: '1rem', right: '1.25rem', textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        <div style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 900 }}>ETA: {dispatch.estimated_eta}</div>
        <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>NAV_MODE: CODE 3_3D_PERSPECTIVE</div>
        <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>UNIT_ID: {dispatch.ambulance_details.split(' ')[0]}</div>
      </div>

      {/* Scanning Mission Timeline */}
      <div style={{ position: 'absolute', left: '1.25rem', bottom: '1rem', display: 'flex', gap: '1rem' }}>
        <TimelineStep label="Dispatch" active={progress >= 0} />
        <TimelineStep label="En Route" active={progress >= 20} />
        <TimelineStep label="Pickup" active={progress >= 50} />
        <TimelineStep label="Arriving" active={progress >= 90} />
      </div>
    </div>
  );
};

const CombinedMissionMap = ({ dispatches }: { dispatches: any[] }) => {
  const routeColors = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#ec4899', '#0ea5e9'];

  return (
    <div style={{ 
      background: '#050505', 
      borderRadius: '20px', 
      height: '400px', 
      position: 'relative', 
      overflow: 'hidden', 
      border: '1px solid rgba(245,158,11,0.2)',
      perspective: '1200px',
      boxShadow: 'inset 0 0 50px rgba(245,158,11,0.05)'
    }}>
      <style>{`
        @keyframes routeFlow {
          to {
            stroke-dashoffset: -15;
          }
        }
        @keyframes blink {
          0% { opacity: 0.4; }
          100% { opacity: 1; }
        }
        @keyframes blinkText {
          0% { opacity: 0.3; transform: translateX(-50%) scale(0.95); }
          100% { opacity: 1; transform: translateX(-50%) scale(1.05); }
        }
        .blinking-text {
          animation: blinkText 1s infinite alternate ease-in-out;
        }
      `}</style>

      <motion.div 
        style={{ 
          position: 'absolute', 
          inset: '-100%', 
          opacity: 0.03, 
          backgroundImage: 'linear-gradient(#f59e0b 1px, transparent 1px), linear-gradient(90deg, #f59e0b 1px, transparent 1px)', 
          backgroundSize: '40px 40px',
          transform: 'rotateX(70deg) rotateZ(10deg) translateZ(-50px)',
        }}
        animate={{ backgroundPositionY: ['0px', '40px'] }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />

      {/* SVG Background Map Effects */}
      <svg 
        viewBox="0 0 100 100" 
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', transform: 'rotateX(35deg)' }}
      >
        {/* Background Buildings */}
        {backgroundBuildings.map((b, i) => (
          <rect key={`b-${i}`} x={b.x} y={b.y} width={b.w} height={b.h} fill="rgba(255,255,255,0.01)" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
        ))}

        {/* Background Roads */}
        {backgroundRoads.map((r, i) => (
          <line key={`r-${i}`} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="2, 2" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>

      {dispatches.map((d, index) => {
        const routeColor = routeColors[index % routeColors.length];
        const route = getRoute(index);
        
        return (
          <div key={d.id} style={{ position: 'absolute', inset: 0, transform: 'rotateX(35deg)', transformStyle: 'preserve-3d' }}>
            <MovingAmbulance dispatch={d} route={route} color={routeColor} />
          </div>
        );
      })}
    </div>
  );
};

const MovingAmbulance = ({ dispatch, route, color }: any) => {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const etaMatch = (dispatch.estimated_eta || "30").match(/\d+/);
    const durationMinutes = etaMatch ? parseInt(etaMatch[0]) : 30;
    const durationMs = durationMinutes * 60 * 1000;
    const startTime = new Date(dispatch.dispatch_time).getTime();
    
    const updateProgress = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      setProgress(Math.min(100, (elapsed / durationMs) * 100));
    };
    
    updateProgress();
    const interval = setInterval(updateProgress, 2000);
    return () => clearInterval(interval);
  }, [dispatch]);

  const { currentPos, activePoints } = getRouteProgress(route, progress);

  return (
    <>
      {/* SVG Route Lines */}
      <svg 
        viewBox="0 0 100 100" 
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        <path 
          d={`M ${route.map((p: any) => `${p.x} ${p.y}`).join(' L ')}`}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <path 
          d={`M ${activePoints.map((p: any) => `${p.x} ${p.y}`).join(' L ')}`}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          strokeDasharray="10, 5"
          style={{ 
            filter: `drop-shadow(0 0 8px ${color})`,
            animation: 'routeFlow 1s linear infinite, blink 1.5s infinite alternate'
          }}
        />
      </svg>

        {/* 1. Nitin Base */}
        <div style={{ position: 'absolute', left: `${route[0].x}%`, top: `${route[0].y}%`, transform: 'translate(-50%, -50%) translateZ(10px)' }}>
          <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', boxShadow: `0 0 10px ${color}` }} />
          <div className="blinking-text" style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', color: '#10b981', fontSize: '0.5rem', fontWeight: 900, whiteSpace: 'nowrap', marginTop: '4px' }}>BASE</div>
        </div>

        {/* 2. Pickup Point */}
        {route.find((p: any) => p.label === 'Pickup') && (() => {
          const p = route.find((p: any) => p.label === 'Pickup')!;
          const isReached = progress >= 30;
          return (
            <div style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%) translateZ(10px)' }}>
              <div style={{ width: '8px', height: '8px', background: isReached ? '#0ea5e9' : '#4b5563', borderRadius: '50%', boxShadow: isReached ? `0 0 10px ${color}` : 'none' }} />
              <div className="blinking-text" style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', color: isReached ? '#0ea5e9' : '#9ca3af', fontSize: '0.5rem', fontWeight: 900, whiteSpace: 'nowrap', marginTop: '4px' }}>PICKUP</div>
            </div>
          );
        })()}

        {/* 3. Drop-off Point */}
        {route.find((p: any) => p.label === 'Drop') && (() => {
          const p = route.find((p: any) => p.label === 'Drop')!;
          const isReached = progress >= 60;
          return (
            <div style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%) translateZ(10px)' }}>
              <div style={{ width: '8px', height: '8px', background: isReached ? '#a855f7' : '#4b5563', borderRadius: '50%', boxShadow: isReached ? `0 0 10px ${color}` : 'none' }} />
              <div className="blinking-text" style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', color: isReached ? '#a855f7' : '#9ca3af', fontSize: '0.5rem', fontWeight: 900, whiteSpace: 'nowrap', marginTop: '4px' }}>DROP-OFF</div>
            </div>
          );
        })()}

      <motion.div 
        style={{ 
          position: 'absolute', 
          left: `${currentPos.x}%`, 
          top: `${currentPos.y}%`, 
          transform: 'translate(-50%, -100%) translateZ(30px)', 
          zIndex: 10 
        }}
        animate={{ z: [30, 40, 30] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
      >
        <div style={{ position: 'relative' }}>
          <Ambulance size={30} color={color} style={{ filter: `drop-shadow(0 0 10px ${color})` }} />
          <div style={{ 
            position: 'absolute', 
            top: '-20px', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            whiteSpace: 'nowrap', 
            background: 'rgba(0,0,0,0.8)', 
            padding: '2px 6px', 
            borderRadius: '4px', 
            border: `1px solid ${color}`, 
            fontSize: '0.6rem', 
            color: '#fff',
            fontWeight: 'bold'
          }}>
            {dispatch.ambulance_details?.split(' ')[0] || 'AMB'} | {dispatch.patient_name_display}
          </div>
        </div>
      </motion.div>
    </>
  );
};

const TimelineStep = ({ label, active }: any) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: active ? '#f59e0b' : 'rgba(255,255,255,0.1)' }} />
    <span style={{ fontSize: '0.5rem', fontWeight: 800, color: active ? '#fff' : 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>{label}</span>
  </div>
);

const StatCard = ({ label, value, icon, color }: any) => (
  <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
    <div style={{ background: `${color}22`, color: color, padding: '1rem', borderRadius: '12px' }}>{icon}</div>
    <div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 800 }}>{value}</div>
    </div>
  </div>
);

const TabButton = ({ active, onClick, label, count }: any) => (
  <button onClick={onClick} style={{ background: 'transparent', border: 'none', padding: '0.5rem 1rem', color: active ? '#f59e0b' : 'var(--text-muted)', fontWeight: active ? 800 : 600, cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
    {label}
    <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', background: active ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>{count}</span>
    {active && <motion.div layoutId="ambulance-tab" style={{ position: 'absolute', bottom: '-0.5rem', left: 0, right: 0, height: '2px', background: '#f59e0b' }} />}
  </button>
);

const HardwareIcon = ({ active, icon, label }: any) => (
  <div style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', background: active ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)', color: active ? '#10b981' : 'var(--text-muted)', border: `1px solid ${active ? 'rgba(16,185,129,0.2)' : 'transparent'}` }}>
    {icon} {label}
  </div>
);
