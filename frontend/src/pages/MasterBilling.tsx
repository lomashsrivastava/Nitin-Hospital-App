import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, FileText, Download, Printer, User, Calendar, 
  CreditCard, CheckCircle, AlertCircle, TrendingUp, 
  Stethoscope, Microscope, Pill, Ambulance as AmbulanceIcon,
  Trash2, ShieldCheck, Receipt
} from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { generateCustomPatientId } from '../api/patientIdHelper';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function MasterBilling() {
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [patientData, setPatientData] = useState<any>(null);
  const [billingData, setBillingData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isDischarging, setIsDischarging] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const res = await api.get('/hospital/patients/');
      setPatients(res.data?.results || res.data || []);
    } catch (e) {
      toast.error('Failed to load patient list');
    }
  };

  const fetchPatientBilling = async (patientId: string) => {
    if (!patientId) return;
    setLoading(true);
    try {
      // 1. Get Patient Profile
      const pRes = await api.get(`/hospital/patients/${patientId}/`);
      setPatientData(pRes.data);

      // 2. Gather all related data
      // We'll fetch from multiple endpoints to consolidate
      const [consRes, labRes, pharRes, ambRes] = await Promise.all([
        api.get(`/hospital/consultations/?patient=${patientId}`),
        api.get(`/hospital/lab-tests/?patient=${patientId}`),
        api.get(`/billing/invoices/?patient_id=${patientId}`),
        api.get(`/hospital/ambulance-dispatch/?patient=${patientId}`)
      ]);

      const consultations = consRes.data?.results || consRes.data || [];
      const labTests = labRes.data?.results || labRes.data || [];
      const pharmacyBills = pharRes.data?.results || pharRes.data || [];
      const ambulanceMissions = ambRes.data?.results || ambRes.data || [];

      // Calculate totals and group items
      const items: any[] = [];
      let total = 0;

      // Consultations
      consultations.forEach((c: any) => {
        const fee = Number(c.doctor_fee) || 500; // Fallback fee
        items.push({
          type: 'CONSULTATION',
          desc: `Consultation with Dr. ${c.doctor_name || 'Medical Officer'}`,
          date: c.created_at,
          amount: fee
        });
        total += fee;
      });

      // Lab Tests
      labTests.forEach((t: any) => {
        const cost = Number(t.cost) || 0;
        items.push({
          type: 'DIAGNOSTICS',
          desc: `${t.test_name} (${t.category})`,
          date: t.created_at,
          amount: cost
        });
        total += cost;
      });

      // Pharmacy Bills
      pharmacyBills.forEach((b: any) => {
        const amount = Number(b.total) || 0;
        items.push({
          type: 'PHARMACY',
          desc: `Medicine Invoice: ${b.invoice_number}`,
          date: b.created_at,
          amount: amount
        });
        total += amount;
      });

      // Ambulance
      ambulanceMissions.forEach((a: any) => {
        const cost = 1200; // Fixed ambulance cost for now
        items.push({
          type: 'AMBULANCE',
          desc: `Emergency Transport (${a.ambulance_details})`,
          date: a.dispatch_time,
          amount: cost
        });
        total += cost;
      });

      setBillingData({
        items,
        total,
        advance: Number(pRes.data.advance_deposit) || 0,
        consCount: consultations.length,
        labCount: labTests.length,
        pharCount: pharmacyBills.length,
        ambCount: ambulanceMissions.length
      });

    } catch (e) {
      toast.error('Error consolidating billing data');
    } finally {
      setLoading(false);
    }
  };

  const handleDischarge = async () => {
    if (!patientData) return;
    if (!window.confirm(`Are you sure you want to finalize discharge for ${patientData.name}? This will generate the final receipt and mark the patient as discharged.`)) return;

    setIsDischarging(true);
    try {
      await api.patch(`/hospital/patients/${patientData.id}/`, { is_discharged: true });
      toast.success('Patient discharged successfully!');
      generateReceipt();
      fetchPatients();
    } catch (e) {
      toast.error('Failed to process discharge');
    } finally {
      setIsDischarging(false);
    }
  };

  const generateReceipt = () => {
    if (!patientData || !billingData) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(33, 37, 41);
    doc.text('NITIN HOSPITAL', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Advanced Medical Care & Surgical Center', pageWidth / 2, 26, { align: 'center' });
    doc.text('Phone: +91 99999 99999 | Email: info@nitinhospital.com', pageWidth / 2, 31, { align: 'center' });

    doc.setDrawColor(200);
    doc.line(15, 36, pageWidth - 15, 36);

    // Bill Title
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('FINAL DISCHARGE SUMMARY & RECEIPT', pageWidth / 2, 46, { align: 'center' });

    // Patient Info Table
    (doc as any).autoTable({
      startY: 55,
      head: [['Patient Information', 'Admission Details']],
      body: [
        [`Name: ${patientData.name}`, `Reg No: PAT-${patientData.id}`],
        [`Age/Gender: ${patientData.age}Y / ${patientData.gender}`, `Admission: ${new Date(patientData.admission_date).toLocaleDateString()}`],
        [`Contact: ${patientData.contact_number}`, `Discharge: ${new Date().toLocaleDateString()}`],
        [`Ailment: ${patientData.ailment || 'N/A'}`, `Room: ${patientData.room_details || 'N/A'}`]
      ],
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 }
    });

    // Items Table
    (doc as any).autoTable({
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Description', 'Category', 'Date', 'Amount (INR)']],
      body: [
        ...billingData.items.map((item: any) => [
          item.desc,
          item.type,
          new Date(item.date).toLocaleDateString(),
          `Rs. ${item.amount.toFixed(2)}`
        ]),
        ['ADVANCE DEPOSIT ADJUSTMENT', 'PAYMENT', '-', `- Rs. ${billingData.advance.toFixed(2)}`]
      ],
      headStyles: { fillGray: 200, textColor: 0, fontStyle: 'bold' },
      foot: [['', '', 'NET PAYABLE', `Rs. ${(billingData.total - billingData.advance).toFixed(2)}`]],
      footStyles: { fillGray: 240, textColor: 0, fontStyle: 'bold', fontSize: 11 },
    });

    const finalY = (doc as any).lastAutoTable.finalY;

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text('This is a computer-generated discharge receipt. No signature required.', 15, finalY + 20);
    doc.text('Wishing you a speedy recovery!', pageWidth / 2, finalY + 30, { align: 'center' });

    doc.save(`Discharge_${patientData.name}_${new Date().getTime()}.pdf`);
    toast.success('Final Receipt Generated!');
  };

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Receipt size={32} color="var(--primary)" /> Final Billing & Discharge
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Consolidated patient accounts and clinical exit summary</p>
      </div>

      {/* Patient Selection */}
      <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-end', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Search Active Patient</label>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <select 
              className="input" 
              style={{ paddingLeft: '3rem' }}
              value={selectedPatientId}
              onChange={(e) => {
                setSelectedPatientId(e.target.value);
                fetchPatientBilling(e.target.value);
              }}
            >
              <option value="">Select a patient for discharge...</option>
              {patients.filter(p => !p.is_discharged).map(p => (
                <option key={p.id} value={p.id}>{p.name} - {p.ailment || 'No Ailment recorded'}</option>
              ))}
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
                    const pid = String(foundPatient.id?.id || foundPatient.id);
                    setSelectedPatientId(pid);
                    fetchPatientBilling(pid);
                    toast.success(`Synced Patient: ${foundPatient.name}`);
                  }
                }}
              />
            </div>
          </div>
        </div>
        <button 
          className="btn btn-primary" 
          disabled={!selectedPatientId || loading}
          onClick={() => fetchPatientBilling(selectedPatientId)}
          style={{ height: '48px', padding: '0 2rem' }}
        >
          {loading ? 'Processing...' : 'Load Account Data'}
        </button>
      </div>

      <AnimatePresence>
        {patientData && billingData && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            {/* Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <BillingStat label="Consultations" value={billingData.consCount} icon={<Stethoscope size={20}/>} color="#6366f1" />
              <BillingStat label="Lab Tests" value={billingData.labCount} icon={<Microscope size={20}/>} color="#ec4899" />
              <BillingStat label="Pharmacy Bills" value={billingData.pharCount} icon={<Pill size={20}/>} color="#10b981" />
              <BillingStat label="Ambulance" value={billingData.ambCount} icon={<AmbulanceIcon size={20}/>} color="#f59e0b" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start' }}>
              {/* Items List */}
              <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Account Itemization</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{billingData.items.length} records found</span>
                </div>
                <div className="table-container" style={{ border: 'none' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Description</th>
                        <th>Date</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billingData.items.map((item: any, i: number) => (
                        <tr key={i}>
                          <td><span className={`badge badge-${item.type.toLowerCase()}`} style={{ fontSize: '0.7rem' }}>{item.type}</span></td>
                          <td style={{ fontWeight: 600 }}>{item.desc}</td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(item.date).toLocaleDateString()}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{item.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary))' }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Billing Summary</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Subtotal</span>
                      <span style={{ fontWeight: 600 }}>₹{billingData.total.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontWeight: 600 }}>
                      <span>Advance Paid</span>
                      <span>- ₹{billingData.advance.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                      <span>Tax (GST 0%)</span>
                      <span>₹0.00</span>
                    </div>
                    <div style={{ height: '1px', background: 'var(--border)', margin: '0.5rem 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: 800 }}>
                      <span style={{ color: 'var(--primary)' }}>PAYABLE</span>
                      <span className="text-gradient">₹{Math.max(0, billingData.total - billingData.advance).toLocaleString()}</span>
                    </div>
                  </div>

                  <button 
                    onClick={handleDischarge}
                    disabled={isDischarging}
                    style={{ 
                      width: '100%', marginTop: '1.5rem', padding: '1rem', 
                      background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', 
                      border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                      boxShadow: '0 10px 20px rgba(16,185,129,0.2)'
                    }}
                  >
                    <ShieldCheck size={20} />
                    {isDischarging ? 'Finalizing...' : 'Process Final Discharge'}
                  </button>
                  
                  <button 
                    onClick={generateReceipt}
                    style={{ 
                      width: '100%', marginTop: '0.75rem', padding: '0.8rem', 
                      background: 'transparent', color: 'var(--text-primary)', 
                      border: '1px solid var(--border)', borderRadius: '12px', fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem'
                    }}
                  >
                    <Download size={18} />
                    Preview Receipt
                  </button>
                </div>

                <div className="card" style={{ padding: '1.25rem', border: '1px dashed var(--border)' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                    <AlertCircle size={16} color="#f59e0b" /> Discharge Note
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Finalizing discharge will release the assigned room and doctor from this patient's profile. Please ensure all clinical notes are complete before proceeding.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!patientData && !loading && (
        <div style={{ textAlign: 'center', padding: '5rem 2rem', opacity: 0.5 }}>
          <FileText size={64} style={{ margin: '0 auto 1.5rem auto' }} />
          <h3>No Patient Selected</h3>
          <p>Please select an active patient from the search bar above to generate their final account statement.</p>
        </div>
      )}
    </div>
  );
}

const BillingStat = ({ label, value, icon, color }: any) => (
  <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-secondary)' }}>
    <div style={{ background: `${color}22`, color: color, padding: '0.75rem', borderRadius: '12px' }}>{icon}</div>
    <div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{value}</div>
    </div>
  </div>
);
