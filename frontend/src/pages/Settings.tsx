/**
 * Settings Page - Theme, backup, password change, activity logs
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Database, Key, Activity, Download, RotateCcw, Shield, Info } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { useAuthStore } from '../store/authStore';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function Settings() {
  const { theme, toggleTheme } = useThemeStore();
  const { changePassword } = useAuthStore();
  const [backups, setBackups] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [creatingBackup, setCreatingBackup] = useState(false);

  useEffect(() => {
    fetchBackups();
    fetchLogs();
  }, []);

  const fetchBackups = async () => {
    try {
      const res = await api.get('/backup/list/');
      setBackups(res.data.backups || []);
    } catch { /* ignore */ }
  };

  const fetchLogs = async () => {
    try {
      const res = await api.get('/auth/activity-logs/');
      setLogs(res.data.results || res.data || []);
    } catch { /* ignore */ }
  };

  const createBackup = async () => {
    setCreatingBackup(true);
    try {
      await api.post('/backup/create/');
      toast.success('Backup created!');
      fetchBackups();
    } catch { toast.error('Backup failed'); }
    setCreatingBackup(false);
  };

  const restoreBackup = async (name: string) => {
    if (!confirm(`Restore from ${name}? This will replace current data. Server restart required.`)) return;
    try {
      await api.post('/backup/restore/', { backup_name: name });
      toast.success('Restored! Please restart server.');
    } catch { toast.error('Restore failed'); }
  };

  const handlePasswordChange = async () => {
    if (!oldPass || !newPass) { toast.error('Fill both fields'); return; }
    if (newPass.length < 6) { toast.error('Min 6 characters'); return; }
    try {
      await changePassword(oldPass, newPass);
      toast.success('Password changed!');
      setOldPass(''); setNewPass('');
    } catch { toast.error('Failed - check old password'); }
  };

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.5rem' }}>Settings</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Appearance */}
        <motion.div className="card" style={{ padding: '1.5rem' }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />} Appearance
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>Dark Mode</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Toggle dark/light theme</div>
            </div>
            <button
              onClick={toggleTheme}
              style={{
                width: 52, height: 28, borderRadius: 14, cursor: 'pointer', border: 'none', position: 'relative',
                background: theme === 'dark' ? 'var(--primary)' : 'var(--border)',
                transition: 'background 0.3s',
              }}
            >
              <motion.div
                animate={{ x: theme === 'dark' ? 24 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                style={{
                  width: 24, height: 24, borderRadius: '50%', background: 'white',
                  position: 'absolute', top: 2,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              />
            </button>
          </div>
        </motion.div>

        {/* Password */}
        <motion.div className="card" style={{ padding: '1.5rem' }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Key size={18} /> Change Password
          </h3>
          <div style={{ marginBottom: '0.75rem' }}>
            <label className="label">Current Password</label>
            <input type="password" className="input" value={oldPass} onChange={e => setOldPass(e.target.value)} />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label className="label">New Password</label>
            <input type="password" className="input" value={newPass} onChange={e => setNewPass(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={handlePasswordChange} style={{ width: '100%' }}>
            Update Password
          </button>
        </motion.div>

        {/* Backup */}
        <motion.div className="card" style={{ padding: '1.5rem' }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={18} /> Backup & Restore
          </h3>
          <button className="btn btn-primary" onClick={createBackup} disabled={creatingBackup} style={{ width: '100%', marginBottom: '1rem' }}>
            <Database size={16} /> {creatingBackup ? 'Creating...' : 'Create Backup Now'}
          </button>
          <div style={{ maxHeight: 200, overflow: 'auto' }}>
            {backups.length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No backups yet</p>
            ) : (
              backups.map((b, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-light)',
                  fontSize: '0.8125rem',
                }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{b.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {b.timestamp} • {(b.size / 1024).toFixed(0)} KB
                    </div>
                  </div>
                  <button className="btn btn-ghost" onClick={() => restoreBackup(b.name)} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                    <RotateCcw size={14} /> Restore
                  </button>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Activity Logs */}
        <motion.div className="card" style={{ padding: '1.5rem' }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} /> Activity Logs
          </h3>
          <div style={{ maxHeight: 280, overflow: 'auto' }}>
            {(logs || []).slice(0, 20).map((log: any, i: number) => (
              <div key={i} style={{
                padding: '0.5rem 0', borderBottom: '1px solid var(--border-light)',
                fontSize: '0.8125rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 500 }}>{log.action}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {new Date(log.timestamp).toLocaleString('en-IN')}
                  </span>
                </div>
                {log.details && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.details}</div>}
              </div>
            ))}
            {logs.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No activity yet</p>}
          </div>
        </motion.div>
      </div>

      {/* App Info */}
      <motion.div className="card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Info size={18} /> About
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem', fontSize: '0.875rem' }}>
          <div><span style={{ color: 'var(--text-muted)' }}>App Name:</span> <strong>Nitin Hospital</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Version:</span> <strong>1.5.0 Pro</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Developer:</span> <strong>Nitin</strong></div>
        </div>
      </motion.div>
    </div>
  );
}
