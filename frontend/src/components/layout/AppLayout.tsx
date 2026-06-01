/**
 * AppLayout - Main layout wrapper with Sidebar and TopNav
 */
import { ReactNode, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { motion } from 'framer-motion';
import NHBot from '../bot/NHBot';

interface Props { children: ReactNode; }

export default function AppLayout({ children }: Props) {
  const sidebarCollapsed = useThemeStore((s) => s.sidebarCollapsed);
  const logout = useAuthStore((s) => s.logout);

  // Auto logout on 30 min inactivity
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        logout();
        window.location.href = '/login';
      }, 30 * 60 * 1000); // 30 minutes
    };
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(e => document.addEventListener(e, reset, true));
    reset();
    return () => {
      clearTimeout(timeout);
      events.forEach(e => document.removeEventListener(e, reset, true));
    };
  }, [logout]);

  const sidebarWidth = sidebarCollapsed ? 72 : 260;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <motion.div
        animate={{ marginLeft: sidebarWidth }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}
      >
        <TopNav />
        <main style={{
          flex: 1,
          padding: '1.5rem',
          overflowY: 'auto',
          position: 'relative',
          background: 'var(--bg-primary)',
        }}>
          {/* Simplified Background */}
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none', background: 'radial-gradient(circle at 10% 10%, var(--primary-glow) 0%, transparent 40%), radial-gradient(circle at 90% 90%, rgba(6,182,212,0.05) 0%, transparent 40%)' }}>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{ position: 'relative', zIndex: 1 }}
          >
            {children}
          </motion.div>
        </main>
      </motion.div>
      <NHBot />
    </div>
  );
}
