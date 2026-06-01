/**
 * Inventory Page - Premium inventory management with animations
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, AlertTriangle, Pill, X, Save, Box } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function Inventory() {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL, LOW_STOCK, EXPIRING
  const [showModal, setShowModal] = useState(false);
  const [editingMed, setEditingMed] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '', generic_name: '', category: 'TABLET', batch_number: '',
    mrp: '', purchase_price: '', selling_price: '', quantity: '', gst_rate: '12', expiry_date: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => { fetchMedicines(); }, []);

  const fetchMedicines = async () => {
    try {
      const { data } = await api.get('/inventory/medicines/');
      setMedicines(data.results || data || []);
    } catch { toast.error('Failed to load inventory'); }
  };

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
    if (e.target.value.length < 2) return fetchMedicines();
    try {
      const { data } = await api.get(`/inventory/medicines/search/?q=${e.target.value}`);
      setMedicines(data);
    } catch { /* ignore */ }
  };

  const filteredMeds = medicines.filter(m => {
    if (filter === 'LOW_STOCK') return m.quantity <= 10;
    if (filter === 'EXPIRING') return new Date(m.expiry_date).getTime() - new Date().getTime() < 90 * 24 * 60 * 60 * 1000;
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMed) await api.put(`/inventory/medicines/${editingMed.id}/`, formData);
      else await api.post('/inventory/medicines/', formData);
      toast.success(editingMed ? 'Medicine updated!' : 'Medicine added!');
      setShowModal(false);
      fetchMedicines();
    } catch (err: any) { 
        toast.error(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to save'); 
    }
  };

  const deleteMed = async (id: number) => {
    try {
      await api.delete(`/inventory/medicines/${id}/`);
      toast.success('Deleted successfully');
      fetchMedicines();
    } catch { toast.error('Delete failed'); }
  };

  const openForm = (med: any = null) => {
    setEditingMed(med);
    if (med) setFormData({ ...med, mrp: med.mrp.toString(), purchase_price: med.purchase_price.toString(), selling_price: med.selling_price.toString(), quantity: med.quantity.toString(), gst_rate: med.gst_rate.toString() });
    else setFormData({ name: '', generic_name: '', category: 'TABLET', batch_number: '', mrp: '', purchase_price: '', selling_price: '', quantity: '', gst_rate: '12', expiry_date: '' });
    setShowModal(true);
  };

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <Box size={28} className="text-gradient" style={{ color: 'var(--primary)' }} />
             <span className="text-gradient">Inventory</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{medicines.length} items</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-primary animate-pulse-ring" onClick={() => openForm()}>
          <Plus size={18} /> Add Medicine
        </motion.button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', flex: 1, border: '2px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
          <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
          <input type="text" placeholder="Search medicines..." value={search} onChange={handleSearch} style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 40px', border: 'none', background: 'transparent', color: 'var(--text-primary)', outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className={`btn shadow ${filter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`} style={{ border: filter === 'ALL' ? 'none' : '1px solid var(--border)' }} onClick={() => { setFilter('ALL'); setCurrentPage(1); }}>All</button>
          <button className={`btn shadow ${filter === 'LOW_STOCK' ? 'btn-warning' : 'btn-secondary'}`} style={{ border: filter === 'LOW_STOCK' ? 'none' : '1px solid var(--border)', color: filter === 'LOW_STOCK' ? '#fff' : 'var(--warning)', background: filter === 'LOW_STOCK' ? 'var(--warning)' : 'var(--bg-secondary)' }} onClick={() => { setFilter('LOW_STOCK'); setCurrentPage(1); }}><AlertTriangle size={16} /> Low Stock</button>
          <button className={`btn shadow ${filter === 'EXPIRING' ? 'btn-danger' : 'btn-secondary'}`} style={{ border: filter === 'EXPIRING' ? 'none' : '1px solid var(--border)', color: filter === 'EXPIRING' ? '#fff' : 'var(--error)', background: filter === 'EXPIRING' ? 'var(--error)' : 'var(--bg-secondary)' }} onClick={() => { setFilter('EXPIRING'); setCurrentPage(1); }}><p style={{display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: 'currentColor'}}></p> Expiring</button>
        </div>
      </motion.div>

      <motion.div className="card table-container" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <table className="table">
          <thead><tr><th>Medicine</th><th>Batch</th><th>Category</th><th>Purchase Price</th><th>MRP</th><th>Sell Price</th><th>Stock</th><th>GST</th><th>Expiry</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            <AnimatePresence>
              {filteredMeds.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((med) => (
                <motion.tr key={med.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{med.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{med.generic_name}</div>
                  </td>
                  <td>{med.batch_number}</td>
                  <td><span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary)' }}>{med.category}</span></td>
                  <td>₹{med.purchase_price}</td>
                  <td>₹{med.mrp}</td>
                  <td style={{ fontWeight: 600 }}>₹{med.selling_price}</td>
                  <td style={{ fontWeight: 700, color: med.quantity <= 10 ? 'var(--error)' : 'var(--success)' }}>{med.quantity}</td>
                  <td><span className="badge badge-primary">{med.gst_rate}%</span></td>
                  <td>{med.expiry_date}</td>
                  <td><span className={`badge ${med.quantity <= 10 ? 'badge-error' : 'badge-success'}`}>{med.quantity <= 10 ? 'LOW' : 'OK'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn-icon" style={{ background: 'transparent', color: 'var(--text-muted)' }} onClick={() => openForm(med)}><Edit2 size={16} /></button>
                      <button className="btn-icon" style={{ background: 'transparent', color: 'var(--error)' }} onClick={() => deleteMed(med.id)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </motion.div>

      {filteredMeds.length > ITEMS_PER_PAGE && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
          <button 
            className="btn btn-secondary" 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', fontWeight: 600 }}>
            Page {currentPage} of {Math.ceil(filteredMeds.length / ITEMS_PER_PAGE)}
          </span>
          <button 
            className="btn btn-secondary" 
            disabled={currentPage === Math.ceil(filteredMeds.length / ITEMS_PER_PAGE)}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="success-overlay">
            <motion.div className="card" style={{ width: '100%', maxWidth: 670, padding: 0 }} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.25rem', borderBottom: '1px solid var(--border)', background: 'linear-gradient(to right, rgba(99,102,241,0.1), transparent)' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{editingMed ? 'Edit' : 'Add'} Medicine</h2>
                <button className="btn-icon btn-ghost" onClick={() => setShowModal(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div style={{ gridColumn: 'span 2' }}><label className="label">Name</label><input required className="input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                <div><label className="label">Category</label>
                  <select className="input select" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    <option value="TABLET">Tablet</option><option value="SYRUP">Syrup</option><option value="INJECTION">Injection</option><option value="CREAM">Cream</option><option value="OTHER">Other</option>
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2' }}><label className="label">Generic Name (optional)</label><input className="input" value={formData.generic_name} onChange={e => setFormData({...formData, generic_name: e.target.value})} /></div>
                <div><label className="label">Batch Number</label><input required className="input" value={formData.batch_number} onChange={e => setFormData({...formData, batch_number: e.target.value})} /></div>
                
                <div><label className="label">Purchase Price (₹)</label><input type="number" step="0.01" required className="input" value={formData.purchase_price} onChange={e => setFormData({...formData, purchase_price: e.target.value})} /></div>
                <div><label className="label">MRP (₹)</label><input type="number" step="0.01" required className="input" value={formData.mrp} onChange={e => setFormData({...formData, mrp: e.target.value})} /></div>
                <div><label className="label">Selling Price (₹)</label><input type="number" step="0.01" required className="input" value={formData.selling_price} onChange={e => setFormData({...formData, selling_price: e.target.value})} /></div>
                <div><label className="label">Quantity</label><input type="number" required className="input" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} /></div>
                <div><label className="label">GST Rate (%)</label><select className="input select" value={formData.gst_rate} onChange={e => setFormData({...formData, gst_rate: e.target.value})}><option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option></select></div>
                <div><label className="label">Expiry Date</label><input type="date" required className="input" value={formData.expiry_date} onChange={e => setFormData({...formData, expiry_date: e.target.value})} /></div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary"><Save size={18}/> Save Medicine</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
