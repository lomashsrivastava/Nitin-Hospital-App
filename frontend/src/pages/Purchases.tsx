import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Save, ShoppingBag, Truck, UserPlus, X } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function Purchases() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [items, setItems] = useState([{ medicine_id: '', quantity: 1, unit_price: 0 }]);
  const [submitting, setSubmitting] = useState(false);

  // New supplier modal
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', phone: '', email: '', gstin: '', address: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    Promise.all([
      api.get('/inventory/suppliers/'),
      api.get('/inventory/medicines/')
    ]).then(([resSuppliers, resMedicines]) => {
      setSuppliers(resSuppliers.data.results || resSuppliers.data || []);
      setMedicines(resMedicines.data.results || resMedicines.data || []);
    }).catch(() => toast.error('Failed to load data'));
  };

  const addItem = () => setItems([...items, { medicine_id: '', quantity: 1, unit_price: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, val: any) => {
    const newItems = [...items];
    (newItems[i] as any)[field] = val;
    setItems(newItems);
  };

  const total = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/inventory/suppliers/', newSupplier);
      toast.success('Supplier added!');
      setSuppliers([...suppliers, res.data]);
      setSupplierId(res.data.id.toString());
      setShowSupplierModal(false);
      setNewSupplier({ name: '', phone: '', email: '', gstin: '', address: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to add supplier');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !invoiceNumber || items.some(i => !i.medicine_id)) {
      toast.error('Fill required fields'); return;
    }
    setSubmitting(true);
    
    // Prepare items for backend (requires medicine_name and unit_price)
    const payloadItems = items.map(item => {
      const med = medicines.find(m => m.id.toString() === item.medicine_id.toString());
      return {
        medicine_id: med.id,
        medicine_name: med.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        gst_rate: med.gst_rate || 12,
        batch_number: med.batch_number || ''
      };
    });

    try {
      await api.post('/purchases/', {
        supplier_id: supplierId,
        invoice_number: invoiceNumber,
        items: payloadItems
      });
      toast.success('Purchase recorded! Stock updated.');
      setSupplierId(''); setInvoiceNumber('');
      setItems([{ medicine_id: '', quantity: 1, unit_price: 0 }]);
      fetchData(); // Refresh medicines stock
    } catch (err: any) { 
      toast.error(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to record purchase'); 
    }
    setSubmitting(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
         <ShoppingBag size={28} className="text-gradient" style={{ color: 'var(--primary)' }} />
         <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }} className="text-gradient">Purchases</h1>
      </div>

      <motion.div className="card" initial={{ y: 20 }} animate={{ y: 0 }} style={{ padding: '2rem' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="label"><Truck size={14} style={{display:'inline', marginBottom:-2}}/> Supplier</label>
                <button type="button" onClick={() => setShowSupplierModal(true)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <UserPlus size={12} /> Add New
                </button>
              </div>
              <select required className="input select" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">Select Supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Invoice Number</label>
              <input required type="text" className="input" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
            </div>
          </div>

          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Items</h3>
          
          <AnimatePresence>
            {items.map((item, i) => (
              <motion.div key={i} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '1rem', alignItems: 'end', marginBottom: '1rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div>
                  <label className="label">Medicine</label>
                  <select required className="input select" value={item.medicine_id} onChange={e => updateItem(i, 'medicine_id', e.target.value)}>
                    <option value="">Select Medicine</option>
                    {medicines.map(m => <option key={m.id} value={m.id}>{m.name} (Cur: {m.quantity})</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Qty</label>
                  <input required type="number" min="1" className="input" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="label">Cost/Unit</label>
                  <input required type="number" step="0.01" min="0" className="input" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', height: 42 }}>
                  <motion.button type="button" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => removeItem(i)} disabled={items.length === 1} className="btn-icon" style={{ background: 'var(--error-bg)', color: 'var(--error)', border: 'none', width: 36, height: 36 }}>
                    <Trash2 size={18} />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={{ display: 'inline-block' }}>
            <button type="button" className="btn btn-secondary" onClick={addItem} style={{ marginBottom: '1.5rem', borderStyle: 'dashed' }}>
              <Plus size={16} /> Add Another Item
            </button>
          </motion.div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.5rem', borderTop: '2px solid var(--border)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>Total: <span className="text-gradient">₹{total.toFixed(2)}</span></div>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" disabled={submitting} className="btn btn-primary" style={{ padding: '0.875rem 2rem', fontSize: '1rem' }}>
              {submitting ? 'Saving...' : <><Save size={18} /> Record Purchase</>}
            </motion.button>
          </div>
        </form>
      </motion.div>

      {/* Add Supplier Modal */}
      <AnimatePresence>
        {showSupplierModal && (
          <div className="success-overlay">
            <motion.div className="card" style={{ width: '100%', maxWidth: 500, padding: 0 }} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.25rem', borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Add New Supplier</h2>
                <button className="btn-icon btn-ghost" onClick={() => setShowSupplierModal(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleSupplierSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div><label className="label">Supplier Name *</label><input required className="input" value={newSupplier.name} onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div><label className="label">Phone</label><input className="input" value={newSupplier.phone} onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})} /></div>
                  <div><label className="label">GSTIN</label><input className="input" value={newSupplier.gstin} onChange={e => setNewSupplier({...newSupplier, gstin: e.target.value})} /></div>
                </div>
                <div><label className="label">Email</label><input type="email" className="input" value={newSupplier.email} onChange={e => setNewSupplier({...newSupplier, email: e.target.value})} /></div>
                <div><label className="label">Address</label><textarea className="input" style={{resize: 'vertical', minHeight: 80}} value={newSupplier.address} onChange={e => setNewSupplier({...newSupplier, address: e.target.value})} /></div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowSupplierModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary"><UserPlus size={18}/> Add Supplier</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
