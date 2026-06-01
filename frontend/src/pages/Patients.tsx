import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Search, Stethoscope, Bed, Phone, Calendar, ArrowRight, X, User, IndianRupee, Printer, Download, Banknote, Smartphone, CreditCard } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import Barcode from 'react-barcode';
import { generateCustomPatientId } from '../api/patientIdHelper';
import jsPDF from 'jspdf';

export default function Patients() {
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientHistory, setPatientHistory] = useState<any>({ consultations: [], admissions: [], invoices: [], surgeries: [] });
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showSlipModal, setShowSlipModal] = useState(false);
  const slipRef = useRef<HTMLDivElement>(null);

  // Multi-step Registration State
  const [regStep, setRegStep] = useState(1);
  const [formData, setFormData] = useState<any>({ gender: 'M' });
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedFloor, setSelectedFloor] = useState<string>('');
  const [genderFilter, setGenderFilter] = useState<string>('All');
  const [docFilter, setDocFilter] = useState<string>('All');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>('');

  const fetchData = async () => {
    try {
      const [pRes, dRes, rRes, depRes] = await Promise.all([
        api.get('/hospital/patients/'),
        api.get('/hospital/doctors/'),
        api.get('/hospital/rooms/?unoccupied=true'),
        api.get('/hospital/departments/')
      ]);
      setPatients(pRes.data?.results || pRes.data || []);
      setDoctors(dRes.data?.results || dRes.data || []);
      setRooms(rRes.data?.results || rRes.data || []);
      setDepartments(depRes.data?.results || depRes.data || []);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (regStep === 1) {
      if (!formData.name || !formData.contact_number || !formData.age) return toast.error('Fill required fields');
      setRegStep(2);
    } else if (regStep === 2) {
      setRegStep(3);
    } else if (regStep === 3) {
      handleCompleteRegistration();
    }
  };

  const handleCompleteRegistration = async () => {
    try {
      const payload = {
        ...formData,
        assigned_doctor: formData.assigned_doctor || null,
        assigned_room: formData.assigned_room || null,
        advance_deposit: Number(formData.advance_deposit) || 0
      };
      const res = await api.post('/hospital/patients/', payload);
      const newPatient = res.data;
      
      toast.success('Registration & Payment Successful!');
      setShowModal(false);
      setFormData({ gender: 'M' });
      setRegStep(1);
      setSelectedPatient(newPatient);
      setShowSlipModal(true);
      fetchData();
    } catch { toast.error('Error completing registration'); }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/hospital/patients/${formData.id}/`, formData);
      toast.success('Patient updated successfully!');
      setShowEditModal(false);
      fetchData();
    } catch { toast.error('Failed to update patient'); }
  };

  const deletePatient = async (id: number) => {
    if (!window.confirm('Are you absolutely sure you want to permanently delete this patient from the database? This action cannot be undone.')) return;
    try {
      await api.delete(`/hospital/patients/${id}/`);
      toast.success('Patient record deleted successfully');
      fetchData();
    } catch {
      toast.error('Failed to delete patient record');
    }
  };

  const fetchPatientHistory = async (patient: any) => {
    const pid = String(patient.id?.id || patient.id);
    setSelectedPatient(patient);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/hospital/patients/${pid}/history/`);
      setPatientHistory(res.data);
    } catch { 
      toast.error('Failed to load full clinical history'); 
    } finally {
      setLoadingHistory(false);
    }
  };

  const printHTML = () => {
    window.print();
  };

  const downloadPDF = async (patientNameOverride?: string) => {
    const input = document.getElementById('print-slip');
    if (!input) return;
    
    const oldTransform = input.style.transform;
    input.style.transform = 'none'; // reset scale for clear canvas

    try {
      const toastId = toast.loading('Generating HD PDF...');
      const canvas = await html2canvas(input, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      const fileName = patientNameOverride || selectedPatient?.name || 'Slip';
      pdf.save(`Prescription_${fileName.replace(/ /g, '_')}.pdf`);
      
      toast.dismiss(toastId);
      toast.success('PDF Saved Successfully!');
    } catch (err) {
      toast.error('Failed to generate PDF');
    } finally {
      input.style.transform = oldTransform;
    }
  };

  const triggerSlipAction = (p: any, action: 'VIEW' | 'PRINT' | 'PDF') => {
    setSelectedPatient(p);
    setShowSlipModal(true);
    if (action === 'PRINT') {
      setTimeout(printHTML, 300);
    } else if (action === 'PDF') {
      setTimeout(() => downloadPDF(p.name), 300);
    }
  };

  const exportToCSV = () => {
    const headers = ["ID", "Name", "Age", "Gender", "Contact", "Admission Date", "Doctor", "Room"];
    const rows = filteredPatients.map(p => [
      generateCustomPatientId(p),
      `"${p.name}"`,
      p.age,
      p.gender,
      p.contact_number,
      new Date(p.admission_date).toLocaleDateString(),
      `"${p.assigned_doctor_name || 'Unassigned'}"`,
      `"${p.assigned_room_number || 'Gen Ward'}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Patients_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exported Patient Data successfully!');
  };

  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGender = genderFilter === 'All' || p.gender === genderFilter;
    const matchesDoc = docFilter === 'All' || String(p.assigned_doctor) === docFilter;
    return matchesSearch && matchesGender && matchesDoc;
  });
  const filteredDoctors = doctors.filter(d => {
    const dDeptId = String(d.department?.id || d.department || '');
    return !selectedDept || dDeptId === String(selectedDept);
  });
  const filteredRooms = rooms.filter(r => {
    const rFloor = String(r.floor);
    return !selectedFloor || rFloor === String(selectedFloor);
  });

  const selectedDoctor = doctors.find(d => String(d.id?.id || d.id) === String(formData.assigned_doctor));
  const fee = selectedDoctor ? Number(selectedDoctor.consultation_fee) : 0;
  
  const admittedToday = patients.filter(p => {
    if (!p.admission_date) return false;
    const today = new Date().toDateString();
    const admDate = new Date(p.admission_date).toDateString();
    return today === admDate;
  }).length;
  const totalDeposits = patients.reduce((sum, p) => sum + Number(p.advance_deposit || 0), 0);
  const occupiedRooms = [...new Set(patients.map(p => p.assigned_room_number).filter(Boolean))].length;

  return (
    <div style={{ paddingBottom: '2rem' }}>
      {/* Hide standard UI when printing */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-slip, #print-slip * { visibility: visible; }
          #print-slip { position: absolute; left: 0; top: 0; width: 100%; height: 100vh; padding: 0 !important; margin: 0 !important; box-shadow: none !important; border-radius: 0 !important; background: white !important;}
        }
        @keyframes borderBlink {
          0% { border-color: var(--border); }
          50% { border-color: #f59e0b; box-shadow: 0 0 10px rgba(245, 158, 11, 0.15); }
          100% { border-color: var(--border); }
        }
        @keyframes qrBlink {
          0% { border-color: var(--border); box-shadow: none; }
          50% { border-color: #10b981; box-shadow: 0 0 12px rgba(16, 185, 129, 0.25); }
          100% { border-color: var(--border); box-shadow: none; }
        }
        @keyframes delPulse {
          0% { background: rgba(239,68,68,0.03); border-color: rgba(239,68,68,0.1); }
          50% { background: rgba(239,68,68,0.12); border-color: #ef4444; }
          100% { background: rgba(239,68,68,0.03); border-color: rgba(239,68,68,0.1); }
        }
        @keyframes editPulse {
          0% { background: rgba(16,185,129,0.03); border-color: rgba(16,185,129,0.1); }
          50% { background: rgba(16,185,129,0.12); border-color: #10b981; }
          100% { background: rgba(16,185,129,0.03); border-color: rgba(16,185,129,0.1); }
        }
        @keyframes viewPulse {
          0% { background: rgba(99,102,241,0.03); border-color: rgba(99,102,241,0.1); }
          50% { background: rgba(99,102,241,0.12); border-color: #6366f1; }
          100% { background: rgba(99,102,241,0.03); border-color: rgba(99,102,241,0.1); }
        }
        @keyframes pdfPulse {
          0% { background: rgba(14,165,233,0.03); border-color: rgba(14,165,233,0.1); }
          50% { background: rgba(14,165,233,0.12); border-color: #0ea5e9; }
          100% { background: rgba(14,165,233,0.03); border-color: rgba(14,165,233,0.1); }
        }
        @keyframes printPulse {
          0% { background: rgba(59,130,246,0.03); border-color: rgba(59,130,246,0.1); }
          50% { background: rgba(59,130,246,0.12); border-color: #3b82f6; }
          100% { background: rgba(59,130,246,0.03); border-color: rgba(59,130,246,0.1); }
        }
        @keyframes hisPulse {
          0% { background: rgba(245,158,11,0.03); border-color: rgba(245,158,11,0.1); }
          50% { background: rgba(245,158,11,0.12); border-color: #f59e0b; }
          100% { background: rgba(245,158,11,0.03); border-color: rgba(245,158,11,0.1); }
        }
      `}</style>
      
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <motion.div
              animate={{ rotateY: [0, 360] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', padding: '0.5rem', borderRadius: '12px', color: 'white' }}
            >
              <UserPlus size={28} />
            </motion.div>
            <span className="text-gradient" style={{ backgroundImage: 'linear-gradient(90deg, #f59e0b, #d97706)' }}>Patient Registry</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Register patients, assign rooms, pay consultancy fees.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setFormData({ gender: 'M' }); setRegStep(1); setShowModal(true); }} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
          <UserPlus size={18} /> Register Patient
        </button>
      </motion.div>

      {/* Analytics Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <motion.div whileHover={{ scale: 1.02 }} style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', padding: '0.75rem', borderRadius: '12px' }}>
            <User size={24} />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Total Patients</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{patients.length}</div>
          </div>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.75rem', borderRadius: '12px' }}>
            <Calendar size={24} />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Admitted Today</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{admittedToday}</div>
          </div>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '0.75rem', borderRadius: '12px' }}>
            <IndianRupee size={24} />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Total Deposits</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>₹{totalDeposits.toLocaleString()}</div>
          </div>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', padding: '0.75rem', borderRadius: '12px' }}>
            <Bed size={24} />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Occupied Rooms</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{occupiedRooms}</div>
          </div>
        </motion.div>
      </div>

      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', position: 'relative' }}>
        <Search size={18} style={{ position: 'absolute', left: '2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input type="text" className="input" placeholder="Search registered patients..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} style={{ paddingLeft: '2.5rem', width: '100%' }} />
      </div>

      {/* Advanced Filter & Export Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Gender Filter */}
          <select 
            value={genderFilter} 
            onChange={(e) => setGenderFilter(e.target.value)}
            style={{ padding: '0.5rem 1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontWeight: 600, outline: 'none' }}
          >
            <option value="All">All Genders</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="O">Other</option>
          </select>

          {/* Doctor Filter */}
          <select 
            value={docFilter} 
            onChange={(e) => setDocFilter(e.target.value)}
            style={{ padding: '0.5rem 1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontWeight: 600, outline: 'none' }}
          >
            <option value="All">All Doctors</option>
            {doctors.map(doc => (
              <option key={doc.id?.id || doc.id} value={String(doc.id?.id || doc.id)}>{doc.name}</option>
            ))}
          </select>
        </div>

        <button 
          onClick={exportToCSV}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
        >
          <Download size={18} /> Export Data
        </button>
      </div>

      {loading ? <div>Loading patients...</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '1rem' }}>
          <AnimatePresence>
            {filteredPatients.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(p => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '1rem', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: 'var(--shadow-sm)', animation: 'borderBlink 3s infinite ease-in-out' }} className="card">
                <div>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.1rem', flexShrink: 0 }}>
                      {(p.name || 'P').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ overflow: 'hidden', flex: 1 }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{p.age}Y • {p.gender}</span>
                        <span style={{ fontSize: '0.55rem', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}>ADMITTED</span>
                        {Number(p.advance_deposit) >= 5000 && (
                          <span style={{ fontSize: '0.55rem', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)', animation: 'pulse 2s infinite' }}>VIP</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Columns Split */}
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
                    {/* Left Column: Info & Dep */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <div>📞 {p.contact_number}</div>
                        <div>📅 {new Date(p.admission_date).toLocaleDateString()}</div>
                        <div>🩺 {p.assigned_doctor_name || 'Unassigned'}</div>
                        <div>🛏️ {p.assigned_room_number || 'General Ward'}</div>
                      </div>
                      
                      <div style={{ padding: '0.3rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', maxWidth: '120px' }}>
                        <div>
                          <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)', fontWeight: 700 }}>ADVANCE</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#10b981' }}>₹{Number(p.advance_deposit)}</div>
                        </div>
                        <button onClick={() => { setSelectedPatient(p); setShowDepositModal(true); }} style={{ padding: '0.2rem 0.4rem', fontSize: '0.6rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', height: 'auto', cursor: 'pointer' }}>
                          +
                        </button>
                      </div>
                    </div>

                    {/* Right Column: QR & Barcode */}
                    {(() => {
                      const customId = generateCustomPatientId(p);
                      const qrData = `ID: ${customId}\nName: ${p.name}`;
                      return (
                        <div style={{ width: '160px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-tertiary)', padding: '0.5rem', borderRadius: '10px', border: '1px solid var(--border)', animation: 'qrBlink 4s infinite ease-in-out' }}>
                          <div style={{ padding: '4px', background: 'white', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                            <QRCodeSVG value={qrData} size={85} level="M" />
                          </div>
                          <div style={{ background: 'white', padding: '2px', borderRadius: '4px', width: '100%', display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
                            <Barcode value={customId} width={0.45} height={20} fontSize={6} displayValue={false} />
                          </div>
                          <div style={{ fontSize: '0.55rem', fontWeight: 700, color: 'var(--primary)', wordBreak: 'break-all', textAlign: 'center', width: '100%', lineHeight: 1 }}>{customId}</div>
                        </div>
                      );
                    })()}
                  </div>

                  {p.ailment && (
                    <div style={{ marginTop: '0.5rem', background: 'var(--bg-tertiary)', padding: '0.4rem', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--text-primary)', borderLeft: '3px solid var(--primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <b>Diag:</b> {p.ailment}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                  <button onClick={() => deletePatient(p.id)} style={{ padding: '0.4rem 0', fontSize: '0.65rem', color: '#ef4444', background: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.1)', borderRadius: '6px', cursor: 'pointer', textAlign: 'center', animation: 'delPulse 2s infinite ease-in-out' }}>🗑️ Del</button>
                  <button onClick={() => { setFormData(p); setShowEditModal(true); }} style={{ padding: '0.4rem 0', fontSize: '0.65rem', color: '#10b981', background: 'rgba(16,185,129,0.03)', border: '1px solid rgba(16,185,129,0.1)', borderRadius: '6px', cursor: 'pointer', textAlign: 'center', animation: 'editPulse 2.5s infinite ease-in-out' }}>✏️ Edit</button>
                  <button onClick={() => triggerSlipAction(p, 'VIEW')} style={{ padding: '0.4rem 0', fontSize: '0.65rem', color: '#6366f1', background: 'rgba(99,102,241,0.03)', border: '1px solid rgba(99,102,241,0.1)', borderRadius: '6px', cursor: 'pointer', textAlign: 'center', animation: 'viewPulse 3s infinite ease-in-out' }}>👁️ View</button>
                  <button onClick={() => triggerSlipAction(p, 'PDF')} style={{ padding: '0.4rem 0', fontSize: '0.65rem', color: '#10b981', background: 'rgba(16,185,129,0.03)', border: '1px solid rgba(16,185,129,0.1)', borderRadius: '6px', cursor: 'pointer', textAlign: 'center', animation: 'pdfPulse 3.5s infinite ease-in-out' }}>📄 PDF</button>
                  <button onClick={() => triggerSlipAction(p, 'PRINT')} style={{ padding: '0.4rem 0', fontSize: '0.65rem', color: '#3b82f6', background: 'rgba(59,130,246,0.03)', border: '1px solid rgba(59,130,246,0.1)', borderRadius: '6px', cursor: 'pointer', textAlign: 'center', animation: 'printPulse 4s infinite ease-in-out' }}>🖨️ Prn</button>
                  <button onClick={() => fetchPatientHistory(p)} style={{ padding: '0.4rem 0', fontSize: '0.65rem', color: '#f59e0b', background: 'rgba(245,158,11,0.03)', border: '1px solid rgba(245,158,11,0.1)', borderRadius: '6px', cursor: 'pointer', textAlign: 'center', animation: 'hisPulse 4.5s infinite ease-in-out' }}>🕒 His</button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {!loading && filteredPatients.length > ITEMS_PER_PAGE && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
          <button 
            className="btn btn-secondary" 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', fontWeight: 600 }}>
            Page {currentPage} of {Math.ceil(filteredPatients.length / ITEMS_PER_PAGE)}
          </span>
          <button 
            className="btn btn-secondary" 
            disabled={currentPage === Math.ceil(filteredPatients.length / ITEMS_PER_PAGE)}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      {/* Modern Multi-Step Registration Modal */}
      <AnimatePresence>
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setShowModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="card" style={{ position: 'relative', width: '100%', maxWidth: '600px', padding: '2rem', zIndex: 101, maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Advance Registration</h2>
                <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={24} /></button>
              </div>

              {/* Progress Bar */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
                {[1,2,3].map(step => (
                  <div key={step} style={{ flex: 1, height: '6px', borderRadius: '3px', background: regStep >= step ? '#f59e0b' : 'var(--border)' }} />
                ))}
              </div>

              <form onSubmit={handleNextStep} style={{ display: 'grid', gap: '1.25rem' }}>
                
                {regStep === 1 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Step 1: Patient Identity</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div><label className="label">Full Name</label><input required autoFocus className="input" placeholder="Patient Name" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                      <div><label className="label">Contact Number</label><input required className="input" placeholder="Phone" value={formData.contact_number || ''} onChange={e => setFormData({...formData, contact_number: e.target.value})} /></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                      <div><label className="label">Age</label><input required type="number" className="input" placeholder="Age" value={formData.age || ''} onChange={e => setFormData({...formData, age: Number(e.target.value)})} /></div>
                      <div>
                        <label className="label">Gender</label>
                        <select required className="input select" value={formData.gender || 'M'} onChange={e => setFormData({...formData, gender: e.target.value})}>
                          <option value="M">Male</option><option value="F">Female</option><option value="O">Other</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ marginTop: '1rem' }}>
                      <label className="label">Advance Deposit (INR)</label>
                      <div style={{ position: 'relative' }}>
                        <IndianRupee size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input type="number" className="input" style={{ paddingLeft: '2.5rem' }} placeholder="Initial Advance Amount" value={formData.advance_deposit || ''} onChange={e => setFormData({...formData, advance_deposit: e.target.value})} />
                      </div>
                    </div>
                    <div style={{ marginTop: '1rem' }}>
                      <label className="label">Ailment / Diagnosis</label>
                      <input className="input" placeholder="e.g. Viral Fever" value={formData.ailment || ''} onChange={e => setFormData({...formData, ailment: e.target.value})} />
                    </div>
                  </motion.div>
                )}

                {regStep === 2 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Step 2: Department & Room</h3>
                    
                    {/* Nested Doctor Selection */}
                    <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '12px', marginBottom: '1rem' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', display: 'flex', gap: '0.5rem', alignItems: 'center' }}><Stethoscope size={16}/> Select Doctor</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <label className="label" style={{ fontSize: '0.75rem' }}>1. Filter by Department</label>
                          <select className="input select" value={selectedDept} onChange={e => setSelectedDept(e.target.value)}>
                            <option value="">-- All Departments --</option>
                            {departments.map(d => {
                                const did = String(d.id?.id || d.id);
                                return <option key={did} value={did}>{d.name}</option>;
                            })}
                          </select>
                        </div>
                        <div>
                          <label className="label" style={{ fontSize: '0.75rem' }}>2. Available Doctor</label>
                          <select required className="input select" value={formData.assigned_doctor || ''} onChange={e => setFormData({...formData, assigned_doctor: e.target.value || undefined})}>
                            <option value="">-- Select Doctor --</option>
                            {filteredDoctors.map(d => {
                                const did = String(d.id?.id || d.id);
                                return <option key={did} value={did}>Dr. {d.name} (Fee: ₹{d.consultation_fee})</option>;
                            })}
                          </select>
                        </div>
                      </div>
                      {selectedDoctor && (
                        <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600 }}>
                          Consultation Fee: ₹{selectedDoctor.consultation_fee}
                        </div>
                      )}
                    </div>

                    {/* Nested Room Selection */}
                    <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '12px' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', display: 'flex', gap: '0.5rem', alignItems: 'center' }}><Bed size={16}/> Select Room</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <label className="label" style={{ fontSize: '0.75rem' }}>1. Filter by Floor</label>
                          <select className="input select" value={selectedFloor} onChange={e => setSelectedFloor(e.target.value)}>
                            <option value="">-- All Floors --</option>
                            {[...Array(10)].map((_,i) => <option key={i+1} value={i+1}>Floor {i+1}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="label" style={{ fontSize: '0.75rem' }}>2. Available Room</label>
                          <select className="input select" value={formData.assigned_room || ''} onChange={e => setFormData({...formData, assigned_room: e.target.value || undefined})}>
                            <option value="">-- Optional: Select Room --</option>
                            {filteredRooms.map(r => <option key={r.id} value={r.id}>{r.room_number} ({r.room_type})</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {regStep === 3 && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-block', padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '50%', marginBottom: '1rem' }}>
                      <IndianRupee size={48} color="#f59e0b" />
                    </div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Complete Registration Payment</h3>
                    <p style={{ color: 'var(--text-muted)' }}>Doctor Consultancy Fee: <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>₹{fee}</span></p>

                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', margin: '1.5rem 0' }}>
                      {[
                        { id: 'CASH', icon: Banknote, label: 'Cash' },
                        { id: 'UPI', icon: Smartphone, label: 'UPI' },
                        { id: 'CARD', icon: CreditCard, label: 'Card' }
                      ].map(method => (
                         <button type="button" key={method.id} onClick={() => setPaymentMethod(method.id)}
                            style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center',
                                     border: paymentMethod === method.id ? '2px solid #f59e0b' : '2px solid var(--border)',
                                     background: paymentMethod === method.id ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                                     color: paymentMethod === method.id ? '#f59e0b' : 'var(--text-muted)',
                                     borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                            <method.icon size={18} /> {method.label}
                         </button>
                      ))}
                    </div>

                    {paymentMethod === 'UPI' && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ background: 'white', padding: '1rem', borderRadius: '12px' }}>
                          {/* Use standard generated URI format for UPI payments directly rendering QR */}
                          <QRCodeSVG value={`upi://pay?pa=nitinhospital@upi&pn=Nitin%20Hospital&am=${fee}&cu=INR`} size={150} level={"H"} />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Scan with any UPI App</span>
                      </div>
                    )}
                  </motion.div>
                )}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  {regStep > 1 && <button type="button" className="btn btn-secondary" onClick={() => setRegStep(regStep - 1)}>Back</button>}
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                    {regStep === 1 ? 'Select Doctor & Room' : regStep === 2 ? `Pay ₹${fee}` : 'Confirm Payment & Print Slip'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* A4 Printable Prescription Slip */}
      <AnimatePresence>
        {showSlipModal && selectedPatient && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.85)' }}>
             {/* FIXED TOOLBAR */}
             <div style={{ display: 'flex', gap: '1rem', padding: '1rem 2rem', justifyContent: 'center', alignItems: 'center', zIndex: 201, background: '#111827', color: 'white', borderBottom: '1px solid #374151' }}>
                <span style={{ marginRight: 'auto', fontWeight: 800, fontSize: '1.25rem' }}>Print Preview</span>
                <button className="btn btn-secondary" onClick={() => {
                    const slip = document.getElementById('print-slip');
                    if (slip) slip.style.transform = slip.style.transform === 'scale(1)' ? 'scale(0.6)' : 'scale(1)';
                }} style={{ background: '#374151', color: 'white', border: 'none' }}>🔍 Toggle Zoom</button>
                <button className="btn btn-primary" onClick={printHTML} style={{ background: '#3b82f6', color: 'white', border: 'none' }}><Printer size={18}/> Print</button>
                <button className="btn btn-primary" onClick={downloadPDF} style={{ background: '#10b981', color: 'white', border: 'none' }}><Download size={18}/> Save PDF</button>
                <button className="btn btn-secondary" onClick={() => setShowSlipModal(false)} style={{ background: '#ef4444', color: 'white', border: 'none' }}><X size={18}/> Close</button>
             </div>
             
             {/* SCROLLABLE CANVAS */}
             <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '2rem' }} onClick={() => setShowSlipModal(false)}>
               {/* THE MATCHING A4 SLIP WRAPPER */}
               <div onClick={(e) => e.stopPropagation()} style={{ transformOrigin: 'top center', transition: 'transform 0.3s', transform: 'scale(0.6)', paddingBottom: '3rem' }} id="print-slip">
                 <div ref={slipRef} style={{ background: 'white', width: '210mm', height: '297mm', padding: '20mm', borderRadius: '12px', color: 'black', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', position: 'relative' }}>
                    <div style={{ textAlign: 'center', borderBottom: '3px solid #111', paddingBottom: '10mm', marginBottom: '10mm' }}>
                       <h1 style={{ fontSize: '32px', fontWeight: 900, margin: 0, letterSpacing: '2px', textTransform: 'uppercase' }}>Nitin Hospital</h1>
                       <p style={{ margin: '5px 0 0', fontSize: '14px', color: '#444' }}>Specialty Care & Medical Center • 24/7 Emergency</p>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15mm', fontSize: '16px' }}>
                       <div style={{ width: '45%' }}>
                          <h3 style={{ textTransform: 'uppercase', color: '#555', fontSize: '12px', letterSpacing: '1px', marginBottom: '4px' }}>Consulting Doctor</h3>
                          <p style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Dr. {selectedPatient.assigned_doctor_name || 'N/A'}</p>
                       </div>
                       <div style={{ width: '45%', textAlign: 'right' }}>
                          <h3 style={{ textTransform: 'uppercase', color: '#555', fontSize: '12px', letterSpacing: '1px', marginBottom: '4px' }}>Patient Details</h3>
                          <p style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>{selectedPatient.name}</p>
                          <p style={{ margin: '4px 0 0', color: '#444' }}>Age: {selectedPatient.age} | Sex: {selectedPatient.gender}</p>
                          <p style={{ margin: '4px 0 0', color: '#444', wordBreak: 'break-all', fontSize: '11px', fontWeight: 700 }}>Custom ID: {generateCustomPatientId(selectedPatient)}</p>
                          <p style={{ margin: '4px 0 0', color: '#444' }}>Date: {new Date(selectedPatient.admission_date).toLocaleDateString()}</p>
                       </div>
                    </div>

                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#222', marginBottom: '10mm' }}>Rx</div>

                    {/* Blank ruled space for doctor */}
                    <div style={{ flex: 1, minHeight: '100mm', borderLeft: '2px solid #ddd', paddingLeft: '10mm' }}>
                    </div>

                    {(() => {
                      const customId = generateCustomPatientId(selectedPatient);
                      const qrData = `ID: ${customId}\nName: ${selectedPatient.name}\nAge/Gen: ${selectedPatient.age}/${selectedPatient.gender}\nPhone: ${selectedPatient.contact_number}\nDoctor: ${selectedPatient.assigned_doctor_name || 'Dr. Pankaj Dubey'}`;
                      return (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px dashed #ddd', paddingTop: '5mm', marginBottom: '30mm' }}>
                          <div style={{ textAlign: 'left' }}>
                            <Barcode value={customId} width={0.8} height={35} fontSize={8} displayValue={true} />
                          </div>
                          <div style={{ padding: '6px', background: 'white', borderRadius: '6px', border: '1px solid #e5e7eb', textAlign: 'right' }}>
                            <QRCodeSVG value={qrData} size={65} level="M" />
                          </div>
                        </div>
                      );
                    })()}

                    <div style={{ position: 'absolute', bottom: '20mm', left: '20mm', right: '20mm', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ddd', paddingTop: '10mm', fontSize: '12px', color: '#666' }}>
                       <div>Contact: +91 99999 99999</div>
                       <div>Valid for 7 days</div>
                       <div>Signature: ______________________</div>
                    </div>
                 </div>
               </div>
             </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHistoryModal && selectedPatient && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setShowHistoryModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="card" style={{ position: 'relative', width: '100%', maxWidth: '700px', padding: '2rem', zIndex: 101, maxHeight: '85vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>{selectedPatient.name}'s EMR</h2>
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>Comprehensive Clinical & Financial History</p>
                </div>
                <button onClick={() => setShowHistoryModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={24} /></button>
              </div>

              {loadingHistory ? <div style={{ padding: '3rem', textAlign: 'center' }}>Synchronizing Medical Records...</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  
                  {/* Consultations */}
                  <section>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Stethoscope size={18} color="var(--primary)"/> Consultations</h3>
                    {patientHistory.consultations?.length === 0 ? <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No consultation records found.</p> : (
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {patientHistory.consultations.map((c: any) => (
                            <div key={c.id} style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: '0.5rem' }}>
                                    <span>Dr. {c.doctor_name}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleDateString()}</span>
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}><b>Diag:</b> {c.diagnosis || 'N/A'}</div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{c.clinical_notes}</div>
                            </div>
                        ))}
                        </div>
                    )}
                  </section>

                  {/* Admissions */}
                  <section>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Bed size={18} color="#10b981"/> Admissions</h3>
                    {patientHistory.admissions?.length === 0 ? <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No admission history.</p> : (
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {patientHistory.admissions.map((a: any) => (
                            <div key={a.id} style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                                    <span>Room {a.room_number}</span>
                                    <span className="badge badge-success">{a.status}</span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    Admitted: {new Date(a.admission_time).toLocaleString()}
                                </div>
                            </div>
                        ))}
                        </div>
                    )}
                  </section>

                  {/* Bills */}
                  <section>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><IndianRupee size={18} color="#f59e0b"/> Financial Ledger</h3>
                    {patientHistory.invoices?.length === 0 ? <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No invoices found.</p> : (
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {patientHistory.invoices.map((bill: any) => (
                            <div key={bill.id} style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: '0.25rem' }}>
                                <span>{bill.invoice_number}</span>
                                <span style={{ color: '#10b981' }}>₹{Number(bill.net_amount).toLocaleString('en-IN')}</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(bill.created_at).toLocaleString()} • {bill.payment_method || 'N/A'}</div>
                            </div>
                        ))}
                        </div>
                    )}
                  </section>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Patient Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setShowEditModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="card" style={{ position: 'relative', width: '100%', maxWidth: '500px', padding: '2rem', zIndex: 101 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Edit Patient Details</h2>
                <button onClick={() => setShowEditModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={24} /></button>
              </div>

              <form onSubmit={handleEditSubmit} style={{ display: 'grid', gap: '1.25rem' }}>
                <div><label className="label">Full Name</label><input required className="input" placeholder="Patient Name" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                <div><label className="label">Contact Number</label><input required className="input" placeholder="Phone" value={formData.contact_number || ''} onChange={e => setFormData({...formData, contact_number: e.target.value})} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div><label className="label">Age</label><input required type="number" className="input" placeholder="Age" value={formData.age || ''} onChange={e => setFormData({...formData, age: Number(e.target.value)})} /></div>
                  <div>
                    <label className="label">Gender</label>
                    <select required className="input select" value={formData.gender || 'M'} onChange={e => setFormData({...formData, gender: e.target.value})}>
                      <option value="M">Male</option><option value="F">Female</option><option value="O">Other</option>
                    </select>
                  </div>
                </div>
                <div><label className="label">Address / Notes</label><textarea className="input" placeholder="Address..." value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} rows={3} /></div>
                
                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem', marginTop: '1rem' }}>Save Changes</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Advance Deposit Modal */}
      <AnimatePresence>
        {showDepositModal && selectedPatient && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setShowDepositModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="card" style={{ position: 'relative', width: '100%', maxWidth: '400px', padding: '2rem', zIndex: 301 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>Deposit Advance</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Adding funds for patient: <b style={{ color: 'var(--text-primary)' }}>{selectedPatient.name}</b></p>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="label">Amount to Deposit (INR)</label>
                <div style={{ position: 'relative' }}>
                  <IndianRupee size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#10b981' }} />
                  <input autoFocus type="number" className="input" style={{ paddingLeft: '3rem', fontSize: '1.25rem', fontWeight: 700 }} placeholder="0.00" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <button className="btn btn-secondary" onClick={() => setShowDepositModal(false)}>Cancel</button>
                <button className="btn btn-primary" style={{ background: '#10b981' }} onClick={async () => {
                  if (!depositAmount || Number(depositAmount) <= 0) return toast.error('Enter valid amount');
                  try {
                    const newTotal = (Number(selectedPatient.advance_deposit) || 0) + Number(depositAmount);
                    await api.patch(`/hospital/patients/${selectedPatient.id}/`, { advance_deposit: newTotal });
                    toast.success('Deposit Successful!');
                    setShowDepositModal(false);
                    setDepositAmount('');
                    fetchData();
                  } catch { toast.error('Deposit failed'); }
                }}>Confirm Deposit</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
