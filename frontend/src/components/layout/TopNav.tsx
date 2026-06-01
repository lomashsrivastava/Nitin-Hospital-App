/**
 * TopNav - Top navigation bar with search, theme toggle, and user menu
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import {
  Search, Sun, Moon, Bell, LogOut, User, Menu
} from 'lucide-react';
import api from '../../api/axios';

export default function TopNav() {
  const { theme, toggleTheme, toggleSidebar } = useThemeStore();
  const { user, logout } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Fetch alerts (low stock + expiring)
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const [lowStock, expiring] = await Promise.all([
          api.get('/inventory/medicines/low_stock/'),
          api.get('/inventory/medicines/expiring/'),
        ]);
        const alerts: any[] = [];
        (lowStock.data || []).slice(0, 5).forEach((m: any) => {
          alerts.push({ type: 'warning', message: `Low stock: ${m.name} (${m.quantity} left)` });
        });
        (expiring.data || []).slice(0, 5).forEach((m: any) => {
          alerts.push({ type: 'error', message: `Expiring: ${m.name} (${m.expiry_date})` });
        });
        setNotifications(alerts);
      } catch { /* ignore on first load */ }
    };
    fetchAlerts();
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowUserMenu(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header style={{
      height: 'var(--topbar-height)',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.5rem',
      position: 'sticky',
      top: 0,
      zIndex: 40,
    }}>
      {/* Left section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={toggleSidebar} className="btn btn-ghost btn-icon" style={{ display: 'flex' }}>
          <Menu size={20} />
        </button>
        <div style={{
          position: 'relative',
          width: 320,
        }}>
          <Search size={16} style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
          }} />
          <input
            type="text"
            placeholder="Search medicines, invoices..."
            className="input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 36, background: 'var(--bg-tertiary)', border: 'none' }}
          />
        </div>
      </div>

      {/* Right section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {/* Animated Agency Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          style={{ marginRight: 8 }}
        >
          <motion.div
            animate={{ 
              boxShadow: [
                '0 0 0px var(--primary-glow)', 
                '0 0 15px var(--primary-glow)', 
                '0 0 0px var(--primary-glow)'
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              padding: '0.375rem 0.875rem',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(6,182,212,0.1))',
              color: 'var(--primary)',
              borderRadius: '20px',
              border: '1px solid rgba(99,102,241,0.3)',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              cursor: 'default',
            }}
          >
            <span style={{ 
              width: 6, height: 6, borderRadius: '50%', background: 'var(--success)',
              boxShadow: '0 0 8px var(--success)'
            }}></span>
            Nitin Medical Agency
          </motion.div>
        </motion.div>

        {/* Theme toggle */}
        <motion.button
          onClick={toggleTheme}
          className="btn btn-ghost btn-icon"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={theme}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </motion.div>
          </AnimatePresence>
        </motion.button>

        {/* Notifications */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <motion.button
            onClick={() => setShowNotifications(!showNotifications)}
            className="btn btn-ghost btn-icon"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{ position: 'relative' }}
          >
            <Bell size={20} />
            {notifications.length > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--error)',
              }} />
            )}
          </motion.button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="card"
                style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                  width: 340, maxHeight: 400, overflow: 'auto',
                  boxShadow: 'var(--shadow-xl)',
                }}
              >
                <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: '0.875rem' }}>
                  Notifications ({notifications.length})
                </div>
                {notifications.length === 0 ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    No alerts
                  </div>
                ) : (
                  notifications.map((n, i) => (
                    <div key={i} style={{
                      padding: '0.75rem 1rem',
                      borderBottom: '1px solid var(--border-light)',
                      fontSize: '0.8125rem',
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                    }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: n.type === 'error' ? 'var(--error)' : 'var(--warning)',
                      }} />
                      {n.message}
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User menu */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <motion.button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="btn btn-ghost"
            whileHover={{ scale: 1.02 }}
            style={{
              gap: '0.5rem',
              padding: '0.375rem 0.75rem',
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 600, fontSize: '0.8rem',
            }}>
              {user?.first_name?.[0] || 'N'}
            </div>
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
              {user?.first_name || 'Nitin'}
            </span>
          </motion.button>

          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="card"
                style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                  width: 200, boxShadow: 'var(--shadow-xl)', overflow: 'hidden',
                }}
              >
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{user?.first_name} {user?.last_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.username}</div>
                </div>
                <button
                  onClick={() => { setShowUserMenu(false); }}
                  className="btn btn-ghost"
                  style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 0, padding: '0.625rem 1rem', fontSize: '0.8125rem' }}
                >
                  <User size={16} /> Profile
                </button>
                <button
                  onClick={() => { logout(); setShowUserMenu(false); }}
                  className="btn btn-ghost"
                  style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 0, padding: '0.625rem 1rem', fontSize: '0.8125rem', color: 'var(--error)' }}
                >
                  <LogOut size={16} /> Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
