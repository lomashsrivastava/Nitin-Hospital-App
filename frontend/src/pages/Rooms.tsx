import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bed, Users, ShieldAlert, Brush, Wrench, 
  Search, X, Check, Clock, UserPlus, UserMinus, 
  Activity, Building2, ChevronRight, ChevronLeft
} from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

interface Room {
  id: any;
  room_number: string;
  room_type: string;
  floor: number;
  bed_count: number;
  current_status: 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE' | 'EMERGENCY';
  occupant_type: 'P' | 'D' | 'N' | 'S' | 'EM' | null;
  last_cleaned: string;
  patient_name?: string;
  doctor_assigned?: string;
  staff_assigned?: string;
}

const STATUS_MAP: Record<string, any> = {
  AVAILABLE: { color: '#10b981', label: 'Available', icon: Bed },
  OCCUPIED: { color: '#8b5cf6', label: 'Occupied', icon: Users },
  CLEANING: { color: '#f59e0b', label: 'Cleaning', icon: Brush },
  MAINTENANCE: { color: '#ef4444', label: 'Service', icon: Wrench },
  EMERGENCY: { color: '#ec4899', label: 'Emergency', icon: ShieldAlert },
};

export default function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [search, setSearch] = useState('');
  const [floorFilter, setFloorFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 25;

  const fetchData = async () => {
    try {
      const [roomsRes, patientsRes, doctorsRes, staffRes] = await Promise.all([
        api.get('/hospital/rooms/'),
        api.get('/hospital/patients/'),
        api.get('/hospital/doctors/'),
        api.get('/hospital/staff/')
      ]);
      setRooms(roomsRes.data?.results || roomsRes.data || []);
      setPatients(patientsRes.data?.results || patientsRes.data || []);
      setDoctors(doctorsRes.data?.results || doctorsRes.data || []);
      setStaff(staffRes.data?.results || staffRes.data || []);
    } catch {
      toast.error('Sync failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredRooms = useMemo(() => {
    return rooms.filter(r => {
      const matchesSearch = r.room_number.toLowerCase().includes(search.toLowerCase()) || 
                           (r.patient_name || '').toLowerCase().includes(search.toLowerCase());
      const matchesFloor = !floorFilter || String(r.floor) === floorFilter;
      const matchesStatus = !statusFilter || r.current_status === statusFilter;
      return matchesSearch && matchesFloor && matchesStatus;
    });
  }, [rooms, search, floorFilter, statusFilter]);

  const paginatedRooms = filteredRooms.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(filteredRooms.length / itemsPerPage);

  const handleUpdate = async (id: any, payload: any) => {
    try {
      await api.patch(`/hospital/rooms/${String(id?.id || id)}/`, payload);
      toast.success('Updated');
      fetchData();
      setSelectedRoom(null);
    } catch { toast.error('Failed'); }
  };

  const handleAllot = async (type: string, occupantId: string) => {
    if (!selectedRoom) return;
    if (type === 'P') {
      try {
        await api.patch(`/hospital/patients/${occupantId}/`, { assigned_room: selectedRoom.id });
        toast.success('Patient assigned');
        fetchData();
        setSelectedRoom(null);
      } catch { toast.error('Failed'); }
    } else {
      const payload: any = { current_status: 'OCCUPIED', occupant_type: type };
      if (type === 'D') payload.assigned_doctor = occupantId;
      else payload.assigned_staff = occupantId;
      handleUpdate(selectedRoom.id, payload);
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem' }}>
      
      {/* Search & Filters */}
      <div className="card" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative', minWidth: '200px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            className="input" placeholder="Search room or patient..." 
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ paddingLeft: '2.5rem', width: '100%' }}
          />
        </div>
        <select className="input select" value={floorFilter} onChange={e => { setFloorFilter(e.target.value); setPage(1); }} style={{ width: '150px' }}>
          <option value="">All Floors</option>
          {Array.from(new Set(rooms.map(r => r.floor))).sort((a,b)=>a-b).map(f => <option key={f} value={f}>Floor {f}</option>)}
        </select>
        <select className="input select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={{ width: '150px' }}>
          <option value="">All Status</option>
          {Object.keys(STATUS_MAP).map(s => <option key={s} value={s}>{STATUS_MAP[s].label}</option>)}
        </select>
        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-muted)' }}>{filteredRooms.length} Rooms Found</div>
      </div>

      {/* Table Content */}
      <div className="card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1, borderBottom: '1px solid var(--border)' }}>
              <tr>
                <th style={{ padding: '1rem' }}>Room #</th>
                <th>Type</th>
                <th>Floor</th>
                <th>Status</th>
                <th>Occupant</th>
                <th style={{ textAlign: 'right', paddingRight: '1rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRooms.map(room => {
                const status = STATUS_MAP[room.current_status];
                return (
                  <tr key={room.id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => setSelectedRoom(room)}>
                    <td style={{ padding: '1rem', fontWeight: 900 }}>{room.room_number}</td>
                    <td style={{ fontSize: '0.85rem' }}>{room.room_type.replace('_', ' ')}</td>
                    <td>{room.floor}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: status.color, fontSize: '0.85rem', fontWeight: 700 }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: status.color }} />
                        {status.label}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: room.patient_name ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {room.patient_name || room.doctor_assigned || room.staff_assigned || '--'}
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '1rem' }}>
                      <button className="btn btn-ghost btn-sm" style={{ padding: '0.25rem 0.5rem' }}>Manage</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Showing {(page-1)*itemsPerPage + 1} to {Math.min(page*itemsPerPage, filteredRooms.length)} of {filteredRooms.length}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /></button>
            <span style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', fontWeight: 700 }}>Page {page} of {totalPages}</span>
            <button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      {/* Simplified Management Side Panel */}
      <AnimatePresence>
        {selectedRoom && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedRoom(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} style={{ position: 'relative', width: '380px', height: '100%', background: 'var(--bg-secondary)', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', borderLeft: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0 }}>Room {selectedRoom.room_number}</h2>
                <button onClick={() => setSelectedRoom(null)} className="btn btn-ghost"><X size={24} /></button>
              </div>

              <div style={{ padding: '1rem', borderRadius: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>STATUS</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: STATUS_MAP[selectedRoom.current_status].color }}>{STATUS_MAP[selectedRoom.current_status].label}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {Object.keys(STATUS_MAP).map(s => (
                  <button key={s} onClick={() => handleUpdate(selectedRoom.id, { current_status: s })} style={{ padding: '0.75rem', borderRadius: '8px', border: `1.5px solid ${selectedRoom.current_status === s ? STATUS_MAP[s].color : 'var(--border)'}`, background: 'transparent', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>
                    {STATUS_MAP[s].label}
                  </button>
                ))}
              </div>

              <div style={{ height: '1px', background: 'var(--border)' }} />

              <div>
                <h3 style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1rem' }}>Allotment</h3>
                {selectedRoom.current_status === 'OCCUPIED' ? (
                  <button onClick={() => handleUpdate(selectedRoom.id, { current_status: 'CLEANING', occupant_type: null, assigned_doctor: null, assigned_staff: null })} className="btn btn-secondary" style={{ width: '100%', color: '#ef4444' }}>Release & Clean Room</button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <select className="input" onChange={e => {
                      const [type, id] = e.target.value.split(':');
                      if (type && id) handleAllot(type, id);
                    }}>
                      <option value="">Assign to...</option>
                      <optgroup label="Patients">
                        {patients.map(p => <option key={p.id} value={`P:${p.id}`}>{p.name}</option>)}
                      </optgroup>
                      <optgroup label="Doctors">
                        {doctors.map(d => <option key={d.id} value={`D:${d.id}`}>{d.name}</option>)}
                      </optgroup>
                      <optgroup label="Staff">
                        {staff.map(s => <option key={s.id} value={`S:${s.id}`}>{s.name}</option>)}
                      </optgroup>
                    </select>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
