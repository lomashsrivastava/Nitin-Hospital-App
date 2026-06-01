import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IndianRupee, Users, Plus, Search, Calendar, 
  ChevronRight, Calculator, CheckCircle, Wallet, 
  Edit2, AlertCircle, CreditCard, X 
} from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function HRPayroll() {
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [staffFilter, setStaffFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Pagination for heavy staff list
  const [currentPage] = useState(1);
  const ITEMS_PER_PAGE = 50; 

  const [formData, setFormData] = useState({
    staff: '',
    basic_salary: '',
    bonus: '0',
    deductions: '0',
    pay_period_start: '',
    pay_period_end: '',
    payment_date: '',
    status: 'PENDING'
  });

  const fetchData = async () => {
    try {
      const [resPayroll, resStaff, resDept] = await Promise.all([
        api.get('/hospital/payroll/'),
        api.get('/hospital/staff/'),
        api.get('/hospital/departments/')
      ]);
      setPayrolls(resPayroll.data?.results || resPayroll.data || []);
      setStaff(resStaff.data?.results || resStaff.data || []);
      setDepartments(resDept.data?.results || resDept.data || []);
    } catch {
      toast.error('Failed to load HR data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreatePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.staff || !formData.basic_salary || !formData.pay_period_start || !formData.pay_period_end) {
      return toast.error('Please fill required fields');
    }
    try {
      const payload = {
        ...formData,
        staff: String(formData.staff),
        payment_date: formData.payment_date || null,
        net_salary: Number(formData.basic_salary) + Number(formData.bonus) - Number(formData.deductions)
      };
      await api.post('/hospital/payroll/', payload);
      toast.success('Payroll cycle generated!');
      setShowModal(false);
      fetchData();
      setFormData({ staff: '', basic_salary: '', bonus: '0', deductions: '0', pay_period_start: '', pay_period_end: '', payment_date: '', status: 'PENDING' });
      setStaffFilter('');
    } catch (err: any) {
      const detail = err.response?.data;
      const flattenErrors = (obj: any): string => {
        if (typeof obj === 'string') return obj;
        if (Array.isArray(obj)) return obj.map(flattenErrors).join(', ');
        if (typeof obj === 'object' && obj !== null) return Object.values(obj).map(flattenErrors).join(', ');
        return String(obj);
      };
      toast.error(detail ? flattenErrors(detail) : 'Failed to generate payroll');
    }
  };

  const filteredStaff = staff.filter(s => {
    const sName = s.name || '';
    const matchesSearch = sName.toLowerCase().includes(staffFilter.toLowerCase());
    const sDept = String(s.department?.id || s.department || '');
    const matchesDept = !deptFilter || sDept === deptFilter;
    return matchesSearch && matchesDept;
  });

  const handleAutoFillSalary = (staffId: string) => {
    const selectedStaff = staff.find(s => String(s.id?.id || s.id) === staffId);
    if(selectedStaff) {
       setFormData({ ...formData, staff: staffId, basic_salary: selectedStaff.salary || '0' });
    } else {
       setFormData({ ...formData, staff: staffId });
    }
  };

  const markPaid = async (id: any) => {
    try {
      const idStr = String(id?.id || id);
      await api.patch(`/hospital/payroll/${idStr}/`, { status: 'PAID', payment_date: new Date().toISOString().split('T')[0] });
      toast.success('Disbursement Completed!');
      fetchData();
    } catch { toast.error('Payment execution failed'); }
  };

  const deletePayroll = async (id: any) => {
    if (!window.confirm('Delete this payroll record?')) return;
    try {
      const idStr = String(id?.id || id);
      await api.delete(`/hospital/payroll/${idStr}/`);
      toast.success('Payroll record deleted');
      fetchData();
    } catch { toast.error('Deletion failed'); }
  };

  const filteredPayrolls = payrolls.filter(p => 
    (p.staff_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.staff_role || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Wallet size={28} className="text-gradient" style={{ color: 'var(--primary)' }} />
            <span className="text-gradient">HR & Payroll</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Administer staff compensation, deductions, and mass disbursement tracking.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Calculator size={18} /> Initialize Payroll
        </button>
      </header>

      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', position: 'relative' }}>
        <Search size={18} style={{ position: 'absolute', left: '2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input 
          type="text" className="input" placeholder="Search by staff name or role..." 
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          style={{ paddingLeft: '2.5rem', width: '100%' }} 
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem', flex: 1, overflowY: 'auto', paddingBottom: '2rem' }}>
        <AnimatePresence>
          {filteredPayrolls.slice(0, ITEMS_PER_PAGE).map((pay, idx) => (
            <motion.div 
              key={pay.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: idx * 0.05 }}
              className="card" style={{ padding: '1.5rem', borderTop: pay.status === 'PAID' ? '4px solid #10b981' : '4px solid #f59e0b' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                     <Users size={16} color="var(--primary)" /> {pay.staff_name}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>{pay.staff_role}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className={`badge ${pay.status === 'PAID' ? 'badge-success' : pay.status === 'PENDING' ? 'badge-warning' : 'badge-error'}`}>{pay.status}</span>
                  <button onClick={() => deletePayroll(pay.id)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '0.25rem' }}>
                    <Search size={16} /> 
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Net Salary</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)' }}>₹{pay.net_salary}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'right', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Base: ₹{pay.basic_salary}</span>
                  <span style={{ color: '#10b981' }}>Bonus: +₹{pay.bonus}</span>
                  <span style={{ color: '#ef4444' }}>Ded: -₹{pay.deductions}</span>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={14} /> {pay.pay_period_start} <ChevronRight size={14} /> {pay.pay_period_end}
                </span>
                {pay.status === 'PAID' && <span style={{ color: '#10b981', fontWeight: 600 }}>Paid on {pay.payment_date}</span>}
              </div>

              {pay.status === 'PENDING' && (
                <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                  <button onClick={() => markPaid(pay.id)} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                    <CreditCard size={18} /> Mark as Paid
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, padding: '2rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>Generate Payroll Manifest</h2>
                <button onClick={() => setShowModal(false)} className="btn btn-ghost" style={{ padding: '0.5rem' }}><X size={24} /></button>
              </div>

              <form onSubmit={handleCreatePayroll} style={{ display: 'grid', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="label">1. Department Filter</label>
                    <select className="input select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
                      <option value="">-- All Departments --</option>
                      {departments.map(d => {
                        const did = String(d.id?.id || d.id);
                        return <option key={did} value={did}>{d.name}</option>;
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="label">2. Search Staff Name</label>
                    <div style={{ position: 'relative' }}>
                      <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input type="text" placeholder="Type name..." className="input" style={{ paddingLeft: '2rem' }} value={staffFilter} onChange={e => setStaffFilter(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div>
                   <label className="label">3. Select Staff Member</label>
                   <select required className="input select" value={formData.staff} onChange={e => handleAutoFillSalary(e.target.value)}>
                     <option value="">-- Choose Employee ({filteredStaff.length} found) --</option>
                     {filteredStaff.map(s => {
                       const sid = String(s.id?.id || s.id);
                       return <option key={sid} value={sid}>{s.name} ({s.role})</option>;
                     })}
                   </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div><label className="label">Basic Salary</label><input type="number" required className="input" value={formData.basic_salary} onChange={e => setFormData({...formData, basic_salary: e.target.value})} /></div>
                  <div><label className="label">Bonus (₹)</label><input type="number" className="input" value={formData.bonus} onChange={e => setFormData({...formData, bonus: e.target.value})} /></div>
                  <div><label className="label">Deductions (₹)</label><input type="number" className="input" value={formData.deductions} onChange={e => setFormData({...formData, deductions: e.target.value})} /></div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div><label className="label">Period Start</label><input type="date" required className="input" value={formData.pay_period_start} onChange={e => setFormData({...formData, pay_period_start: e.target.value})} /></div>
                  <div><label className="label">Period End</label><input type="date" required className="input" value={formData.pay_period_end} onChange={e => setFormData({...formData, pay_period_end: e.target.value})} /></div>
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '1.25rem' }}>
                    Net: ₹{(Number(formData.basic_salary || 0) + Number(formData.bonus || 0) - Number(formData.deductions || 0)).toFixed(2)}
                  </div>
                  <button type="submit" className="btn btn-primary"><IndianRupee size={18}/> Generate Manifest</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
