/**
 * Login Page - Animated glassmorphism login with gradient background
 */
import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { Pill, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { usePatientAuthStore } from '../store/patientAuthStore';

export default function Login() {
  const { login, isAuthenticated, isLoading } = useAuthStore();
  const { patientLogin, isLoading: patientLoading, isPatientAuthenticated } = usePatientAuthStore();
  const navigate = useNavigate();
  
  const [loginType, setLoginType] = useState<'STAFF' | 'PATIENT'>('STAFF');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [patientId, setPatientId] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;
  if (isPatientAuthenticated) return <Navigate to="/patient-portal" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginType === 'STAFF') {
      if (!username || !password) { toast.error('Please enter credentials'); return; }
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      try {
        await login(username, password);
        toast.success('Welcome back, Nitin!');
        navigate('/');
      } catch (err: any) {
        toast.error(err.message || 'Invalid credentials');
      }
    } else {
      if (!patientId) { toast.error('Please enter Patient ID'); return; }
      try {
        await patientLogin(patientId);
        navigate('/patient-portal');
      } catch (err: any) {
        // Handled by store toast
      }
    }
  };


  return (
    <div className="login-gradient" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Floating orbs */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            width: 100 + i * 60,
            height: 100 + i * 60,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${
              i % 2 === 0 ? 'rgba(99, 102, 241, 0.15)' : 'rgba(6, 182, 212, 0.1)'
            }, transparent)`,
            top: `${10 + i * 15}%`,
            left: `${5 + i * 16}%`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 20, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 4 + i,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.5,
          }}
        />
      ))}

      <div style={{ display: 'flex', gap: '2.5rem', width: '100%', maxWidth: '900px', justifyContent: 'center', flexWrap: 'wrap', zIndex: 10, position: 'relative', padding: '1rem' }}>
        
        {/* Left Panel: Staff Login */}
        <motion.div
          initial={{ opacity: 0, x: -40, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          whileHover={{ borderColor: 'rgba(99, 102, 241, 0.6)', boxShadow: '0 0 30px rgba(99, 102, 241, 0.25)' }}
          style={{
            flex: 1,
            minWidth: '340px',
            maxWidth: '420px',
            padding: '2.5rem',
            borderRadius: '28px',
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(25px)',
            border: '2px solid rgba(99, 102, 241, 0.25)',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Top Accent Line */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #6366f1, #4f46e5)' }} />
          
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '20px', display: 'inline-block', width: '100%', marginBottom: '1.25rem', boxShadow: '0 8px 25px rgba(0,0,0,0.2)' }}>
              <img src="/nitin-logo.png" alt="Nitin Hospital" style={{ width: '100%', maxHeight: '60px', objectFit: 'contain' }} />
            </div>
            <h3 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 900, margin: 0, letterSpacing: '-0.03em' }}>Staff Gateway</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: '0.35rem 0 0 0' }}>Internal clinical telemetry & ERP node.</p>
          </div>

          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!username || !password) { toast.error('Please enter credentials'); return; }
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            try {
              await login(username, password);
              toast.success('Welcome back, Nitin!');
              navigate('/');
            } catch (err: any) {
              toast.error(err.message || 'Invalid credentials');
            }
          }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem' }}>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin credentials"
                style={{ width: '100%', padding: '0.85rem 1.25rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'white', fontSize: '0.95rem', outline: 'none', transition: 'all 0.2s' }}
                onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '0.85rem 1.25rem', paddingRight: '3.25rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'white', fontSize: '0.95rem', outline: 'none', transition: 'all 0.2s' }}
                  onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4, transition: 'color 0.2s' }}
                  onMouseEnter={(e) => (e.currentTarget as any).style.color = 'white'}
                  onMouseLeave={(e) => (e.currentTarget as any).style.color = 'rgba(255,255,255,0.4)'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', fontSize: '1.05rem', fontWeight: 800, cursor: isLoading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 6px 20px rgba(99, 102, 241, 0.35)', opacity: isLoading ? 0.7 : 1, letterSpacing: '0.5px' }}
            >
              {isLoading ? <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} /> : 'Authenticate Staff'}
            </motion.button>
          </form>
        </motion.div>

        {/* Right Panel: Patient Portal */}
        <motion.div
          initial={{ opacity: 0, x: 40, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
          whileHover={{ borderColor: 'rgba(16, 185, 129, 0.6)', boxShadow: '0 0 30px rgba(16, 185, 129, 0.25)' }}
          style={{
            flex: 1,
            minWidth: '340px',
            maxWidth: '420px',
            padding: '2.5rem',
            borderRadius: '28px',
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(25px)',
            border: '2px solid rgba(16, 185, 129, 0.25)',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Top Accent Line */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #10b981, #059669)' }} />

          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '1.25rem', borderRadius: '24px', display: 'inline-block', color: '#10b981', marginBottom: '1.25rem', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
              <Pill size={44} style={{ animation: 'pulse 2.5s infinite' }} />
            </div>
            <h3 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 900, margin: 0, letterSpacing: '-0.03em' }}>Patient Vault</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: '0.35rem 0 0 0' }}>Read-only diagnostics & clinical records.</p>
          </div>

          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!patientId) { toast.error('Please enter Patient ID'); return; }
            try {
              await patientLogin(patientId);
              navigate('/patient-portal');
            } catch (err: any) { /* Handled */ }
          }}>
            <div style={{ marginBottom: '2.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem' }}>Clinical Patient ID</label>
              <input
                type="text"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="Format: AB-0000-NH-DOC-0000-x0"
                style={{ width: '100%', padding: '0.85rem 1.25rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#10b981', fontSize: '0.95rem', outline: 'none', transition: 'all 0.2s', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.5px' }}
                onFocus={(e) => e.target.style.borderColor = '#10b981'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', display: 'block', marginTop: '0.5rem', lineHeight: '1.3' }}>
                *Provide identifier matching verification stickers or EMR discharge files.
              </span>
            </div>

            <motion.button
              type="submit"
              disabled={patientLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', fontSize: '1.05rem', fontWeight: 800, cursor: patientLoading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)', opacity: patientLoading ? 0.7 : 1, letterSpacing: '0.5px' }}
            >
              {patientLoading ? <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} /> : 'Access Diagnostic Portal'}
            </motion.button>
          </form>
        </motion.div>

      </div>
    </div>
  );
}
