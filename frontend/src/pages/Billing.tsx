/**
 * Billing Page - Premium billing with search, cart, GST, success modal, and shortcuts
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Minus, Trash2, Printer, Download,
  CreditCard, Banknote, Smartphone, IndianRupee, X,
  ShoppingCart, CheckCircle, Sparkles, Zap, Copy, RotateCcw
} from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { generateCustomPatientId } from '../api/patientIdHelper';

interface Medicine {
  id: number; name: string; batch_number: string; selling_price: number;
  mrp: number; gst_rate: number; quantity: number; expiry_date: string;
  generic_name?: string; category?: string;
}

interface CartItem {
  medicine: Medicine; quantity: number; unit_price: number;
  discount: number; gst_rate: number;
}

export default function Billing() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Medicine[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENTAGE'>('FIXED');
  const [discountValue, setDiscountValue] = useState(0);
  const [amountPaid, setAmountPaid] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [billMode, setBillMode] = useState<'WALKIN' | 'PATIENT'>('WALKIN');
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Auto-focus search on mount
  useEffect(() => { searchRef.current?.focus(); }, []);

  // Fetch recent invoices
  useEffect(() => {
    api.get('/billing/invoices/?ordering=-created_at&page_size=5').then(res => {
      setRecentInvoices(res.data.results || res.data || []);
    }).catch(() => {});
  }, [lastInvoice]);

  useEffect(() => {
    api.get('/hospital/patients/').then(res => {
      setPatients(res.data.results || res.data || []);
    }).catch(() => {});
  }, []);

  // Smart search with debounce
  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (q.length < 1) { setSearchResults([]); setShowSearch(false); return; }
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await api.get(`/inventory/medicines/search/?q=${encodeURIComponent(q)}`);
        setSearchResults(res.data);
        setShowSearch(true);
      } catch { setSearchResults([]); }
    }, 150);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'F9' && !e.repeat) { e.preventDefault(); handleSubmitBill(); }
      if (e.key === 'Escape') { setShowSearch(false); setShowSuccess(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart]);

  // Add to cart
  const addToCart = (med: Medicine) => {
    const medId = String(med.id?.id || med.id);
    const existing = cart.find(c => String(c.medicine.id?.id || c.medicine.id) === medId);
    if (existing) {
      if (existing.quantity >= med.quantity) { toast.error(`Only ${med.quantity} in stock!`); return; }
      setCart(cart.map(c => String(c.medicine.id?.id || c.medicine.id) === medId ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      if (med.quantity <= 0) { toast.error('Out of stock!'); return; }
      setCart([...cart, { medicine: med, quantity: 1, unit_price: med.selling_price, discount: 0, gst_rate: med.gst_rate }]);
    }
    setSearchQuery('');
    setShowSearch(false);
    toast.success(`✅ ${med.name} added!`, { icon: '💊' });
  };

  const updateQuantity = (idx: number, qty: number) => {
    if (qty <= 0) { removeItem(idx); return; }
    const item = cart[idx];
    if (qty > item.medicine.quantity) { toast.error(`Only ${item.medicine.quantity} available`); return; }
    setCart(cart.map((c, i) => i === idx ? { ...c, quantity: qty } : c));
  };

  const updateDiscount = (idx: number, disc: number) => {
    setCart(cart.map((c, i) => i === idx ? { ...c, discount: disc } : c));
  };

  const removeItem = (idx: number) => {
    const name = cart[idx].medicine.name;
    setCart(cart.filter((_, i) => i !== idx));
    toast(`Removed ${name}`, { icon: '🗑️' });
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    if (!confirm('Clear all items?')) return;
    setCart([]);
    toast('Cart cleared', { icon: '🔄' });
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity - item.discount, 0);
  const discountAmount = discountType === 'PERCENTAGE' ? subtotal * discountValue / 100 : discountValue;
  const taxableAmount = subtotal - discountAmount;
  const totalCGST = cart.reduce((sum, item) => {
    const lineTotal = item.unit_price * item.quantity - item.discount;
    return sum + lineTotal * item.gst_rate / 200;
  }, 0);
  const totalSGST = totalCGST;
  const totalTax = totalCGST + totalSGST;
  const grandTotal = taxableAmount + totalTax;
  const paid = parseFloat(amountPaid) || grandTotal;
  const change = Math.max(0, paid - grandTotal);
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);

  // Submit bill
  const handleSubmitBill = async () => {
    if (cart.length === 0) { toast.error('Add items to bill first!'); return; }
    setSubmitting(true);
    try {
      const payload = {
        customer_name: billMode === 'WALKIN' ? customerName : undefined,
        customer_phone: billMode === 'WALKIN' ? customerPhone : undefined,
        patient_id: billMode === 'PATIENT' ? selectedPatientId : undefined,
        payment_method: paymentMethod,
        discount_type: discountType,
        discount_value: Number(discountValue) || 0,
        amount_paid: Number(paid) || Number(grandTotal),
        items: cart.map(item => ({
          medicine_id: String(item.medicine.id?.id || item.medicine.id),
          quantity: Number(item.quantity) || 1,
          unit_price: Number(item.unit_price) || 0,
          discount: Number(item.discount) || 0,
          gst_rate: Number(item.gst_rate) || 0,
        })),
      };
      const res = await api.post('/billing/invoices/', payload);
      setLastInvoice(res.data);
      setShowSuccess(true);
      setCart([]);
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
      setDiscountValue(0);
      setAmountPaid('');
    } catch (err: any) {
      const detail = err.response?.data;
      
      const flattenErrors = (obj: any): string => {
        if (typeof obj === 'string') return obj;
        if (Array.isArray(obj)) return obj.map(flattenErrors).join(', ');
        if (typeof obj === 'object' && obj !== null) {
          return Object.values(obj).map(flattenErrors).join(', ');
        }
        return String(obj);
      };

      const msg = detail ? flattenErrors(detail) : 'Failed to create bill';
      toast.error(msg);
    }
    setSubmitting(false);
  };

  const downloadPDF = async (invoiceId: number) => {
    try {
      const res = await api.get(`/billing/invoices/${invoiceId}/pdf/`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `Invoice_${lastInvoice?.invoice_number || invoiceId}.pdf`; a.click();
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded successfully!');
    } catch { toast.error('PDF download failed. Format not supported.'); }
  };

  const paymentMethods = [
    { value: 'CASH', label: 'Cash', icon: Banknote, color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
    { value: 'UPI', label: 'UPI', icon: Smartphone, color: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
    { value: 'CARD', label: 'Card', icon: CreditCard, color: '#06b6d4', bg: 'rgba(6,182,212,0.08)' },
  ];

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={28} className="text-gradient" style={{ color: 'var(--primary)' }} />
            <span className="text-gradient">Billing</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '0.125rem' }}>
            ⚡ F2: Search  |  F9: Generate Bill  |  Esc: Close
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {cart.length > 0 && (
            <motion.button
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="btn btn-ghost" onClick={clearCart}
              style={{ color: 'var(--error)', fontSize: '0.8125rem' }}
            >
              <RotateCcw size={15} /> Clear Cart
            </motion.button>
          )}
          {lastInvoice && (
            <>
              <button className="btn btn-secondary" onClick={() => downloadPDF(lastInvoice.id)}>
                <Download size={16} /> PDF
              </button>
              <button className="btn btn-secondary" onClick={() => window.print()}>
                <Printer size={16} /> Print
              </button>
            </>
          )}
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1rem', alignItems: 'start' }}>
        {/* Left - Search + Cart */}
        <div>
          {/* Search bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            style={{ position: 'relative', marginBottom: '1rem' }}
          >
            <div style={{
              position: 'relative',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-secondary)',
              border: '2px solid var(--border)',
              boxShadow: 'var(--shadow)',
              transition: 'var(--transition)',
            }}>
              <Search size={18} style={{
                position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--primary)', zIndex: 2,
              }} />
              <input
                ref={searchRef}
                type="text"
                placeholder="🔍 Type medicine name, barcode, or batch number..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowSearch(true)}
                style={{
                  width: '100%', padding: '1rem 1rem 1rem 44px',
                  border: 'none', borderRadius: 'var(--radius-lg)',
                  background: 'transparent', color: 'var(--text-primary)',
                  fontSize: '0.9375rem', outline: 'none',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setShowSearch(false); }}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'var(--bg-hover)', border: 'none', borderRadius: '50%',
                    width: 28, height: 28, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)',
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            <AnimatePresence>
              {showSearch && searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="card"
                  style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                    maxHeight: 320, overflow: 'auto', marginTop: 6,
                    boxShadow: 'var(--shadow-xl)',
                  }}
                >
                  {searchResults.map((med, i) => (
                    <motion.button
                      key={String(med.id?.id || med.id)}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => addToCart(med)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        width: '100%', padding: '0.875rem 1rem', border: 'none', cursor: 'pointer',
                        background: 'transparent', color: 'var(--text-primary)',
                        borderBottom: '1px solid var(--border-light)', textAlign: 'left',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'linear-gradient(90deg, rgba(99,102,241,0.06), transparent)';
                        (e.currentTarget as HTMLElement).style.paddingLeft = '1.25rem';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                        (e.currentTarget as HTMLElement).style.paddingLeft = '1rem';
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{med.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {med.generic_name && `${med.generic_name} • `}Batch: {med.batch_number} • Exp: {med.expiry_date}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: 'var(--primary)' }}>₹{med.selling_price}</div>
                        <div style={{
                          fontSize: '0.7rem', fontWeight: 600,
                          color: med.quantity <= 10 ? 'var(--error)' : 'var(--success)',
                        }}>
                          {med.quantity} in stock
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Cart */}
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{ overflow: 'visible' }}
          >
            {cart.length === 0 ? (
              <div style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <ShoppingCart size={56} style={{ margin: '0 auto', color: 'var(--primary)', opacity: 0.25 }} />
                </motion.div>
                <p style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '1rem' }}>
                  Cart is empty
                </p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>
                  Press <kbd style={{ padding: '2px 6px', borderRadius: 4, background: 'var(--bg-tertiary)', border: '1px solid var(--border)', fontSize: '0.75rem', fontWeight: 700 }}>F2</kbd> to search medicines
                </p>
              </div>
            ) : (
              <div className="table-container" style={{ border: 'none', borderRadius: 'var(--radius-lg)' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Medicine</th>
                      <th>Price</th>
                      <th style={{ textAlign: 'center' }}>Qty</th>
                      <th>Disc</th>
                      <th>GST</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence mode="popLayout">
                      {cart.map((item, idx) => {
                        const lineTotal = item.unit_price * item.quantity - item.discount;
                        const tax = lineTotal * item.gst_rate / 100;
                        return (
                          <motion.tr
                            key={String(item.medicine.id?.id || item.medicine.id)}
                            layout
                            initial={{ opacity: 0, x: -30, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 30, scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                          >
                            <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{idx + 1}</td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{item.medicine.name}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                Batch: {item.medicine.batch_number}
                              </div>
                            </td>
                            <td style={{ fontWeight: 500 }}>₹{item.unit_price}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'center' }}>
                                <motion.button
                                  whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }}
                                  onClick={() => updateQuantity(idx, item.quantity - 1)}
                                  style={{
                                    width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)',
                                    background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)',
                                  }}
                                >
                                  <Minus size={13} />
                                </motion.button>
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => updateQuantity(idx, parseInt(e.target.value) || 0)}
                                  style={{
                                    width: 42, textAlign: 'center', padding: '0.25rem',
                                    border: '2px solid var(--border)', borderRadius: 8,
                                    background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                                    fontWeight: 700, fontSize: '0.875rem',
                                  }}
                                  min={1} max={item.medicine.quantity}
                                />
                                <motion.button
                                  whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }}
                                  onClick={() => updateQuantity(idx, item.quantity + 1)}
                                  style={{
                                    width: 28, height: 28, borderRadius: 8, border: '1px solid var(--primary)',
                                    background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', cursor: 'pointer', color: 'var(--primary)',
                                  }}
                                >
                                  <Plus size={13} />
                                </motion.button>
                              </div>
                            </td>
                            <td>
                              <input
                                type="number"
                                value={item.discount || ''}
                                onChange={(e) => updateDiscount(idx, parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                style={{
                                  width: 55, textAlign: 'center', padding: '0.25rem',
                                  border: '1px solid var(--border)', borderRadius: 6,
                                  background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                                  fontSize: '0.8125rem',
                                }}
                              />
                            </td>
                            <td>
                              <span className="badge badge-primary">{item.gst_rate}%</span>
                            </td>
                            <td style={{ fontWeight: 700, textAlign: 'right' }}>
                              ₹{(lineTotal + tax).toFixed(2)}
                            </td>
                            <td>
                              <motion.button
                                whileHover={{ scale: 1.2, rotate: 10 }}
                                whileTap={{ scale: 0.8 }}
                                onClick={() => removeItem(idx)}
                                style={{
                                  background: 'var(--error-bg)', border: 'none', borderRadius: 8,
                                  width: 32, height: 32, display: 'flex', alignItems: 'center',
                                  justifyContent: 'center', cursor: 'pointer', color: 'var(--error)',
                                  transition: 'all 0.2s',
                                }}
                              >
                                <Trash2 size={15} />
                              </motion.button>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}

            {/* Cart footer bar */}
            {cart.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{
                  padding: '0.75rem 1rem',
                  background: 'linear-gradient(90deg, rgba(99,102,241,0.05), rgba(6,182,212,0.05))',
                  borderTop: '1px solid var(--border)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: '0.8125rem', fontWeight: 500,
                }}
              >
                <span>{cart.length} items • {totalItems} units</span>
                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                  Subtotal: ₹{subtotal.toFixed(2)}
                </span>
              </motion.div>
            )}
          </motion.div>

          {/* Recent Invoices */}
          {recentInvoices.length > 0 && (
            <motion.div
              className="card"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{ marginTop: '1rem', padding: '1rem' }}
            >
              <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-muted)' }}>
                📋 Recent Bills
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem', overflow: 'auto', paddingBottom: '0.25rem' }}>
                {recentInvoices.slice(0, 5).map((inv: any) => (
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    key={inv.id} 
                    onClick={async () => { 
                      try {
                        const { data } = await api.get(`/billing/invoices/${inv.id}/`);
                        setLastInvoice(data); 
                        setShowSuccess(true); 
                      } catch { toast.error('Failed to load full bill details'); }
                    }}
                    style={{
                      minWidth: 160, padding: '0.625rem', borderRadius: 'var(--radius)',
                      background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                      fontSize: '0.75rem', transition: 'all 0.2s', cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{inv.invoice_number}</div>
                    <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{inv.customer_name}</div>
                    <div style={{ fontWeight: 700, marginTop: 4 }}>₹{Number(inv.total).toLocaleString('en-IN')}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Right - Invoice Panel */}
        <motion.div
          className="card"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          style={{ padding: '1.25rem', position: 'sticky', top: 80 }}
        >
          <h3 style={{
            fontSize: '1rem', fontWeight: 700, marginBottom: '1rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'linear-gradient(90deg, var(--primary), var(--accent))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            <IndianRupee size={18} style={{ color: 'var(--primary)' }} /> Invoice Preview
          </h3>

          {/* Customer */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
              <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', cursor: 'pointer', fontSize: '0.875rem' }}>
                <input type="radio" checked={billMode === 'WALKIN'} onChange={() => setBillMode('WALKIN')} /> Walk-in
              </label>
              <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', cursor: 'pointer', fontSize: '0.875rem' }}>
                <input type="radio" checked={billMode === 'PATIENT'} onChange={() => setBillMode('PATIENT')} /> Registry Patient
              </label>
            </div>
            
            {billMode === 'WALKIN' ? (
              <>
                <div style={{ marginBottom: '0.875rem' }}>
                  <label className="label">👤 Customer Name</label>
                  <input className="input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                </div>
                <div style={{ marginBottom: '0.875rem' }}>
                  <label className="label">📱 Phone (optional)</label>
                  <input className="input" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Phone number" />
                </div>
              </>
            ) : (
              <div style={{ marginBottom: '0.875rem' }}>
                <label className="label">🏥 Select Patient</label>
                <select className="input select" value={selectedPatientId || ''} onChange={(e) => setSelectedPatientId(e.target.value || null)}>
                  <option value="">-- Choose Registered Patient --</option>
                  {patients.map(p => {
                    const pid = String(p.id?.id || p.id);
                    return <option key={pid} value={pid}>{p.name} ({p.contact_number})</option>;
                  })}
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
                        setSelectedPatientId(String(foundPatient.id?.id || foundPatient.id));
                        toast.success(`Synced Patient: ${foundPatient.name}`);
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Discount */}
          <div style={{ marginBottom: '0.875rem' }}>
            <label className="label">🏷️ Discount</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select className="input select" value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'FIXED' | 'PERCENTAGE')} style={{ width: 110 }}>
                <option value="FIXED">₹ Fixed</option>
                <option value="PERCENTAGE">% Percent</option>
              </select>
              <input type="number" className="input" value={discountValue || ''} onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)} placeholder="0" min={0} />
            </div>
          </div>

          {/* Payment */}
          <div style={{ marginBottom: '0.875rem' }}>
            <label className="label">💳 Payment Method</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {paymentMethods.map(pm => {
                const Icon = pm.icon;
                const isActive = paymentMethod === pm.value;
                return (
                  <motion.button
                    key={pm.value}
                    onClick={() => setPaymentMethod(pm.value)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      flex: 1, padding: '0.75rem 0.5rem', borderRadius: 'var(--radius)',
                      border: `2px solid ${isActive ? pm.color : 'var(--border)'}`,
                      background: isActive ? pm.bg : 'transparent',
                      color: isActive ? pm.color : 'var(--text-muted)',
                      cursor: 'pointer', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem',
                      fontWeight: isActive ? 700 : 500,
                      transition: 'all 0.25s',
                      boxShadow: isActive ? `0 4px 12px ${pm.bg}` : 'none',
                    }}
                  >
                    <Icon size={20} />
                    {pm.label}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Amount Paid */}
          <div style={{ marginBottom: '0.875rem' }}>
            <label className="label">💵 Amount Paid</label>
            <input type="number" className="input" value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)} placeholder={grandTotal.toFixed(2)} />
          </div>

          {/* Totals */}
          <motion.div
            layout
            style={{
              padding: '1rem', borderRadius: 'var(--radius)',
              background: 'linear-gradient(135deg, var(--bg-tertiary), var(--bg-hover))',
              border: '1px solid var(--border)', marginBottom: '0.875rem',
            }}
          >
            {[
              { label: 'Subtotal', value: `₹${subtotal.toFixed(2)}`, color: 'var(--text-primary)' },
              discountAmount > 0 && { label: 'Discount', value: `- ₹${discountAmount.toFixed(2)}`, color: 'var(--success)' },
              { label: 'CGST', value: `₹${totalCGST.toFixed(2)}`, color: 'var(--text-secondary)' },
              { label: 'SGST', value: `₹${totalSGST.toFixed(2)}`, color: 'var(--text-secondary)' },
            ].filter(Boolean).map((row: any, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                <span style={{ color: row.color, fontWeight: 500 }}>{row.value}</span>
              </div>
            ))}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              paddingTop: '0.75rem', borderTop: '2px solid var(--border)',
              fontSize: '1.25rem', fontWeight: 800, marginTop: '0.25rem',
            }}>
              <span>Grand Total</span>
              <span className="text-gradient">₹{grandTotal.toFixed(2)}</span>
            </div>
            {change > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--success)', fontWeight: 600 }}
              >
                <span>🔄 Change</span>
                <span>₹{change.toFixed(2)}</span>
              </motion.div>
            )}
          </motion.div>

          {/* Submit */}
          <motion.button
            onClick={handleSubmitBill}
            disabled={cart.length === 0 || submitting}
            whileHover={cart.length > 0 ? { scale: 1.03 } : {}}
            whileTap={cart.length > 0 ? { scale: 0.97 } : {}}
            style={{
              width: '100%', padding: '1rem',
              borderRadius: 'var(--radius)',
              border: 'none',
              background: cart.length === 0
                ? 'var(--bg-tertiary)'
                : 'linear-gradient(135deg, #6366f1, #4338ca)',
              color: cart.length === 0 ? 'var(--text-muted)' : 'white',
              fontSize: '1rem', fontWeight: 700, cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
              boxShadow: cart.length > 0 ? '0 8px 25px rgba(99, 102, 241, 0.4)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              transition: 'all 0.3s',
            }}
          >
            {submitting ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <Zap size={20} />
              </motion.div>
            ) : (
              <><Zap size={20} /> Generate Bill {cart.length > 0 && `(₹${grandTotal.toFixed(2)})`}</>
            )}
          </motion.button>
        </motion.div>
      </div>

      {/* Full Detailed Receipt Modal */}
      <AnimatePresence>
        {showSuccess && lastInvoice && (
          <motion.div
            className="success-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setShowSuccess(false)}
            style={{ zIndex: 100 }}
          >
            <motion.div
              className="success-card"
              initial={{ scale: 0, rotate: -3 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 3 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              style={{ padding: '2rem', maxWidth: 450, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
            >
              <div style={{ textAlign: 'center', marginBottom: '8mm' }}>
                <h1 style={{ margin: 0, fontSize: '24px', color: '#000', fontWeight: 'bold' }}>Nitin Hospital</h1>
                <p style={{ margin: '4px 0', fontSize: '12px', color: '#555' }}>
                  Complete Medical & Health Solutions<br />
                  Call: +91 99999 99999
                </p>
                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <div style={{ textAlign: 'left' }}>
                    <div><b>Bill No:</b> {lastInvoice.invoice_number}</div>
                    <div><b>Date:</b> {new Date(lastInvoice.created_at).toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div><b>Cust:</b> {lastInvoice.customer_name}</div>
                    <div><b>Pay:</b> {lastInvoice.payment_method}</div>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div style={{ marginBottom: '1.25rem', fontSize: '0.8125rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ paddingBottom: '0.5rem' }}>Item</th>
                      <th style={{ paddingBottom: '0.5rem', textAlign: 'center' }}>Qty</th>
                      <th style={{ paddingBottom: '0.5rem', textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(lastInvoice.items || []).map((item: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '0.5rem 0', maxWidth: 180 }}>
                          <span style={{ fontWeight: 600 }}>{item.medicine_name.substring(0, 20)}</span>
                          <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                             ₹{item.unit_price} x {item.quantity} (GST {item.gst_rate}%)
                          </span>
                        </td>
                        <td style={{ padding: '0.5rem 0', textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ padding: '0.5rem 0', textAlign: 'right', fontWeight: 500 }}>₹{item.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div style={{
                padding: '1rem', borderRadius: 'var(--radius)', background: 'var(--bg-tertiary)',
                marginBottom: '1.5rem', fontSize: '0.875rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                  <span>₹{lastInvoice.subtotal}</span>
                </div>
                {parseFloat(lastInvoice.discount_amount) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Discount</span>
                    <span style={{ color: 'var(--success)' }}>- ₹{lastInvoice.discount_amount}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Total Tax (GST)</span>
                  <span>₹{lastInvoice.total_tax}</span>
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  paddingTop: '0.5rem', borderTop: '2px solid var(--border)', marginTop: '0.25rem'
                }}>
                  <span style={{ fontWeight: 700 }}>GRAND TOTAL</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800 }} className="text-gradient">
                    ₹{Number(lastInvoice.total).toLocaleString('en-IN')}
                  </span>
                </div>
                {parseFloat(lastInvoice.amount_paid) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Amount Paid</span>
                    <span>₹{lastInvoice.amount_paid}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-secondary" style={{ flex: 1, padding: '0.625rem' }} onClick={() => downloadPDF(lastInvoice.id)}>
                  <Download size={16} /> Save PDF
                </button>
                <button className="btn btn-secondary" style={{ flex: 1, padding: '0.625rem' }} onClick={() => window.print()}>
                  <Printer size={16} /> Print
                </button>
                <button className="btn btn-primary" style={{ flex: 1.2, padding: '0.625rem' }}
                  onClick={() => { setShowSuccess(false); searchRef.current?.focus(); }}>
                  <Plus size={16} /> New Bill
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
