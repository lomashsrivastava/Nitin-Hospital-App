/**
 * Sidebar - Navigation sidebar with icons and animation
 */
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../../store/themeStore';
import {
  LayoutDashboard, Receipt, Package, ShoppingCart,
  BarChart3, FileSpreadsheet, Settings, ChevronLeft, Pill, Stethoscope, Users, UserPlus, Bed,
  Calendar, FlaskConical, Droplet, Ambulance, Activity, IndianRupee, History
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, color: '#6366f1', gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)' },
  
  // Patient Care
  { path: '/patients', label: 'Patient Registry', icon: UserPlus, color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
  { path: '/patients-detailed', label: 'Patient', icon: Users, color: '#d97706', gradient: 'linear-gradient(135deg, #f59e0b, #be123c)' },
  { path: '/appointments', label: 'Appointments', icon: Calendar, color: '#f43f5e', gradient: 'linear-gradient(135deg, #f43f5e, #be123c)' },
  { path: '/emr', label: 'Clinical EMR', icon: Activity, color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
  { path: '/history', label: 'Medical History', icon: History, color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
  
  // Critical & IPD
  { path: '/ambulance', label: 'Ambulance Unit', icon: Ambulance, color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444, #b91c1c)' },
  { path: '/ot', label: 'Surgery / OT', icon: Activity, color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
  { path: '/bloodbank', label: 'Blood Bank', icon: Droplet, color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444, #b91c1c)' },
  { path: '/admissions', label: 'IPD Admissions', icon: UserPlus, color: '#ec4899', gradient: 'linear-gradient(135deg, #ec4899, #be185d)' },
  { path: '/rooms', label: 'Room Registry', icon: Bed, color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
  
  // Ancillary
  { path: '/laboratory', label: 'Diagnostics', icon: FlaskConical, color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
  { path: '/pharmacy', label: 'Smart Pharmacy', icon: Pill, color: '#14b8a6', gradient: 'linear-gradient(135deg, #14b8a6, #0f766e)' },
  
  // Finance
  { path: '/billing', label: 'Quick Billing', icon: Receipt, color: '#06b6d4', gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)' },
  { path: '/master-billing', label: 'Final Discharge', icon: Receipt, color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
  { path: '/payroll', label: 'HR Payroll', icon: IndianRupee, color: '#10b981', gradient: 'linear-gradient(135deg, #34d399, #059669)' },
  
  // Admin & Management
  { path: '/doctors', label: 'Doctors List', icon: Stethoscope, color: '#0ea5e9', gradient: 'linear-gradient(135deg, #0ea5e9, #2563eb)' },
  { path: '/staff', label: 'Hospital Staff', icon: Users, color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #d946ef)' },
  { path: '/inventory', label: 'Inventory Hub', icon: Package, color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
  { path: '/reports', label: 'Analytics', icon: BarChart3, color: '#ec4899', gradient: 'linear-gradient(135deg, #ec4899, #be185d)' },
  { path: '/excel', label: 'Data Hub', icon: FileSpreadsheet, color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
  { path: '/settings', label: 'Settings', icon: Settings, color: '#64748b', gradient: 'linear-gradient(135deg, #64748b, #475569)' },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useThemeStore();
  const location = useLocation();
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      {/* Auto Simulation Particle Background */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        {/* Dynamic Reactive Background Layer */}
        <motion.div
           animate={{ 
             background: hoveredColor 
               ? `linear-gradient(135deg, ${hoveredColor}20 0%, ${hoveredColor}05 100%)`
               : [
                 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(6,182,212,0.05) 100%)',
                 'linear-gradient(135deg, rgba(236,72,153,0.15) 0%, rgba(139,92,246,0.05) 100%)',
                 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(59,130,246,0.05) 100%)',
                 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(2ef,68,68,0.05) 100%)',
                 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(6,182,212,0.05) 100%)',
               ]
           }}
           transition={{ duration: hoveredColor ? 0.4 : 15, repeat: hoveredColor ? 0 : Infinity, ease: 'linear' }}
           style={{ position: 'absolute', inset: 0, opacity: 1 }}
        />
        {/* Particle 1 */}
        <motion.div
           animate={{ y: ['100vh', '-10vh'], rotate: [0, 360], opacity: [0, 0.4, 0] }}
           transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
           style={{ position: 'absolute', left: '10%', width: 20, height: 20, border: `2px solid ${hoveredColor || 'var(--primary)'}`, borderRadius: '4px', transition: 'border-color 0.4s' }}
        />
        {/* Particle 2 */}
        <motion.div
           animate={{ y: ['100vh', '-10vh'], rotate: [360, 0], opacity: [0, 0.5, 0] }}
           transition={{ duration: 25, repeat: Infinity, ease: 'linear', delay: 2 }}
           style={{ position: 'absolute', right: '15%', width: 14, height: 14, background: hoveredColor || 'var(--accent)', borderRadius: '50%', transition: 'background-color 0.4s' }}
        />
        {/* Particle 3 */}
        <motion.div
           animate={{ y: ['100vh', '-10vh'], scale: [1, 1.5, 1], opacity: [0, 0.3, 0] }}
           transition={{ duration: 18, repeat: Infinity, ease: 'linear', delay: 5 }}
           style={{ position: 'absolute', left: '40%', width: 30, height: 30, border: `1px solid ${hoveredColor || 'var(--success)'}`, borderRadius: '50%', transition: 'border-color 0.4s' }}
        />
        {/* Particle 4 */}
        <motion.div
           animate={{ y: ['100vh', '-10vh'], rotate: [0, -180], opacity: [0, 0.4, 0] }}
           transition={{ duration: 22, repeat: Infinity, ease: 'linear', delay: 8 }}
           style={{ position: 'absolute', left: '60%', width: 15, height: 15, background: hoveredColor ? `linear-gradient(135deg, ${hoveredColor}, ${hoveredColor}aa)` : 'linear-gradient(135deg, var(--warning), var(--error))', borderRadius: '4px', transition: 'background 0.4s' }}
        />
      </div>
      <div style={{
        padding: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        borderBottom: '1px solid var(--border)',
        minHeight: 'var(--topbar-height)',
        position: 'relative',
        zIndex: 1,
      }}>
        <AnimatePresence mode="wait">
          {!sidebarCollapsed ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden', whiteSpace: 'nowrap', display: 'flex', justifyContent: 'center', width: '100%' }}
            >
              <img 
                src="/nitin-logo.png" 
                alt="Nitin Hospital" 
                style={{ height: '50px', width: 'auto', objectFit: 'contain' }} 
              />
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                width: 40, height: 40,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                background: 'linear-gradient(135deg, #10b981, #3b82f6)',
                boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
              }}
            >
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}>
                <Pill size={22} color="white" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '1rem 0.75rem', overflowY: 'auto', position: 'relative', zIndex: 1 }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: sidebarCollapsed ? '0.75rem' : '0.8rem 1.25rem',
                marginBottom: '0.5rem',
                borderRadius: '0 25px 25px 0', /* Curved Path */
                marginLeft: '-0.75rem', /* Pull back to border */
                textDecoration: 'none',
                color: isActive ? 'white' : 'var(--text-secondary)',
                background: isActive ? item.gradient : 'transparent',
                boxShadow: isActive ? `0 4px 15px ${item.color}40` : 'none',
                fontWeight: isActive ? 700 : 600,
                fontSize: '0.875rem',
                transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                position: 'relative',
                overflow: 'hidden',
              }}
              title={sidebarCollapsed ? item.label : undefined}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = `${item.color}15`;
                  (e.currentTarget as HTMLElement).style.color = item.color;
                  (e.currentTarget as HTMLElement).style.transform = 'translateX(8px)';
                  (e.currentTarget as HTMLElement).style.borderRadius = '25px';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateX(0px)';
                  (e.currentTarget as HTMLElement).style.borderRadius = '0 25px 25px 0';
                }
              }}
            >
              <motion.div whileHover={{ rotate: 15 }} transition={{ type: 'spring' }}>
                <Icon size={20} style={{ flexShrink: 0 }} />
              </motion.div>
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {isActive && (
                <motion.div
                  layoutId="sidebar-indicator"
                  style={{
                    position: 'absolute',
                    left: '0.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 6,
                    height: 6,
                    background: 'white',
                    borderRadius: '50%',
                    boxShadow: '0 0 10px white'
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                />
              )}
              {/* Touch ripple effect underlay */}
              <div style={{ position: 'absolute', right: '-10%', width: '50px', height: '100%', background: `linear-gradient(270deg, ${item.color}30, transparent)`, opacity: isActive ? 1 : 0, transition: '0.3s' }}></div>
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse button */}
      <div style={{
        padding: '0.75rem',
        borderTop: '1px solid var(--border)',
      }}>
        <button
          onClick={toggleSidebar}
          className="btn btn-ghost"
          style={{
            width: '100%',
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            gap: '0.75rem',
            padding: '0.75rem',
          }}
        >
          <motion.div
            animate={{ rotate: sidebarCollapsed ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronLeft size={20} />
          </motion.div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ fontSize: '0.875rem' }}
              >
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
