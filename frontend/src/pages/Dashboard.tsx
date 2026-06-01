/**
 * Dashboard - Premium with animated stats, live charts, alerts, and micro-interactions
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  IndianRupee, ShoppingBag, Package, AlertTriangle,
  TrendingUp, Clock, ArrowUpRight, ArrowDownRight,
  Zap, Activity, Pill, FileSpreadsheet,
  Users, Calendar, Clipboard, Truck, Droplet, LayoutDashboard, Heart
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts';
import api from '../api/axios';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>({});
  const [inventoryStats, setInventoryStats] = useState<any>({});
  const [hospitalStats, setHospitalStats] = useState<any>({});
  const [dailySales, setDailySales] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('hub');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [billStats, invStats, daily, top, hospStats] = await Promise.all([
          api.get('/billing/invoices/dashboard_stats/'),
          api.get('/inventory/medicines/stats/'),
          api.get('/reports/daily-sales/?days=14'),
          api.get('/reports/top-products/?days=30&limit=5'),
          api.get('/hospital/dashboard-stats/'),
        ]);
        setStats(billStats.data);
        setInventoryStats(invStats.data);
        setHospitalStats(hospStats.data);
        setDailySales((daily.data.data || []).map((d: any) => ({
          date: new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
          sales: Number(d.total_sales) || 0,
          invoices: d.invoice_count || 0,
        })));
        setTopProducts(top.data.data || []);
      } catch { /* use defaults */ }
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: '#6366f1' }}
        />
      </div>
    );
  }

  const modules = [
    {
      title: 'Patient Registry',
      icon: Users,
      color: '#6366f1',
      path: '/patients',
      metrics: [
        { label: 'Active Patients', value: hospitalStats.active_patients || 0 },
        { label: 'Admissions Today', value: hospitalStats.today_admissions || 0 }
      ],
      actionLabel: 'Register Patient',
      emoji: '👥'
    },
    {
      title: 'Appointments',
      icon: Calendar,
      color: '#3b82f6',
      path: '/appointments',
      metrics: [
        { label: 'Pending', value: hospitalStats.pending_appointments || 0 }
      ],
      actionLabel: 'Book Appointment',
      emoji: '📅'
    },
    {
      title: 'Clinical EMR',
      icon: Clipboard,
      color: '#10b981',
      path: '/emr',
      metrics: [
        { label: 'Pending Rx', value: hospitalStats.pending_prescriptions || 0 }
      ],
      actionLabel: 'New Record',
      emoji: '📝'
    },
    {
      title: 'IPD Admissions',
      icon: Package,
      color: '#ec4899',
      path: '/ipd',
      metrics: [
        { label: 'Occupied Beds', value: hospitalStats.occupied_rooms || 0 },
        { label: 'Available', value: hospitalStats.available_rooms || 0 }
      ],
      actionLabel: 'Admit Patient',
      emoji: '🛏️'
    },
    {
      title: 'Surgery / OT',
      icon: Heart,
      color: '#ef4444',
      path: '/surgery',
      metrics: [
        { label: 'Upcoming', value: hospitalStats.upcoming_surgeries || 0 }
      ],
      actionLabel: 'Schedule',
      emoji: '🏥'
    },
    {
      title: 'Ambulance Unit',
      icon: Truck,
      color: '#f59e0b',
      path: '/ambulance',
      metrics: [
        { label: 'Active Dispatches', value: hospitalStats.active_dispatches || 0 }
      ],
      actionLabel: 'Dispatch',
      emoji: '🚑'
    },
    {
      title: 'Blood Bank',
      icon: Droplet,
      color: '#dc2626',
      path: '/blood-bank',
      metrics: [
        { label: 'Total Bags', value: hospitalStats.total_blood_bags || 0 }
      ],
      actionLabel: 'Check Stock',
      emoji: '🩸'
    },
    {
      title: 'Pharmacy & Billing',
      icon: Pill,
      color: '#8b5cf6',
      path: '/billing',
      metrics: [
        { label: "Today's Sales", value: `₹${(stats.today_sales || 0).toLocaleString('en-IN')}` },
        { label: 'Low Stock', value: inventoryStats.low_stock_count || 0 }
      ],
      actionLabel: 'New Invoice',
      emoji: '💊'
    }
  ];

  const statCards = [
    {
      label: "Today's Sales", value: `₹${(stats.today_sales || 0).toLocaleString('en-IN')}`,
      sub: `${stats.today_count || 0} invoices`, icon: IndianRupee,
      gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)', change: '+12%', up: true, emoji: '💰',
    },
    {
      label: 'Monthly Sales', value: `₹${(stats.month_sales || 0).toLocaleString('en-IN')}`,
      sub: `${stats.month_count || 0} invoices`, icon: TrendingUp,
      gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)', change: '+8%', up: true, emoji: '📊',
    },
    {
      label: 'Total Medicines', value: inventoryStats.total_medicines || 0,
      sub: `${inventoryStats.out_of_stock || 0} out of stock`, icon: Package,
      gradient: 'linear-gradient(135deg, #10b981, #059669)', change: '', up: false, emoji: '💊',
    },
    {
      label: 'Alerts', value: (inventoryStats.low_stock_count || 0) + (inventoryStats.expiring_count || 0),
      sub: `${inventoryStats.low_stock_count || 0} low, ${inventoryStats.expiring_count || 0} expiring`,
      icon: AlertTriangle, gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
      change: '', up: false, emoji: '⚠️',
    },
  ];

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
            <span className="text-gradient">Hospital Command Center</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Real-time overview of all hospital departments 🏥
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-secondary)', padding: '6px', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <button
            onClick={() => setActiveTab('hub')}
            style={{
              padding: '8px 16px', borderRadius: '10px', border: 'none',
              background: activeTab === 'hub' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
              color: activeTab === 'hub' ? 'white' : 'var(--text-secondary)',
              fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
              boxShadow: activeTab === 'hub' ? '0 4px 15px rgba(99, 102, 241, 0.4)' : 'none',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}
          >
            <LayoutDashboard size={16} />
            Hospital Hub
          </button>
          <button
            onClick={() => setActiveTab('financials')}
            style={{
              padding: '8px 16px', borderRadius: '10px', border: 'none',
              background: activeTab === 'financials' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
              color: activeTab === 'financials' ? 'white' : 'var(--text-secondary)',
              fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
              boxShadow: activeTab === 'financials' ? '0 4px 15px rgba(99, 102, 241, 0.4)' : 'none',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}
          >
            <IndianRupee size={16} />
            Financials & Inventory
          </button>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {activeTab === 'hub' ? (
          <motion.div
            key="hub"
            variants={container}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Global Quick Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
              {[
                { label: 'Total Doctors', value: hospitalStats.total_doctors || 0, emoji: '👨‍⚕️', color: '#3b82f6' },
                { label: 'Total Staff', value: hospitalStats.total_staff || 0, emoji: '👩‍⚕️', color: '#10b981' },
                { label: 'Available Rooms', value: hospitalStats.available_rooms || 0, emoji: '🚪', color: '#ec4899' },
                { label: 'Active Patients', value: hospitalStats.active_patients || 0, emoji: '🤕', color: '#6366f1' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  variants={item as any}
                  whileHover={{ scale: 1.05, y: -5 }}
                  style={{
                    background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)', borderLeft: `4px solid ${stat.color}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{stat.label}</p>
                    <p style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{stat.value}</p>
                  </div>
                  <span style={{ fontSize: '2rem', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))' }}>{stat.emoji}</span>
                </motion.div>
              ))}
            </div>

            {/* Module Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {modules.map((mod, i) => {
                const Icon = mod.icon;
                return (
                  <motion.div
                    key={mod.title}
                    variants={item as any}
                    whileHover={{ y: -8, boxShadow: 'var(--shadow-lg)', borderColor: mod.color }}
                    style={{
                      background: 'var(--bg-secondary)', borderRadius: '20px',
                      border: '1px solid var(--border)', overflow: 'hidden',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                      transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <div style={{ padding: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                        <div style={{
                          width: 52, height: 52, borderRadius: '14px',
                          background: `${mod.color}15`, color: mod.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: `inset 0 0 0 1px ${mod.color}30`
                        }}>
                          <Icon size={26} />
                        </div>
                        <span style={{ fontSize: '1.75rem', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))' }}>{mod.emoji}</span>
                      </div>
                      
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary)' }}>{mod.title}</h3>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--bg-tertiary)', padding: '0.75rem 1rem', borderRadius: '12px' }}>
                        {mod.metrics.map((m: any) => (
                          <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{m.label}</span>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{m.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ padding: '1.25rem', background: 'var(--bg-tertiary)', display: 'flex', gap: '0.75rem', borderTop: '1px solid var(--border)' }}>
                      <button
                        onClick={() => navigate(mod.path)}
                        style={{
                          flex: 2, padding: '10px 0', borderRadius: '10px', border: 'none',
                          background: mod.color, color: 'white', fontWeight: 700, fontSize: '0.875rem',
                          cursor: 'pointer', boxShadow: `0 6px 20px ${mod.color}40`,
                          transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                        }}
                      >
                        {mod.actionLabel}
                      </button>
                      <button
                        onClick={() => navigate(mod.path)}
                        style={{
                          flex: 1, padding: '10px 0', borderRadius: '10px', border: '1px solid var(--border)',
                          background: 'var(--bg-primary)', color: 'var(--text-primary)',
                          fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
                          transition: 'all 0.2s', hover: { background: 'var(--bg-hover)' }
                        }}
                      >
                        Open
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="financials"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Existing Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
              {statCards.map((card, idx) => {
                const Icon = card.icon;
                return (
                  <motion.div
                    key={card.label}
                    whileHover={{ scale: 1.05, y: -5 }}
                    style={{ 
                      background: card.gradient, padding: '1.25rem', borderRadius: 'var(--radius)',
                      color: 'white', position: 'relative', overflow: 'hidden',
                      boxShadow: `0 10px 20px -5px ${card.gradient.split(',')[1].trim()}60`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem', fontWeight: 600 }}>{card.label}</p>
                        <p style={{ fontSize: '2rem', fontWeight: 800 }}>{card.value}</p>
                        <p style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '0.5rem' }}>{card.sub}</p>
                      </div>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={24} />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.25rem' }}>📈 Sales Trend (14 Days)</h3>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailySales}>
                      <defs>
                        <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                      <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13 }} />
                      <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={2.5} fill="url(#salesGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.25rem' }}>🏆 Top Selling</h3>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProducts.slice(0, 5)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                      <YAxis type="category" dataKey="medicine_name" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} width={100} />
                      <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13 }} />
                      <Bar dataKey="total_quantity" fill="#6366f1" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

