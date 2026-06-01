import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Search, Building2, Phone, Mail, Clock, ShieldCheck, X, Edit2, Trash2 } from 'lucide-react';
import api from '../api/axios';

interface Department {
  id: number;
  name: string;
  description: string;
}

interface Staff {
  id: string;
  name: string;
  role: string;
  gender: string;
  department: string;
  department_name: string;
  contact_number: string;
  email: string;
  salary: string;
  shift_timings: string;
  is_active: boolean;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function Staff() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string | 'all'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [formData, setFormData] = useState<Partial<Staff>>({ is_active: true, gender: 'M' });
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 24;

  const fetchData = async () => {
    try {
      const [staffRes, deptsRes] = await Promise.all([
        api.get('/hospital/staff/'),
        api.get('/hospital/departments/')
      ]);
      setStaffList(staffRes.data?.results || staffRes.data || []);
      setDepartments(deptsRes.data?.results || deptsRes.data || []);
    } catch (error) {
      console.error('Error fetching staff data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await api.put(`/hospital/staff/${formData.id}/`, formData);
      } else {
        await api.post('/hospital/staff/', formData);
      }
      setShowStaffModal(false);
      setFormData({ is_active: true, gender: 'M' });
      fetchData();
    } catch (error) {
      console.error('Error saving staff:', error);
    }
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    if (!window.confirm(`Remove "${name}" from staff? This cannot be undone.`)) return;
    setDeletingId(id);
    setError(null);
    try {
      await api.delete(`/hospital/staff/${id}/`);
      setStaffList(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to delete staff member';
      setError(msg);
      console.error('Error deleting staff:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredStaff = staffList.filter(s => {
    const matchesSearch = (s.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                          (s.role?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === 'all' || String(s.department) === selectedDept;
    return matchesSearch && matchesDept;
  });

  if (loading) return <div className="flex items-center justify-center h-full">Loading staff...</div>;

  return (
    <div style={{ paddingBottom: '2rem' }}>
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)',
          borderRadius: 'var(--radius)', padding: '0.75rem 1rem', marginBottom: '1rem',
          color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          ⚠️ {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', fontSize: '1.1rem' }}>×</button>
        </div>
      )}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}
      >
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <motion.div
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 5, repeat: Infinity }}
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #d946ef)', padding: '0.5rem', borderRadius: '12px', color: 'white' }}
            >
              <Users size={28} />
            </motion.div>
            <span className="text-gradient" style={{ backgroundImage: 'linear-gradient(90deg, #8b5cf6, #d946ef)' }}>Hospital Staff</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Manage Nurses, Technicians, Support Staff, and Shifts</p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={() => { setFormData({ is_active: true, gender: 'M' }); setShowStaffModal(true); }} style={{ gap: '0.5rem', background: 'linear-gradient(135deg, #8b5cf6, #d946ef)' }}>
            <Plus size={18} /> Add Staff
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="card" style={{ padding: '1rem', marginBottom: '2rem', display: 'flex', gap: '1rem' }}
      >
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search staff by name, role or phone..." 
            className="input"
            value={searchTerm}
            onChange={(e) => {
               setSearchTerm(e.target.value);
               setCurrentPage(1);
            }}
            style={{ width: '100%', paddingLeft: '2.75rem' }}
          />
        </div>
        <select 
          className="input" 
          style={{ width: '250px' }}
          value={selectedDept}
          onChange={(e) => {
            setSelectedDept(e.target.value === 'all' ? 'all' : e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="all">All Departments</option>
          {departments.map(d => {
            const did = String(d.id?.id || d.id);
            return <option key={did} value={did}>{d.name}</option>;
          })}
        </select>
      </motion.div>

      {/* Staff Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}
      >
        <AnimatePresence>
          {filteredStaff.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((staffMember) => (
            <motion.div
              key={staffMember.id}
              variants={item}
              layout
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(139, 92, 246, 0.2)' }}
              className="card"
              style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden', borderLeft: '4px solid #8b5cf6' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ 
                    width: 50, height: 50, borderRadius: '50%', 
                    background: staffMember.gender === 'F' ? 'linear-gradient(135deg, #fce7f3, #fbcfe8)' : 'linear-gradient(135deg, #ede9fe, #ddd6fe)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: staffMember.gender === 'F' ? '#db2777' : '#7c3aed', fontWeight: 800, fontSize: '1.25rem'
                  }}>
                    {staffMember.name.charAt(0)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{staffMember.name}</h3>
                    <p style={{ color: '#8b5cf6', fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>{staffMember.role}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => { setFormData(staffMember); setShowStaffModal(true); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteStaff(staffMember.id, staffMember.name)}
                    disabled={deletingId === staffMember.id}
                    style={{
                      background: 'transparent', border: 'none', cursor: deletingId === staffMember.id ? 'wait' : 'pointer',
                      color: 'var(--error)', opacity: deletingId === staffMember.id ? 0.5 : 1
                    }}
                    title="Remove staff member"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <Building2 size={16} color="var(--text-muted)" /> 
                  <span style={{ background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                    {staffMember.department_name || 'No Dept'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <Clock size={16} color="var(--text-muted)" /> {staffMember.shift_timings || 'Not Specified'}
                </div>
                {staffMember.contact_number && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <Phone size={16} color="var(--text-muted)" /> {staffMember.contact_number}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                  <ShieldCheck size={16} color="#8b5cf6" /> 
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Salary: ₹{staffMember.salary}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {filteredStaff.length > ITEMS_PER_PAGE && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
          <button 
            className="btn btn-secondary" 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', fontWeight: 600 }}>
            Page {currentPage} of {Math.ceil(filteredStaff.length / ITEMS_PER_PAGE)}
          </span>
          <button 
            className="btn btn-secondary" 
            disabled={currentPage === Math.ceil(filteredStaff.length / ITEMS_PER_PAGE)}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      {/* Add/Edit Staff Modal */}
      <AnimatePresence>
        {showStaffModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
              onClick={() => setShowStaffModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="card" style={{ position: 'relative', width: '100%', maxWidth: '600px', padding: '2rem', zIndex: 101 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{formData.id ? 'Edit Staff File' : 'Register New Staff'}</h2>
                <button onClick={() => setShowStaffModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={24} /></button>
              </div>
              
              <form onSubmit={handleSaveStaff} style={{ display: 'grid', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="label">Full Name</label>
                    <input required type="text" className="input" placeholder="e.g. Ramesh Kumar" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="label">Role / Job Title</label>
                    <input required type="text" className="input" placeholder="e.g. Ward Boy" value={formData.role || ''} onChange={e => setFormData({...formData, role: e.target.value})} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="label">Gender</label>
                    <select required className="input" value={formData.gender || 'M'} onChange={e => setFormData({...formData, gender: e.target.value})}>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="O">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Department</label>
                    <select className="input" value={formData.department || ''} onChange={e => setFormData({...formData, department: e.target.value || undefined})}>
                      <option value="">No specific department...</option>
                      {departments.map(d => {
                        const did = String(d.id?.id || d.id);
                        return <option key={did} value={did}>{d.name}</option>;
                      })}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="label">Phone Number</label>
                    <input type="text" className="input" value={formData.contact_number || ''} onChange={e => setFormData({...formData, contact_number: e.target.value})} />
                  </div>
                  <div>
                    <label className="label">Salary / Wage (₹)</label>
                    <input required type="number" className="input" value={formData.salary || ''} onChange={e => setFormData({...formData, salary: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label className="label">Shift Timings</label>
                  <select 
                    className="input" 
                    value={formData.shift_timings || ''} 
                    onChange={e => setFormData({...formData, shift_timings: e.target.value})}
                  >
                    <option value="">Select Shift Timing...</option>
                    <option value="Morning Shift (6AM - 2PM)">Morning Shift (6AM - 2PM)</option>
                    <option value="Evening Shift (2PM - 10PM)">Evening Shift (2PM - 10PM)</option>
                    <option value="Night Shift (10PM - 6AM)">Night Shift (10PM - 6AM)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowStaffModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #8b5cf6, #d946ef)' }}>Save Employee Record</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
