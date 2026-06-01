import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Pill, Search, DollarSign, PackageOpen, Tag, XCircle, 
  ShoppingCart, History, RotateCcw, Users, FileText, 
  CheckCircle2, AlertCircle, ArrowRight, Printer, Trash2, Plus, Info
} from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

type Tab = 'dispense' | 'retail' | 'history' | 'inventory' | 'returns';

export default function Pharmacy() {
  const [activeTab, setActiveTab] = useState<Tab>('dispense');
  const [loading, setLoading] = useState(false);

  // --- Global State ---
  const [patients, setPatients] = useState<any[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  
  // --- New Sale State (Prescription or Retail) ---
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [selectedPrescriptionIds, setSelectedPrescriptionIds] = useState<string[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [medSearch, setMedSearch] = useState('');
  const [medResults, setMedResults] = useState<any[]>([]);
  
  // --- Billing State ---
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  // --- History & Returns State ---
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // --- Inventory State ---
  const [inventory, setInventory] = useState<any[]>([]);
  const [invSearch, setInvSearch] = useState('');

  // --- Effects ---
  useEffect(() => {
    if (activeTab === 'inventory') fetchInventory();
    if (activeTab === 'history') fetchInvoices();
  }, [activeTab, invSearch]);

  const fetchInventory = async () => {
    try {
      const res = await api.get(`/inventory/medicines/?search=${invSearch}`);
      setInventory(res.data?.results || res.data || []);
    } catch (e) {
      toast.error('Failed to load inventory');
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await api.get('/billing/invoices/');
      setInvoices(res.data?.results || res.data || []);
    } catch (e) {
      toast.error('Failed to load sales history');
    }
  };

  const handlePatientSearch = async (val: string) => {
    setPatientSearch(val);
    if (val.length < 2) {
      setPatients([]);
      return;
    }
    try {
      const res = await api.get(`/hospital/patients/?search=${val}`);
      setPatients(res.data?.results || res.data || []);
    } catch (e) {}
  };

  const selectPatient = async (patient: any) => {
    setSelectedPatient(patient);
    setPatients([]);
    setPatientSearch(patient.name);
    // Fetch prescriptions
    try {
      const res = await api.get(`/hospital/patients/${patient.id}/prescriptions/`);
      setPrescriptions(res.data || []);
    } catch (e) {
      toast.error('Failed to load prescriptions');
    }
  };

  const addToCartFromPrescription = async (presc: any) => {
    setLoading(true);
    try {
      // Suggest batches for this medicine
      const res = await api.get(`/inventory/medicines/suggest_batches/?name=${presc.medicine_name}`);
      const batches = res.data || [];
      
      if (batches.length === 0) {
        toast.error(`No stock available for ${presc.medicine_name}`);
        setLoading(false);
        return;
      }

      const bestBatch = batches[0]; // FIFO: Earliest expiry
      
      // Check if already in cart
      const existing = cart.find(item => item.id === bestBatch.id);
      if (existing) {
        toast.error(`${presc.medicine_name} is already in the cart`);
      } else {
        setCart([...cart, {
          ...bestBatch,
          presc_id: presc.id,
          request_qty: 1, // Default 1, can be adjusted
          dosage: presc.dosage,
          frequency: presc.frequency
        }]);
        if (!selectedPrescriptionIds.includes(presc.id)) {
          setSelectedPrescriptionIds([...selectedPrescriptionIds, presc.id]);
        }
      }
    } catch (e) {
      toast.error('Error matching inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleMedSearch = async (val: string) => {
    setMedSearch(val);
    if (val.length < 2) {
      setMedResults([]);
      return;
    }
    try {
      const res = await api.get(`/inventory/medicines/search/?q=${val}`);
      setMedResults(res.data || []);
    } catch (e) {}
  };

  const addToCartDirect = (med: any) => {
    const existing = cart.find(item => item.id === med.id);
    if (existing) {
      setCart(cart.map(item => item.id === med.id ? { ...item, request_qty: item.request_qty + 1 } : item));
    } else {
      setCart([...cart, { ...med, request_qty: 1 }]);
    }
    setMedResults([]);
    setMedSearch('');
  };

  const removeFromCart = (id: string, prescId?: string) => {
    setCart(cart.filter(item => item.id !== id));
    if (prescId) {
      setSelectedPrescriptionIds(selectedPrescriptionIds.filter(pid => pid !== prescId));
    }
  };

  const updateCartQty = (id: string, qty: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        if (qty > item.quantity) {
          toast.error(`Only ${item.quantity} units available`);
          return item;
        }
        return { ...item, request_qty: Math.max(1, qty) };
      }
      return item;
    }));
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.selling_price * item.request_qty), 0);
    const tax = cart.reduce((sum, item) => {
      const lineTotal = item.selling_price * item.request_qty;
      return sum + (lineTotal * (item.gst_rate / 100));
    }, 0);
    const total = subtotal + tax - discount;
    return { subtotal, tax, total };
  };

  const submitSale = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    const { subtotal } = calculateTotals();
    
    const payload = {
      patient_id: selectedPatient?.id,
      customer_name: selectedPatient?.name || 'Walk-in Customer',
      customer_phone: selectedPatient?.contact_number || '',
      payment_method: paymentMethod,
      discount_type: 'FIXED',
      discount_value: discount,
      items: cart.map(item => ({
        medicine_id: item.id,
        quantity: item.request_qty,
        unit_price: item.selling_price,
        gst_rate: item.gst_rate
      })),
      prescription_ids: selectedPrescriptionIds
    };

    try {
      const res = await api.post('/billing/invoices/', payload);
      toast.success('Sale completed successfully!');
      // Reset state
      setCart([]);
      setSelectedPatient(null);
      setPrescriptions([]);
      setSelectedPrescriptionIds([]);
      setDiscount(0);
      setPatientSearch('');
      // Print bill or show modal? For now just success.
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to complete sale');
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (invoiceId: string, items: any[]) => {
    try {
      await api.post(`/billing/invoices/${invoiceId}/return_items/`, { items });
      toast.success('Items returned and stock updated');
      fetchInvoices();
    } catch (e) {
      toast.error('Return failed');
    }
  };

  // --- Sub-components ---

  const Sidebar = () => (
    <div style={{ width: '260px', background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '1rem', gap: '0.5rem' }}>
      <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pharmacy Menu</h3>
      <MenuButton active={activeTab === 'dispense'} onClick={() => setActiveTab('dispense')} icon={<Pill size={18}/>} label="Smart Dispense" />
      <MenuButton active={activeTab === 'retail'} onClick={() => setActiveTab('retail')} icon={<ShoppingCart size={18}/>} label="Retail Sale" />
      <MenuButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History size={18}/>} label="Sales History" />
      <MenuButton active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} icon={<PackageOpen size={18}/>} label="Inventory Control" />
      <MenuButton active={activeTab === 'returns'} onClick={() => setActiveTab('returns')} icon={<RotateCcw size={18}/>} label="Returns & Refunds" />
    </div>
  );

  const MenuButton = ({ active, onClick, icon, label }: any) => (
    <button onClick={onClick} style={{ 
      display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
      background: active ? 'rgba(20,184,166,0.1)' : 'transparent',
      color: active ? '#14b8a6' : 'var(--text-secondary)',
      fontWeight: active ? 700 : 500,
      transition: 'all 0.2s'
    }}>
      {icon} {label}
    </button>
  );

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 80px)', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      <Sidebar />
      
      <main style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
        <AnimatePresence mode="wait">
          
          {/* --- SMART DISPENSE TAB --- */}
          {activeTab === 'dispense' && (
            <motion.div key="dispense" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 style={{ margin: 0, color: 'var(--text-primary)' }}>Prescription Dispensing</h1>
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>Load patient records to auto-map medications.</p>
                </div>
                <div style={{ padding: '0.5rem 1rem', background: '#14b8a6', color: 'white', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>STEP 1: PATIENT SELECTION</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  {/* Patient Search */}
                  <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', position: 'relative' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Search Patient (Name or Phone)</label>
                    <div style={{ position: 'relative' }}>
                      <Users size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input type="text" placeholder="Start typing name..." value={patientSearch} onChange={e => handlePatientSearch(e.target.value)} style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px' }} />
                    </div>
                    {patients.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: '1.5rem', right: '1.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '0 0 8px 8px', zIndex: 10, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}>
                        {patients.map(p => (
                          <div key={p.id} onClick={() => selectPatient(p)} style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)' }}>
                            <span>{p.name} <small style={{ color: 'var(--text-muted)' }}>({p.contact_number})</small></span>
                            <ArrowRight size={14} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Prescription Loading */}
                  {selectedPatient && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <h3 style={{ margin: 0, color: '#14b8a6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={18}/> Active Prescriptions</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                        {prescriptions.map(presc => (
                          <motion.div key={presc.id} whileHover={{ scale: 1.02 }} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem', position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{presc.medicine_name}</span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(presc.date).toLocaleDateString()}</span>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{presc.dosage} | {presc.frequency}</div>
                            <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.75rem', color: '#14b8a6' }}>Dr. {presc.doctor_name}</span>
                              <button onClick={() => addToCartFromPrescription(presc)} style={{ padding: '0.4rem 0.8rem', background: '#14b8a6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Dispense Now</button>
                            </div>
                          </motion.div>
                        ))}
                        {prescriptions.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1/-1' }}>No pending prescriptions found for this patient.</div>}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Billing & Cart Summary */}
                <CartSection cart={cart} updateCartQty={updateCartQty} removeFromCart={removeFromCart} calculateTotals={calculateTotals} discount={discount} setDiscount={setDiscount} paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} submitSale={submitSale} loading={loading} />
              </div>
            </motion.div>
          )}

          {/* --- RETAIL SALE TAB --- */}
          {activeTab === 'retail' && (
            <motion.div key="retail" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 style={{ margin: 0, color: 'var(--text-primary)' }}>Direct Retail Sale</h1>
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>Process over-the-counter sales without prescriptions.</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  {/* Medicine Search */}
                  <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', position: 'relative' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Search Medicine (Name or Barcode)</label>
                    <div style={{ position: 'relative' }}>
                      <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input type="text" placeholder="Type medicine name..." value={medSearch} onChange={e => handleMedSearch(e.target.value)} style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px' }} />
                    </div>
                    
                    {medResults.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: '1.5rem', right: '1.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '0 0 8px 8px', zIndex: 10, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)', maxHeight: '300px', overflowY: 'auto' }}>
                        {medResults.map(m => (
                          <div key={m.id} onClick={() => addToCartDirect(m)} style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)' }}>
                            <div>
                              <div style={{ fontWeight: 600 }}>{m.name} <small style={{ color: '#14b8a6' }}>Batch: {m.batch_number}</small></div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expiry: {m.expiry_date} | Stock: {m.quantity}</div>
                            </div>
                            <div style={{ fontWeight: 700 }}>₹{m.selling_price}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ background: 'rgba(20,184,166,0.05)', border: '1px dashed #14b8a6', borderRadius: '12px', padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Info size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <p>Search and select medicines to add them to the retail cart.</p>
                  </div>
                </div>

                <CartSection cart={cart} updateCartQty={updateCartQty} removeFromCart={removeFromCart} calculateTotals={calculateTotals} discount={discount} setDiscount={setDiscount} paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} submitSale={submitSale} loading={loading} />
              </div>
            </motion.div>
          )}

          {/* --- INVENTORY TAB --- */}
          {activeTab === 'inventory' && (
            <motion.div key="inventory" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 style={{ margin: 0, color: 'var(--text-primary)' }}>Medicine Inventory</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ position: 'relative', width: '250px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input type="text" placeholder="Search inventory..." value={invSearch} onChange={e => setInvSearch(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.25rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '6px' }} />
                  </div>
                  <button style={{ padding: '0.5rem 1rem', background: '#14b8a6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Plus size={16}/> Add Stock</button>
                </div>
               </div>
               <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'rgba(20,184,166,0.1)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <tr>
                        <th style={{ padding: '1rem' }}>Medicine Name</th>
                        <th style={{ padding: '1rem' }}>Batch</th>
                        <th style={{ padding: '1rem' }}>Expiry</th>
                        <th style={{ padding: '1rem' }}>Stock</th>
                        <th style={{ padding: '1rem' }}>MRP</th>
                        <th style={{ padding: '1rem' }}>Selling Price</th>
                        <th style={{ padding: '1rem' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                      {inventory.map(m => (
                        <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '1rem', fontWeight: 600 }}>{m.name}</td>
                          <td style={{ padding: '1rem' }}><code style={{ background: 'var(--bg-primary)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{m.batch_number}</code></td>
                          <td style={{ padding: '1rem', color: new Date(m.expiry_date) < new Date() ? '#ef4444' : 'inherit' }}>{m.expiry_date}</td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', background: m.quantity < 10 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: m.quantity < 10 ? '#ef4444' : '#10b981', fontWeight: 700 }}>{m.quantity}</span>
                          </td>
                          <td style={{ padding: '1rem' }}>₹{m.mrp}</td>
                          <td style={{ padding: '1rem', color: '#14b8a6', fontWeight: 700 }}>₹{m.selling_price}</td>
                          <td style={{ padding: '1rem' }}><button className="btn btn-ghost"><Tag size={16}/></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </motion.div>
          )}

          {/* --- HISTORY TAB --- */}
          {activeTab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h1 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Sales Transactions</h1>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
                {invoices.map(inv => (
                  <div key={inv.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{inv.invoice_number}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(inv.created_at).toLocaleString()}</div>
                      </div>
                      <div style={{ padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: inv.status === 'COMPLETED' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: inv.status === 'COMPLETED' ? '#10b981' : '#ef4444' }}>{inv.status}</div>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Customer: <strong>{inv.customer_name}</strong></div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Method: {inv.payment_method}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#14b8a6' }}>₹{inv.total}</div>
                      <button onClick={() => window.open(`${api.defaults.baseURL}/billing/invoices/${inv.id}/pdf/`, '_blank')} style={{ padding: '0.5rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '6px', cursor: 'pointer' }}><Printer size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* --- RETURNS TAB --- */}
          {activeTab === 'returns' && (
            <motion.div key="returns" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h1 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Return Management</h1>
              <p style={{ color: 'var(--text-muted)' }}>Select a transaction from history to initiate a return or refund.</p>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '3rem', textAlign: 'center', marginTop: '2rem' }}>
                <RotateCcw size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.3 }} />
                <p style={{ color: 'var(--text-muted)' }}>To process a return, find the invoice in the "Sales History" tab and select "Initiate Return".</p>
                <button onClick={() => setActiveTab('history')} style={{ marginTop: '1rem', background: '#14b8a6', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Go to History</button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}

const CartSection = ({ cart, updateCartQty, removeFromCart, calculateTotals, discount, setDiscount, paymentMethod, setPaymentMethod, submitSale, loading }: any) => {
  const { subtotal, tax, total } = calculateTotals();

  return (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', background: 'rgba(20,184,166,0.05)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <ShoppingCart size={20} color="#14b8a6" />
        <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem' }}>Dispensing Cart ({cart.length})</h3>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {cart.map((item: any) => (
          <div key={item.id} style={{ background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{item.name}</span>
              <button onClick={() => removeFromCart(item.id, item.presc_id)} style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }}><Trash2 size={14}/></button>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Batch: {item.batch_number} | Exp: {item.expiry_date}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="number" value={item.request_qty} onChange={e => updateCartQty(item.id, parseInt(e.target.value))} style={{ width: '50px', padding: '0.25rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '4px', fontSize: '0.85rem' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>x ₹{item.selling_price}</span>
              </div>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>₹{(item.selling_price * item.request_qty).toFixed(2)}</span>
            </div>
          </div>
        ))}
        {cart.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Cart is empty</div>}
      </div>

      <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
          <span style={{ color: 'var(--text-primary)' }}>₹{subtotal.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Tax (GST)</span>
          <span style={{ color: 'var(--text-primary)' }}>₹{tax.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Discount (₹)</span>
          <input type="number" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} style={{ width: '80px', padding: '0.25rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '4px', textAlign: 'right' }} />
        </div>
        
        <div style={{ marginTop: '0.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Payment Method</label>
          <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '6px' }}>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI / QR</option>
            <option value="CARD">Card</option>
            <option value="CREDIT">Credit (Udhaar)</option>
          </select>
        </div>

        <div style={{ marginTop: '0.5rem', padding: '1rem', background: 'rgba(20,184,166,0.1)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>NET TOTAL</span>
          <span style={{ fontWeight: 900, color: '#14b8a6', fontSize: '1.4rem' }}>₹{total.toFixed(2)}</span>
        </div>

        <button disabled={cart.length === 0 || loading} onClick={submitSale} style={{ 
          width: '100%', padding: '1rem', background: '#14b8a6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', opacity: (cart.length === 0 || loading) ? 0.5 : 1
        }}>
          {loading ? 'Processing...' : <><CheckCircle2 size={20}/> Confirm & Print Bill</>}
        </button>
      </div>
    </div>
  );
};
