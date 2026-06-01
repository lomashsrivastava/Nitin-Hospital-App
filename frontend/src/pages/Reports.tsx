/**
 * Reports Page - Premium Analytics & Reporting with animations
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart as BarChartIcon, TrendingUp, DollarSign, 
  PieChart as PieChartIcon, Package, Download, AlertCircle, FileSpreadsheet
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import api from '../api/axios';

const TABS = [
  { id: 'sales', label: 'Sales Insights', icon: TrendingUp },
  { id: 'profit', label: 'Profit Analysis', icon: DollarSign },
  { id: 'tax', label: 'Tax Reports', icon: BarChartIcon },
  { id: 'products', label: 'Top Products', icon: PieChartIcon },
];

export default function Reports() {
  const [activeTab, setActiveTab] = useState('sales');
  const [data, setData] = useState<any>({});
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [daily, profit, tax, top, expiry] = await Promise.all([
          api.get('/reports/daily-sales/?days=30'),
          api.get('/reports/profit-loss/?days=30'),
          api.get('/reports/gst-report/?days=30'),
          api.get('/reports/top-products/?days=30&limit=10'),
          api.get('/reports/expiry-report/?days=90')
        ]);
        setData({
          sales: daily.data.data || [],
          profit: profit.data.data || [],
          tax: tax.data.data || [],
          products: top.data.data || [],
          expiry: expiry.data.data || []
        });
      } catch { /* Error handle */ }
    };
    fetchData();
  }, []);

  const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#f97316'];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BarChartIcon size={28} className="text-gradient" style={{ color: 'var(--primary)' }} />
          <span className="text-gradient">Analytics & Reports</span>
        </h1>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-secondary">
          <Download size={16} /> Export All
        </motion.button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <motion.button key={tab.id} onClick={() => setActiveTab(tab.id)} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem',
                borderRadius: 'var(--radius-lg)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
                background: isActive ? 'linear-gradient(135deg, var(--primary), var(--primary-dark))' : 'var(--bg-secondary)',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                boxShadow: isActive ? '0 4px 15px rgba(99,102,241,0.3)' : 'var(--shadow)',
                transition: 'all 0.2s'
              }}>
              <Icon size={16} /> {tab.label}
            </motion.button>
          );
        })}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}>
          {activeTab === 'sales' && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Last 30 Days Sales Trend</h3>
              <div style={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.sales}>
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{fontSize:12, fill:'var(--text-muted)'}} />
                    <YAxis tick={{fontSize:12, fill:'var(--text-muted)'}} />
                    <Tooltip contentStyle={{background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:8}} />
                    <Area type="monotone" dataKey="total_sales" stroke="#6366f1" strokeWidth={3} fill="url(#salesGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'profit' && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Profit & Loss (Last 30 Days)</h3>
              <div style={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.profit}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{fontSize:12, fill:'var(--text-muted)'}} />
                    <YAxis tick={{fontSize:12, fill:'var(--text-muted)'}} />
                    <Tooltip contentStyle={{background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:8}} />
                    <Bar dataKey="revenue" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Revenue" />
                    <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} name="Profit" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'tax' && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>GST Tax Collection</h3>
              <div style={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.tax}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{fontSize:12, fill:'var(--text-muted)'}} />
                    <YAxis tick={{fontSize:12, fill:'var(--text-muted)'}} />
                    <Tooltip contentStyle={{background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:8}} />
                    <Bar dataKey="total_cgst" stackId="a" fill="#f59e0b" name="CGST" />
                    <Bar dataKey="total_sgst" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} name="SGST" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Top Selling Breakdown</h3>
                <div style={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.products} dataKey="total_quantity" nameKey="medicine_name" cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5}>
                        {data.products.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:8}} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="card table-container">
                 <table className="table">
                    <thead><tr><th>Product Name</th><th>Units Sold</th><th>Revenue Generation</th></tr></thead>
                    <tbody>
                      {data.products.map((p: any, i: number) => (
                        <tr key={i}>
                          <td style={{fontWeight:600}}><div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}><div style={{width:12,height:12,borderRadius:'50%',background:COLORS[i%COLORS.length]}}></div>{p.medicine_name}</div></td>
                          <td><span className="badge badge-primary">{p.total_quantity} units</span></td>
                          <td style={{fontWeight:700, color:'var(--success)'}}>₹{p.total_revenue}</td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
