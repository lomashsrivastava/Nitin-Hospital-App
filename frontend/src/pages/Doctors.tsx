import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Stethoscope, Plus, Search, Building2, Phone, Mail,
  Clock, CreditCard, X, Edit2, Trash2, Users, CheckCircle,
  AlertTriangle, ChevronDown
} from 'lucide-react';
import api from '../api/axios';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Department {
  id: string;
  name: string;
  description?: string;
}

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  department: string;
  department_name: string;
  contact_number: string;
  email: string;
  consultation_fee: string;
  opd_timings: string;
  is_active: boolean;
}

// ─── Variants ─────────────────────────────────────────────────────────────────
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const cardV     = { hidden: { opacity: 0, y: 18 },  show: { opacity: 1, y: 0 } };

const emptyDoctor = (): Partial<Doctor> => ({ is_active: true });
const emptyDept   = (): Partial<Department> => ({});

// ─── Reusable Modal wrapper ────────────────────────────────────────────────────
function Modal({ show, onClose, children }: { show: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        style={{ position: 'relative', zIndex: 101, width: '100%' }}
      >
        {children}
      </motion.div>
    </div>
  );
}

// ─── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type = 'success' }: { message: string; type?: 'success' | 'error' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
      style={{
        position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 300,
        background: type === 'success' ? 'linear-gradient(135deg,#0ea5e9,#2563eb)' : 'linear-gradient(135deg,#ef4444,#dc2626)',
        color: 'white', padding: '0.75rem 1.4rem', borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.25)', fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem'
      }}
    >
      {type === 'success' ? <CheckCircle size={17} /> : <AlertTriangle size={17} />}
      {message}
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Doctors() {
  const [doctors,     setDoctors]     = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [searchTerm,  setSearchTerm]  = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');

  // Doctor modal
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [formData,  setFormData]  = useState<Partial<Doctor>>(emptyDoctor());
  const [saving, setSaving] = useState(false);

  // Department modal (create / edit)
  const [showDeptModal,   setShowDeptModal]   = useState(false);
  const [deptFormData,    setDeptFormData]    = useState<Partial<Department>>(emptyDept());
  const [editingDept,     setEditingDept]     = useState<Department | null>(null);

  // Confirm delete modal
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'doctor' | 'dept'; id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ─── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [docsRes, deptsRes] = await Promise.all([
        api.get('/hospital/doctors/'),
        api.get('/hospital/departments/')
      ]);
      const docs  = (docsRes.data?.results  ?? docsRes.data  ?? []) as Doctor[];
      const depts = (deptsRes.data?.results ?? deptsRes.data ?? []) as Department[];
      setDoctors(docs.map(d => ({ ...d, id: String(d.id), department: String(d.department) })));
      setDepartments(depts.map(d => ({ ...d, id: String(d.id) })));
    } catch (err) {
      console.error('Failed to load data', err);
      showToast('Failed to load data from server', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Doctor Save (Create + Update) ─────────────────────────────────────────
  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.department) { showToast('Please select a department', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        name:             formData.name?.trim(),
        specialization:   formData.specialization?.trim(),
        department:       String(formData.department),
        consultation_fee: formData.consultation_fee,
        contact_number:   formData.contact_number || '',
        email:            formData.email || '',
        opd_timings:      formData.opd_timings || '',
        is_active:        formData.is_active ?? true,
      };

      if (formData.id) {
        // UPDATE — PATCH only the changed fields
        await api.patch(`/hospital/doctors/${formData.id}/`, payload);
        showToast('Doctor updated successfully!');
      } else {
        await api.post('/hospital/doctors/', payload);
        showToast('Doctor onboarded successfully!');
      }
      setShowDoctorModal(false);
      setFormData(emptyDoctor());
      fetchData();
    } catch (err: any) {
      const detail = err?.response?.data;
      console.error('Doctor save error:', detail);
      showToast(`Error: ${JSON.stringify(detail) || 'Could not save doctor'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Department Save (Create + Update) ─────────────────────────────────────
  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptFormData.name?.trim()) { showToast('Department name is required', 'error'); return; }
    setSaving(true);
    try {
      if (editingDept) {
        await api.patch(`/hospital/departments/${editingDept.id}/`, deptFormData);
        showToast('Department updated!');
      } else {
        await api.post('/hospital/departments/', deptFormData);
        showToast('Department created!');
      }
      setShowDeptModal(false);
      setDeptFormData(emptyDept());
      setEditingDept(null);
      fetchData();
    } catch (err: any) {
      console.error('Dept save error:', err?.response?.data);
      showToast('Error saving department.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Confirm Delete (both doctors and departments) ──────────────────────────
  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      if (confirmDelete.type === 'doctor') {
        await api.delete(`/hospital/doctors/${confirmDelete.id}/`);
        showToast('Doctor removed.');
        if (selectedDept !== 'all') {
          // stay on current filter
        }
      } else {
        await api.delete(`/hospital/departments/${confirmDelete.id}/`);
        showToast('Department deleted.');
        setSelectedDept('all');
      }
      setConfirmDelete(null);
      fetchData();
    } catch (err: any) {
      console.error('Delete error:', err?.response?.data);
      showToast('Could not delete. It may have associated records.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // ─── Open edit department ───────────────────────────────────────────────────
  const openEditDept = (dept: Department) => {
    setEditingDept(dept);
    setDeptFormData({ name: dept.name, description: dept.description || '' });
    setShowDeptModal(true);
  };

  // ─── Filter ─────────────────────────────────────────────────────────────────
  const filteredDoctors = doctors.filter(doc => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q
      || doc.name.toLowerCase().includes(q)
      || doc.specialization.toLowerCase().includes(q)
      || (doc.department_name ?? '').toLowerCase().includes(q);
    const matchDept = selectedDept === 'all' || String(doc.department) === String(selectedDept);
    return matchSearch && matchDept;
  });

  const deptStats = departments.map(d => ({
    ...d,
    count: doctors.filter(doc => String(doc.department) === String(d.id)).length
  }));

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
          <Stethoscope size={40} color="#0ea5e9" />
        </motion.div>
        <p style={{ color: 'var(--text-muted)' }}>Loading doctors...</p>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '3rem' }}>

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast message={toast.msg} type={toast.type} />}
      </AnimatePresence>

      {/* Confirm Delete Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <Modal show={!!confirmDelete} onClose={() => !deleting && setConfirmDelete(null)}>
            <div className="card" style={{ maxWidth: 420, margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <AlertTriangle size={28} color="#ef4444" />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.5rem' }}>Confirm Delete</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Are you sure you want to delete <strong>{confirmDelete.name}</strong>?
                {confirmDelete.type === 'dept' && ' All doctors in this department will lose their department assignment.'}
                <br />This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)} disabled={deleting}>Cancel</button>
                <button
                  className="btn"
                  style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: 'white', minWidth: 120 }}
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}
      >
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
            <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 5, repeat: Infinity }}
              style={{ background: 'linear-gradient(135deg,#0ea5e9,#2563eb)', padding: '0.5rem', borderRadius: '12px', color: 'white' }}
            >
              <Stethoscope size={28} />
            </motion.div>
            <span style={{ backgroundImage: 'linear-gradient(90deg,#0ea5e9,#2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Hospital Doctors
            </span>
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            {doctors.length} doctors · {departments.length} departments
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary"
            onClick={() => { setEditingDept(null); setDeptFormData(emptyDept()); setShowDeptModal(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Building2 size={17} /> Manage Departments
          </button>
          <button className="btn btn-primary"
            onClick={() => { setFormData(emptyDoctor()); setShowDoctorModal(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg,#0ea5e9,#2563eb)' }}
          >
            <Plus size={17} /> Add Doctor
          </button>
        </div>
      </motion.div>

      {/* ── Department Chips ─────────────────────────────────────────────────── */}
      {departments.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}
        >
          <button onClick={() => setSelectedDept('all')} style={chipStyle(selectedDept === 'all')}>
            All ({doctors.length})
          </button>
          {deptStats.map(dept => (
            <button key={dept.id} onClick={() => setSelectedDept(String(dept.id))} style={chipStyle(selectedDept === String(dept.id))}>
              {dept.name} ({dept.count})
            </button>
          ))}
        </motion.div>
      )}

      {/* ── Search + Dropdown ────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}
      >
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={17} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" className="input"
            placeholder="Search by name, specialization, or department..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingLeft: '2.75rem' }}
          />
        </div>
        <select className="input" style={{ width: '220px' }}
          value={selectedDept}
          onChange={e => setSelectedDept(e.target.value)}
        >
          <option value="all">All Departments</option>
          {departments.map(d => (
            <option key={d.id} value={String(d.id)}>{d.name}</option>
          ))}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
          <Users size={15} />
          <strong style={{ color: 'var(--text-primary)' }}>{filteredDoctors.length}</strong>&nbsp;result{filteredDoctors.length !== 1 ? 's' : ''}
        </div>
      </motion.div>

      {/* ── Empty State ──────────────────────────────────────────────────────── */}
      {filteredDoctors.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}
        >
          <Stethoscope size={48} style={{ marginBottom: '1rem', opacity: 0.25 }} />
          <p style={{ fontSize: '1.05rem', fontWeight: 600 }}>No doctors found</p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.4rem' }}>Try a different search term or department filter.</p>
        </motion.div>
      )}

      {/* ── Doctors Grid ─────────────────────────────────────────────────────── */}
      <motion.div variants={container} initial="hidden" animate="show"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}
      >
        <AnimatePresence mode="popLayout">
          {filteredDoctors.map(doc => (
            <motion.div key={doc.id} variants={cardV} layout exit={{ opacity: 0, scale: 0.88 }}
              whileHover={{ y: -4, boxShadow: '0 12px 30px rgba(14,165,233,0.16)' }}
              className="card"
              style={{ padding: '1.4rem', position: 'relative', overflow: 'hidden', borderTop: '4px solid #0ea5e9' }}
            >
              {/* Active dot */}
              {doc.is_active && (
                <span style={{ position: 'absolute', top: '1rem', right: '1rem', width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 3px rgba(16,185,129,0.2)' }} />
              )}

              <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'linear-gradient(135deg,#e0f2fe,#bae6fd)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7', fontWeight: 800, fontSize: '1.2rem', flexShrink: 0 }}>
                  {doc.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Dr. {doc.name}
                  </h3>
                  <p style={{ color: '#0284c7', fontSize: '0.78rem', fontWeight: 600, margin: '2px 0 0' }}>
                    {doc.specialization}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.15rem', flexShrink: 0 }}>
                  <button title="Edit doctor"
                    onClick={() => { setFormData({ ...doc, department: String(doc.department) }); setShowDoctorModal(true); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '5px', borderRadius: '6px' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button title="Delete doctor"
                    onClick={() => setConfirmDelete({ type: 'doctor', id: doc.id, name: `Dr. ${doc.name}` })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', padding: '5px', borderRadius: '6px' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <Info icon={<Building2 size={13} color="var(--text-muted)" />}>
                  <span style={{ background: 'var(--bg-secondary)', padding: '2px 9px', borderRadius: '10px', fontSize: '0.73rem', fontWeight: 600 }}>
                    {doc.department_name ?? 'N/A'}
                  </span>
                </Info>
                {doc.opd_timings && <Info icon={<Clock size={13} color="var(--text-muted)" />}>{doc.opd_timings}</Info>}
                {doc.contact_number && <Info icon={<Phone size={13} color="var(--text-muted)" />}>{doc.contact_number}</Info>}
                {doc.email && (
                  <Info icon={<Mail size={13} color="var(--text-muted)" />}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{doc.email}</span>
                  </Info>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem', paddingTop: '0.5rem', marginTop: '0.2rem', borderTop: '1px solid var(--border)' }}>
                  <CreditCard size={13} color="#10b981" />
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>₹{doc.consultation_fee}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.73rem' }}>Consultation</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* ══════ Add / Edit DOCTOR Modal ══════════════════════════════════════════ */}
      <AnimatePresence>
        {showDoctorModal && (
          <Modal show={showDoctorModal} onClose={() => !saving && setShowDoctorModal(false)}>
            <div className="card" style={{ maxWidth: 600, margin: '0 auto', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
                  {formData.id ? 'Edit Doctor' : 'Onboard Doctor'}
                </h2>
                <button onClick={() => setShowDoctorModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <X size={22} />
                </button>
              </div>

              <form onSubmit={handleSaveDoctor} style={{ display: 'grid', gap: '1rem' }}>
                <TwoCol>
                  <Field label="Full Name *">
                    <input required type="text" className="input" placeholder="e.g. Rahul Sharma"
                      value={formData.name ?? ''} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                  </Field>
                  <Field label="Specialization *">
                    <input required type="text" className="input" placeholder="e.g. Cardiologist"
                      value={formData.specialization ?? ''} onChange={e => setFormData({ ...formData, specialization: e.target.value })} />
                  </Field>
                </TwoCol>

                <TwoCol>
                  <Field label="Department *">
                    <select required className="input"
                      value={formData.department ?? ''}
                      onChange={e => setFormData({ ...formData, department: e.target.value })}
                    >
                      <option value="">— Select Department —</option>
                      {departments.map(d => (
                        <option key={d.id} value={String(d.id)}>{d.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Consultation Fee (₹) *">
                    <input required type="number" min="0" className="input" placeholder="500"
                      value={formData.consultation_fee ?? ''} onChange={e => setFormData({ ...formData, consultation_fee: e.target.value })} />
                  </Field>
                </TwoCol>

                <TwoCol>
                  <Field label="Phone Number">
                    <input type="tel" className="input" placeholder="9812345678"
                      value={formData.contact_number ?? ''} onChange={e => setFormData({ ...formData, contact_number: e.target.value })} />
                  </Field>
                  <Field label="Email Address">
                    <input type="email" className="input" placeholder="doctor@hospital.com"
                      value={formData.email ?? ''} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                  </Field>
                </TwoCol>

                <Field label="OPD Timings">
                  <select 
                    className="input" 
                    value={formData.opd_timings || ''} 
                    onChange={e => setFormData({ ...formData, opd_timings: e.target.value })}
                  >
                    <option value="">Select OPD Timing...</option>
                    <option value="10AM To 6PM">10AM To 6PM</option>
                  </select>
                </Field>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={formData.is_active ?? true}
                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })} />
                  Doctor is currently active
                </label>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '0.5rem' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowDoctorModal(false)} disabled={saving}>Cancel</button>
                  <button type="submit" className="btn btn-primary"
                    style={{ background: 'linear-gradient(135deg,#0ea5e9,#2563eb)', minWidth: 150 }}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : formData.id ? 'Update Doctor' : 'Onboard Doctor'}
                  </button>
                </div>
              </form>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ══════ Manage DEPARTMENTS Modal ══════════════════════════════════════════ */}
      <AnimatePresence>
        {showDeptModal && (
          <Modal show={showDeptModal} onClose={() => !saving && setShowDeptModal(false)}>
            <div className="card" style={{ maxWidth: 520, margin: '0 auto', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                  {editingDept ? 'Edit Department' : 'Create Department'}
                </h2>
                <button onClick={() => { setShowDeptModal(false); setEditingDept(null); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <X size={20} />
                </button>
              </div>

              {/* Existing departments list */}
              {!editingDept && departments.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Existing Departments
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                    {departments.map(dept => {
                      const docCount = doctors.filter(d => String(d.department) === String(dept.id)).length;
                      return (
                        <div key={dept.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.9rem', background: 'var(--bg-secondary)', borderRadius: '10px', gap: '0.75rem' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dept.name}</p>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{docCount} doctor{docCount !== 1 ? 's' : ''}</p>
                          </div>
                          <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                            <button title="Edit department" onClick={() => openEditDept(dept)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: '6px' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-primary)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button title="Delete department"
                              onClick={() => { setShowDeptModal(false); setConfirmDelete({ type: 'dept', id: dept.id, name: dept.name }); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', padding: '4px', borderRadius: '6px' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', marginTop: '1rem', paddingTop: '1rem' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Add New Department
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveDept} style={{ display: 'grid', gap: '1rem' }}>
                <Field label="Department Name *">
                  <input required type="text" className="input" placeholder="e.g. Cardiology"
                    value={deptFormData.name ?? ''} onChange={e => setDeptFormData({ ...deptFormData, name: e.target.value })} />
                </Field>
                <Field label="Description">
                  <textarea className="input" rows={2} placeholder="Brief description (optional)"
                    value={deptFormData.description ?? ''} onChange={e => setDeptFormData({ ...deptFormData, description: e.target.value })} />
                </Field>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button type="button" className="btn btn-ghost"
                    onClick={() => { setShowDeptModal(false); setEditingDept(null); setDeptFormData(emptyDept()); }}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : editingDept ? 'Update Department' : 'Create Department'}
                  </button>
                </div>
              </form>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Tiny helper components ───────────────────────────────────────────────────
function chipStyle(active: boolean): React.CSSProperties {
  return {
    padding: '5px 13px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.18s',
    border: active ? 'none' : '1px solid var(--border)',
    background: active ? 'linear-gradient(135deg,#0ea5e9,#2563eb)' : 'var(--bg-secondary)',
    color: active ? 'white' : 'var(--text-secondary)',
  };
}

function Info({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
      {icon}{children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label" style={{ display: 'block', marginBottom: '0.35rem' }}>{label}</label>
      {children}
    </div>
  );
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      {children}
    </div>
  );
}
