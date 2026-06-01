import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, User, Phone, Calendar, Stethoscope, Bed, Award, FileText, Download, Shield, UserCheck, Activity } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { generateCustomPatientId } from '../api/patientIdHelper';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';

export default function PatientList() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await api.get('/hospital/patients/');
        setPatients(res.data?.results || res.data || []);
      } catch (err) {
        toast.error('Could not retrieve master registry data');
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  const filtered = patients.filter(p =>
    (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.contact_number || '').includes(searchTerm) ||
    generateCustomPatientId(p).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToCSV = () => {
    const headers = ["Patient ID", "Name", "Age", "Gender", "Phone", "Doctor", "Ward", "Diagnosis"];
    const rows = filtered.map(p => [
      generateCustomPatientId(p),
      p.name,
      p.age,
      p.gender,
      p.contact_number,
      p.assigned_doctor_name || 'Unassigned',
      p.assigned_room_number || 'Gen Ward',
      p.ailment || 'N/A'
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Detailed_Patients_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Futuristic Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', letterSpacing: '-0.05em' }}>
            <Activity size={36} style={{ color: 'var(--primary)', animation: 'pulse 2s infinite' }} /> Clinical Master Index
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0 0', fontSize: '0.95rem' }}>Centralized operational telemetry & patient profiles.</p>
        </div>
        <button 
          onClick={exportToCSV}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(99, 102, 241, 0.25)' }}
        >
          <Download size={18} /> Export Spreadsheet
        </button>
      </div>

      {/* Search Panel */}
      <div className="card" style={{ padding: '1.25rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <div style={{ position: 'relative' }}>
          <Search size={20} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Query via Name, Contact, or Cyber Patient ID..." 
            className="input"
            style={{ paddingLeft: '3.25rem', borderRadius: '14px', height: '50px', fontSize: '1rem', border: '1px solid var(--border)', background: 'var(--bg-tertiary)', width: '100%' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Futuristic Table */}
      <div className="card" style={{ flex: 1, overflow: 'hidden', padding: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '24px', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ flex: 1, overflow: 'auto' }} className="custom-scrollbar">
          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>Synchronizing secure profiles...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Shield size={40} style={{ margin: '0 auto 1rem', opacity: 0.4, color: 'var(--primary)' }} />
              No records found matching the queried vectors.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '1.25rem', color: 'var(--text-muted)', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.05em' }}>PATIENT TELEMETRY</th>
                  <th style={{ padding: '1.25rem', color: 'var(--text-muted)', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.05em' }}>DESCRIPTIVE SIGNATURE</th>
                  <th style={{ padding: '1.25rem', color: 'var(--text-muted)', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.05em' }}>ASSIGNED PIPELINE</th>
                  <th style={{ padding: '1.25rem', color: 'var(--text-muted)', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.05em', textAlign: 'center' }}>VALIDATION NODES</th>
                  <th style={{ padding: '1.25rem', color: 'var(--text-muted)', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.05em', textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, idx) => {
                  const customId = generateCustomPatientId(p);
                  const qrData = `ID: ${customId}\nName: ${p.name}`;
                  return (
                    <motion.tr 
                      key={p.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.03, 0.4) }}
                      whileHover={{ background: 'rgba(255, 255, 255, 0.02)' }}
                      style={{ borderBottom: '1px solid var(--border)', transition: 'all 0.2s ease' }}
                    >
                      {/* Telemetry Info */}
                      <td style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          <div style={{ width: 46, height: 46, borderRadius: '14px', background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(79,70,229,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', border: '1px solid rgba(99,102,241,0.15)' }}>
                            <User size={22} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.05rem' }}>{p.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                              <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{p.age}Y</span> • {p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : 'Other'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Phone size={12} style={{ color: '#10b981' }} /> {p.contact_number}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Unique ID */}
                      <td style={{ padding: '1.25rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', background: 'rgba(99, 102, 241, 0.08)', padding: '0.4rem 0.75rem', borderRadius: '8px', display: 'inline-block', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                          {customId}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <Calendar size={14} /> Logged: {new Date(p.admission_date || Date.now()).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Care Assignment */}
                      <td style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                            <Stethoscope size={16} style={{ color: '#6366f1' }} />
                            <span>{p.assigned_doctor_name || 'Dr. Pankaj Dubey'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            <Bed size={16} style={{ color: '#10b981' }} />
                            <span>Ward: {p.assigned_room_number || 'General'}</span>
                          </div>
                        </div>
                      </td>

                      {/* QR & Barcodes */}
                      <td style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', width: 'fit-content', margin: '0 auto' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
                            <Barcode value={customId} width={0.5} height={24} fontSize={6} displayValue={false} />
                          </div>
                          <div style={{ padding: '2px', background: 'white', borderRadius: '4px' }}>
                            <QRCodeSVG value={qrData} size={50} level="M" />
                          </div>
                        </div>
                      </td>

                      {/* Control Nodes */}
                      <td style={{ padding: '1.25rem', textAlign: 'center' }}>
                        <button 
                          onClick={() => navigate(`/emr?patient=${p.id?.id || p.id}`)}
                          style={{ padding: '0.5rem 1rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                          Open EMR
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
