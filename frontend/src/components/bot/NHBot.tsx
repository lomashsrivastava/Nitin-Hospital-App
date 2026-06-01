import { useState, useEffect, useRef, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Sparkles, Send, ChevronRight, UserPlus, FileText, Bed, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

interface Message {
  id: number;
  sender: 'bot' | 'user';
  text: string;
  options?: ActionOption[];
  component?: ReactNode;
}

interface ActionOption {
  label: string;
  action: string;
  icon?: JSX.Element;
}

export default function NHBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial Boot
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setTimeout(() => {
        setMessages([
          {
            id: Date.now(),
            sender: 'bot',
            text: 'Hello Admin! I am NH, your advanced hospital automation bot. I can fetch complex datasets and calculate metrics instantly. What would you like to execute?',
            options: [
              { label: 'Register Patient', action: 'GOTO_PATIENTS', icon: <UserPlus size={14}/> },
              { label: 'Calculate Revenue', action: 'ACTION_REVENUE', icon: <FileText size={14}/> },
              { label: 'Find Empty Beds', action: 'ACTION_EMPTY_ROOMS', icon: <Bed size={14}/> },
              { label: 'Doctor Availability', action: 'ACTION_DOCTORS', icon: <Sparkles size={14}/> }
            ]
          }
        ]);
      }, 300);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleOptionClick = async (opt: ActionOption) => {
    // 1. Add user's choice as a chat message
    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: opt.label }]);

    const tempId = Date.now() + 1;
    // 2. Add loading state
    setMessages(prev => [...prev, { id: tempId, sender: 'bot', text: 'Executing query securely...' }]);

    let responseText = '';
    let nextOptions: ActionOption[] = [];
    let customComponent: ReactNode = undefined;

    try {
      if (opt.action === 'GOTO_PATIENTS') {
        responseText = 'Taking you to the Patient Registry now!';
        navigate('/patients');
        nextOptions = [{ label: 'Back to Menu', action: 'MAIN_MENU', icon: <Bot size={14}/> }];
      } 
      else if (opt.action === 'ACTION_REVENUE') {
        const res = await api.get('/billing/invoices/');
        const invoices = res.data?.results || res.data || [];
        const totalRev = invoices.reduce((sum: number, inv: any) => sum + Number(inv.total), 0);
        
        responseText = 'Query successful. Here is the massive sum of all generated invoices across the entire hospital system:';
        customComponent = (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', padding: '1rem', borderRadius: '12px', marginTop: '0.5rem', boxShadow: '0 4px 15px rgba(16,185,129,0.2)' }}>
            <div style={{ fontSize: '0.75rem', color: '#10b981', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Total Revenue Validated</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'white', letterSpacing: '1px' }}>₹{totalRev.toLocaleString('en-IN')}</div>
          </motion.div>
        );
        nextOptions = [{ label: 'Back to Menu', action: 'MAIN_MENU', icon: <Bot size={14}/> }];
      }
      else if (opt.action === 'ACTION_EMPTY_ROOMS') {
        const res = await api.get('/hospital/rooms/?unoccupied=true');
        const emptyRooms = res.data?.results || res.data || [];
        
        responseText = `Scan complete. I found ${emptyRooms.length} available beds instantly!`;
        customComponent = (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
            {emptyRooms.slice(0, 4).map((r: any) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(59, 130, 246, 0.15)', padding: '0.5rem 1rem', borderRadius: '8px', borderLeft: '3px solid #3b82f6', fontSize: '0.85rem' }}>
                <strong style={{ color: 'white' }}>Room {r.room_number}</strong>
                <span style={{ color: '#93c5fd' }}>{r.room_type} (Floor {r.floor})</span>
              </div>
            ))}
            {emptyRooms.length > 4 && <div style={{ fontSize: '0.75rem', color: 'gray', textAlign: 'center', marginTop: '0.25rem' }}>+ {emptyRooms.length - 4} more rooms...</div>}
          </motion.div>
        );
        nextOptions = [{ label: 'Back to Menu', action: 'MAIN_MENU', icon: <Bot size={14}/> }];
      }
      else if (opt.action === 'ACTION_DOCTORS') {
        const res = await api.get('/hospital/doctors/');
        const docs = res.data?.results || res.data || [];
        
        responseText = 'Current Active Doctor Roster Extracted:';
        customComponent = (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
            {docs.slice(0, 4).map((d: any) => (
              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ color: 'white', fontWeight: 600 }}>Dr. {d.name}</span>
                <span style={{ color: '#10b981', fontWeight: 700 }}>₹{d.consultation_fee}</span>
              </div>
            ))}
             {docs.length > 4 && <div style={{ fontSize: '0.75rem', color: 'gray', textAlign: 'center', marginTop: '0.25rem' }}>+ {docs.length - 4} more doctors...</div>}
          </motion.div>
        );
        nextOptions = [{ label: 'Back to Menu', action: 'MAIN_MENU', icon: <Bot size={14}/> }];
      }
      else {
        responseText = 'How else can I assist you?';
        nextOptions = [
          { label: 'Register Patient', action: 'GOTO_PATIENTS', icon: <UserPlus size={14}/> },
          { label: 'Calculate Revenue', action: 'ACTION_REVENUE', icon: <FileText size={14}/> },
          { label: 'Find Empty Beds', action: 'ACTION_EMPTY_ROOMS', icon: <Bed size={14}/> },
          { label: 'Doctor Availability', action: 'ACTION_DOCTORS', icon: <Sparkles size={14}/> }
        ];
      }
    } catch (e) {
      responseText = 'ERROR 500: My sensors encountered a glitch fetching data from the database.';
      nextOptions = [{ label: 'Main Menu', action: 'MAIN_MENU', icon: <Bot size={14}/> }];
    }

    setMessages(prev => prev.map(m => m.id === tempId ? { ...m, text: responseText, options: nextOptions, component: customComponent } : m));
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #0ea5e9, #3b82f6)',
          border: 'none',
          boxShadow: '0 10px 25px rgba(14, 165, 233, 0.5)',
          color: 'white',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'pointer',
          zIndex: 9999
        }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={28} />
            </motion.div>
          ) : (
            <motion.div key="bot" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} style={{ position: 'relative' }}>
              <span style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'monospace' }}>NH</span>
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} 
                transition={{ repeat: Infinity, duration: 2 }}
                style={{ position: 'absolute', top: -4, right: -10, width: 10, height: 10, borderRadius: '50%', background: '#fbbf24' }} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              position: 'fixed',
              bottom: '6rem',
              right: '2rem',
              width: '380px',
              height: '550px',
              maxWidth: 'calc(100vw - 3rem)',
              maxHeight: 'calc(100vh - 8rem)',
              background: 'rgba(17, 24, 39, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 9998,
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'linear-gradient(to right, rgba(14,165,233,0.1), transparent)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #0ea5e9, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <Sparkles size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'white' }}>NH Autobot v2.0</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#10b981' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} /> Secure Data Link Active
                </div>
              </div>
            </div>

            {/* Chat History */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {messages.map((msg, idx) => (
                <motion.div 
                  key={msg.id} 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}
                >
                  <div style={{ 
                    maxWidth: '85%', 
                    padding: '0.8rem 1rem', 
                    borderRadius: '16px', 
                    borderBottomLeftRadius: msg.sender === 'bot' ? '4px' : '16px',
                    borderBottomRightRadius: msg.sender === 'user' ? '4px' : '16px',
                    background: msg.sender === 'user' ? 'linear-gradient(135deg, #0ea5e9, #3b82f6)' : 'rgba(255,255,255,0.05)',
                    color: msg.sender === 'user' ? 'white' : 'var(--text-primary)',
                    boxShadow: msg.sender === 'user' ? '0 4px 12px rgba(14,165,233,0.3)' : 'none',
                    fontSize: '0.9rem',
                    lineHeight: '1.4'
                  }}>
                    {msg.text}
                  </div>

                  {/* Render Custom React Widgets inside Chat */}
                  {msg.component && (
                    <div style={{ width: '85%', alignSelf: msg.sender === 'bot' ? 'flex-start' : 'flex-end' }}>
                      {msg.component}
                    </div>
                  )}

                  {/* Options List */}
                  {msg.options && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem', width: '100%' }}>
                      {msg.options.map((opt, i) => (
                        <motion.button
                          key={i}
                          whileHover={{ scale: 1.02, x: 5 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleOptionClick(opt)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            padding: '0.75rem 1rem',
                            borderRadius: '12px',
                            background: 'rgba(14,165,233,0.1)',
                            border: '1px solid rgba(14,165,233,0.2)',
                            color: '#e0f2fe',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textAlign: 'left',
                            boxShadow: 'inset 0 0 10px rgba(14,165,233,0.0)'
                          }}
                        >
                          {opt.icon}
                          <span style={{ flex: 1 }}>{opt.label}</span>
                          <ChevronRight size={14} style={{ opacity: 0.5 }} />
                        </motion.button>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '24px', padding: '0.5rem 1rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', flex: 1 }}>Select an option above to trigger Automation...</span>
                <Send size={16} color="var(--text-muted)" style={{ opacity: 0.5 }}/>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
