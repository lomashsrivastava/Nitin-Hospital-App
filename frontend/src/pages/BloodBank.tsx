import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Droplet, Plus, Minus, Activity, Search, XCircle } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function BloodBank() {
  const [stocks, setStocks] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGroup, setNewGroup] = useState('');

  useEffect(() => {
    fetchStocks();
  }, []);

  const fetchStocks = async () => {
    try {
      const res = await api.get('/hospital/blood-stock/');
      const data = res.data?.results || res.data || [];
      if (data.length === 0) {
        await seedDB();
      } else {
        setStocks(data);
      }
    } catch (e) {
      toast.error('Failed to load blood bank data');
    }
  };

  const seedDB = async () => {
    const groups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
    for (let g of groups) {
      try {
        await api.post('/hospital/blood-stock/', { blood_group: g, bags_available: 0 });
      } catch (e) {}
    }
    const res = await api.get('/hospital/blood-stock/');
    setStocks(res.data?.results || res.data || []);
  };

  const updateStock = async (id: number, currentBags: number, change: number) => {
    if (currentBags + change < 0) return;
    try {
      await api.patch(`/hospital/blood-stock/${id}/`, { bags_available: currentBags + change });
      toast.success(change > 0 ? '+1 Bag Added' : '-1 Bag Removed');
      fetchStocks();
    } catch (e) {
      toast.error('Failed to update stock');
    }
  };

  const addCustomGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroup.trim()) return;
    try {
      await api.post('/hospital/blood-stock/', { blood_group: newGroup.toUpperCase(), bags_available: 0 });
      toast.success(`Registered new group: ${newGroup.toUpperCase()}`);
      setIsModalOpen(false);
      setNewGroup('');
      fetchStocks();
    } catch (e) {
      toast.error('Failed to register (May already exist)');
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Droplet color="#ef4444" /> Blood Bank
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={16}/> Live Emergency Supply Tracking</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsModalOpen(true)}
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '0.75rem 1.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={20} /> Register New Blood Group
        </motion.button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '2rem' }}>
        <AnimatePresence>
          {stocks.map((stock) => (
            <motion.div key={stock.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '24px', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflow: 'hidden', boxShadow: stock.bags_available < 5 ? '0 0 20px rgba(239,68,68,0.1)' : 'none' }}>
              
              {/* Critical Alert background glow */}
              {stock.bags_available < 5 && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#ef4444', animation: 'pulse 2s infinite' }} />}

              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1rem' }}>
                <Droplet size={40} color="#ef4444" fill={stock.bags_available > 0 ? '#ef4444' : 'transparent'} />
              </div>
              
              <h2 style={{ fontSize: '2.5rem', fontWeight: 900, margin: 0, color: 'var(--text-primary)', textAlign: 'center' }}>{stock.blood_group}</h2>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Blood Group</div>

              <div style={{ fontSize: '3rem', fontWeight: 900, color: stock.bags_available < 5 ? '#ef4444' : '#10b981', lineHeight: 1 }}>{stock.bags_available}</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>Bags Available</div>

              <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                <button onClick={() => updateStock(stock.id, stock.bags_available, -1)} disabled={stock.bags_available === 0} style={{ flex: 1, padding: '1rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '12px', cursor: stock.bags_available === 0 ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: stock.bags_available === 0 ? 0.5 : 1 }}>
                  <Minus size={20} />
                </button>
                <button onClick={() => updateStock(stock.id, stock.bags_available, 1)} style={{ flex: 1, padding: '1rem', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 12px rgba(239,68,68,0.3)' }}>
                  <Plus size={20} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} style={{ position: 'relative', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
              <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><XCircle size={24} /></button>
              <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Droplet color="#ef4444"/> Add Rare Blood Group</h2>
              
              <form onSubmit={addCustomGroup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Blood Group Identifier</label>
                  <input required type="text" placeholder="e.g. Bombay (hh)" value={newGroup} onChange={e => setNewGroup(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px' }} />
                </div>
                <button type="submit" style={{ marginTop: '1rem', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: 'white', border: 'none', padding: '1rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Initialize Tracked Group</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
