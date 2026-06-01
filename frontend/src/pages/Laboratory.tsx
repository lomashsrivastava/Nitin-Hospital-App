import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical, Plus, Save, XCircle, DollarSign, Activity, AlertCircle, Trash2, FileText, Download, Printer, Share2 } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export default function Laboratory() {
  const [tests, setTests] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [resultText, setResultText] = useState('');
  const [formData, setFormData] = useState({ 
    patient: '', patient_name: '', test_name: '', referred_by: '', 
    category: 'PATHOLOGY', priority: 'ROUTINE', cost: '' 
  });
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);

  useEffect(() => {
    fetchTests();
    fetchDoctors();
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const res = await api.get('/hospital/patients/');
      setPatients(res.data?.results || res.data || []);
    } catch {}
  };

  const fetchTests = async () => {
    try {
      const res = await api.get('/hospital/lab-tests/');
      setTests(res.data?.results || res.data || []);
    } catch (e) {
      toast.error('Failed to load lab tests');
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await api.get('/hospital/doctors/');
      setDoctors(res.data?.results || res.data || []);
    } catch (e) { }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        patient: formData.patient || null,
        referred_by: formData.referred_by || null
      };
      await api.post('/hospital/lab-tests/', payload);
      toast.success('Test ordered successfully!');
      setIsModalOpen(false);
      setFormData({ patient: '', patient_name: '', test_name: '', referred_by: '', category: 'PATHOLOGY', priority: 'ROUTINE', cost: '' });
      fetchTests();
    } catch (e) {
      toast.error('Error ordering test');
    }
  };

  const saveResult = async (id: number) => {
    try {
      await api.patch(`/hospital/lab-tests/${id}/`, { result: resultText, status: 'COMPLETED' });
      toast.success('Result saved successfully');
      setEditingId(null);
      fetchTests();
    } catch (e) {
      toast.error('Failed to save result');
    }
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'STAT') return '#ef4444';
    if (priority === 'URGENT') return '#f59e0b';
    return '#3b82f6';
  };

  const deleteTest = async (id: string | number) => {
    console.log('Attempting to delete test with ID:', id);
    if (!window.confirm('Are you sure you want to delete this lab record?')) return;
    try {
      await api.delete(`/hospital/lab-tests/${id}/`);
      toast.success('Record deleted successfully');
      fetchTests();
    } catch (e) {
      console.error('Delete error:', e);
      toast.error('Failed to delete record');
    }
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('lab-report-content');
    if (!element) return;
    
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`LabReport_${selectedTest?.patient_name_display}_${selectedTest?.test_name}.pdf`);
  };

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FlaskConical color="#8b5cf6" /> Laboratory Diagnostics
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Advanced pathological & radiological tracking.</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsModalOpen(true)}
          style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={20} /> Order New Test
        </motion.button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
        <AnimatePresence>
          {tests.map((test) => (
            <motion.div key={test.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', position: 'relative', overflow: 'hidden',
                      boxShadow: test.priority === 'STAT' && test.status !== 'COMPLETED' ? '0 0 15px rgba(239,68,68,0.2)' : 'none' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: test.status === 'COMPLETED' ? '#10b981' : getPriorityColor(test.priority) }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2rem', marginBottom: '0.25rem' }}>{test.test_name}</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'var(--bg-primary)', borderRadius: '4px', color: 'var(--text-secondary)' }}>{test.category}</span>
                    <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: `${getPriorityColor(test.priority)}22`, color: getPriorityColor(test.priority), fontWeight: 700, borderRadius: '4px' }}>{test.priority}</span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Patient: <strong>{test.patient_name_display}</strong></div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>Ref: Dr. {test.referred_by_name || 'Walk-in'}</div>
                  <div style={{ color: '#10b981', fontSize: '0.85rem', marginTop: '0.25rem', fontWeight: 600 }}>₹{test.cost}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: test.status === 'COMPLETED' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: test.status === 'COMPLETED' ? '#10b981' : '#f59e0b' }}>
                    {test.status}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteTest(test.id); }} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.4rem', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} title="Delete Record"
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {test.status === 'COMPLETED' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    <strong>Final Report:</strong><br/>
                    <span style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{test.result || 'No details provided.'}</span>
                  </div>
                  <button onClick={() => { setSelectedTest(test); setIsReportOpen(true); }} style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-primary)', border: '1px solid #8b5cf6', color: '#8b5cf6', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                    <FileText size={16}/> View Formal Report
                  </button>
                </div>
              ) : (
                editingId === test.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <textarea 
                      placeholder="Enter Clinical Results Here..."
                      value={resultText}
                      onChange={e => setResultText(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px', minHeight: '80px', resize: 'vertical' }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => saveResult(test.id)} style={{ flex: 1, padding: '0.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}><Save size={16}/> Save Results</button>
                      <button onClick={() => setEditingId(null)} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setEditingId(test.id); setResultText(test.result || ''); }} style={{ width: '100%', padding: '0.75rem', border: '1px dashed #8b5cf6', background: 'transparent', color: '#8b5cf6', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}><Activity size={16}/> Proceed With Diagnosis</button>
                )
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} style={{ position: 'relative', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '600px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
              <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><XCircle size={24} /></button>
              <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FlaskConical color="#8b5cf6"/> Order Advanced Lab Test</h2>
              
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Registered Patient</label>
                    <select value={formData.patient} onChange={e => {
                      const pId = e.target.value;
                      const p = patients.find(pat => String(pat.id) === String(pId));
                      setFormData({
                        ...formData, 
                        patient: pId, 
                        patient_name: '',
                        referred_by: p?.assigned_doctor || ''
                      });
                    }} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px' }}>
                      <option value="">-- Manual Entry / Walk-in --</option>
                      {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  {!formData.patient && (
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Patient Name (Manual)</label>
                      <input required type="text" value={formData.patient_name} onChange={e => setFormData({...formData, patient_name: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px' }} />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Referred By</label>
                    <select value={formData.referred_by} onChange={e => setFormData({...formData, referred_by: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px' }}>
                      <option value="">Walk-in</option>
                      {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Test Name / Description</label>
                  <input required type="text" placeholder="e.g. CBC, MRI Brain" value={formData.test_name} onChange={e => setFormData({...formData, test_name: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px' }} />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Category</label>
                    <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px' }}>
                      <option value="PATHOLOGY">Pathology (Blood/Urine)</option>
                      <option value="RADIOLOGY">Radiology (X-Ray/MRI/CT)</option>
                      <option value="CARDIOLOGY">Cardiology (ECG/Echo)</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Priority <AlertCircle size={14} style={{ display: 'inline', color: '#ef4444' }} /></label>
                    <select required value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px' }}>
                      <option value="ROUTINE">Routine</option>
                      <option value="URGENT">Urgent (4hr TAT)</option>
                      <option value="STAT">STAT (Immediate Emergency)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Billing Cost (₹)</label>
                  <input required type="number" min="0" step="0.01" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px' }} />
                </div>
                
                <button type="submit" style={{ marginTop: '1rem', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: 'white', border: 'none', padding: '1rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Submit Advanced Request</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isReportOpen && selectedTest && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsReportOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ position: 'relative', background: 'white', color: '#1a1a1a', borderRadius: '8px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
              
              <div style={{ position: 'sticky', top: 0, background: '#f8fafc', padding: '1rem 2rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
                <h3 style={{ margin: 0, color: '#1e293b' }}>Laboratory Diagnostic Report</h3>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={handleDownloadPDF} style={{ padding: '0.5rem 1rem', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}><Download size={16}/> Download PDF</button>
                  <button onClick={() => window.print()} style={{ padding: '0.5rem 1rem', background: '#64748b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}><Printer size={16}/> Print</button>
                  <button onClick={() => setIsReportOpen(false)} style={{ padding: '0.5rem', background: 'transparent', border: '1px solid #cbd5e1', color: '#64748b', borderRadius: '6px', cursor: 'pointer' }}><XCircle size={20} /></button>
                </div>
              </div>

              <div id="lab-report-content" style={{ padding: '3rem', backgroundColor: 'white', fontFamily: "'Inter', sans-serif" }}>
                {/* Header */}
                <div style={{ borderBottom: '2px solid #1e293b', paddingBottom: '1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h1 style={{ margin: 0, color: '#8b5cf6', fontSize: '2.5rem', fontWeight: 900 }}>NITIN HOSPITAL</h1>
                    <p style={{ margin: 0, color: '#64748b', fontWeight: 600 }}>Healthcare Excellence & Diagnostic Center</p>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>123 Health City, Medical Zone, IN | +91 98765 43210</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-block', padding: '0.5rem 1rem', border: '2px solid #1e293b', fontWeight: 800, fontSize: '1.2rem' }}>LAB REPORT</div>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#64748b' }}>Report ID: LR-{selectedTest.id.toString().slice(-6).toUpperCase()}</p>
                  </div>
                </div>

                {/* Patient Info Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Patient Details</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{selectedTest.patient_name_display}</div>
                    <div style={{ fontSize: '0.9rem', color: '#475569' }}>Registered ID: P-{selectedTest.patient || 'WALK-IN'}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reference Information</div>
                    <div style={{ fontSize: '1rem', fontWeight: 600 }}>Ref By: Dr. {selectedTest.referred_by_name || 'Self / Walk-in'}</div>
                    <div style={{ fontSize: '0.9rem', color: '#475569' }}>Date: {new Date(selectedTest.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  </div>
                </div>

                {/* Test Details */}
                <div style={{ marginBottom: '3rem' }}>
                  <h4 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#1e293b', textTransform: 'uppercase', fontSize: '0.9rem' }}>Diagnostic Examination</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', background: '#f1f5f9' }}>
                        <th style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>Investigation</th>
                        <th style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>Category</th>
                        <th style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>Priority</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '1rem', border: '1px solid #e2e8f0', fontWeight: 700 }}>{selectedTest.test_name}</td>
                        <td style={{ padding: '1rem', border: '1px solid #e2e8f0' }}>{selectedTest.category}</td>
                        <td style={{ padding: '1rem', border: '1px solid #e2e8f0' }}>{selectedTest.priority}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Clinical Results */}
                <div style={{ marginBottom: '4rem', minHeight: '200px' }}>
                  <h4 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#1e293b', textTransform: 'uppercase', fontSize: '0.9rem' }}>Clinical Observations & Results</h4>
                  <div style={{ padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '4px', lineHeight: '1.6', whiteSpace: 'pre-wrap', color: '#1e293b', fontSize: '1.1rem' }}>
                    {selectedTest.result || 'No clinical data recorded for this investigation.'}
                  </div>
                </div>

                {/* Footer / Signatures */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto', paddingTop: '4rem' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                    <p style={{ margin: 0 }}>This is a computer generated diagnostic report.</p>
                    <p style={{ margin: 0 }}>Verification of this report can be done at Nitin Hospital portal.</p>
                  </div>
                  <div style={{ textAlign: 'center', width: '200px' }}>
                    <div style={{ borderBottom: '1px solid #1e293b', marginBottom: '0.5rem', height: '40px' }}></div>
                    <p style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>Authorized Signatory</p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Consultant Pathologist</p>
                  </div>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
