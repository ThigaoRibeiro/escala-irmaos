import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Calendar from './components/Calendar';
import DailyLogs from './components/DailyLogs';
import Config from './components/Config';
import Login from './components/Login';
import {
  getShifts,
  updateShift,
  getDailyLogs,
  saveDailyLog,
  getCaregivers,
  getMedications,
  subscribeToRealtimeChanges,
  getSession,
  onAuthStateChange,
  USER_MAPPING
} from './utils/db';
import { CalendarDays, FileText, Settings } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('calendar'); // calendar, logs, config

  
  const [shifts, setShifts] = useState({});
  const [logs, setLogs] = useState({});
  const [caregivers, setCaregivers] = useState([]);
  
  // Active member for admins to impersonate
  const [activeMember, setActiveMember] = useState(() => {
    return localStorage.getItem('escala_active_member') || 'David';
  });

  useEffect(() => {
    const handleMemberChange = (e) => {
      setActiveMember(e.detail);
    };
    window.addEventListener('activeMemberChanged', handleMemberChange);
    return () => window.removeEventListener('activeMemberChanged', handleMemberChange);
  }, []);

  const [medications, setMedications] = useState([]);
  const [dbTrigger, setDbTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadWarning, setLoadWarning] = useState('');
  const [liveNotice, setLiveNotice] = useState('');

  // Authentication states
  const [session, setSession] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Monitor auth state
  useEffect(() => {
    let authListener = null;

    const checkSession = async () => {
      try {
        const { data } = await getSession();
        setSession(data.session);
      } catch (e) {
        console.error('Error checking session:', e);
      } finally {
        setIsAuthLoading(false);
      }
    };

    checkSession();

    try {
      const { data } = onAuthStateChange((_event, session) => {
        setSession(session);
        setIsAuthLoading(false);
      });
      authListener = data.subscription;
    } catch (e) {
      console.warn('Cannot attach auth listener. Maybe local mode or config is missing.', e);
    }

    return () => {
      if (authListener) authListener.unsubscribe();
    };
  }, []);

  // Carrega as escalas, logs e cuidadoras do banco (ou localstorage)
  useEffect(() => {
    if (!session) return; // Only load data if authenticated

    async function loadData() {
      setIsLoading(true);
      setLoadError('');
      setLoadWarning('');

      try {
        const [fetchedShifts, fetchedLogs, fetchedCaregivers, fetchedMedications] = await Promise.all([
          getShifts(),
          getDailyLogs(),
          getCaregivers(),
          getMedications()
        ]);
        
        setShifts(fetchedShifts);
        setLogs(fetchedLogs);
        setCaregivers(fetchedCaregivers);
        setMedications(fetchedMedications);
      } catch (e) {
        console.error('Erro ao carregar dados:', e);
        setLoadError(`Não foi possível carregar os dados do Supabase. ${e?.message || 'Confira a configuração do banco.'}`);
      }

      setIsLoading(false);
    }

    loadData();
  }, [dbTrigger, session]);

  useEffect(() => {
    if (!session) return; // Only subscribe if authenticated

    const getPayloadId = (row) => {
      if (!row) return null;
      return row.id || (row.date && row.period ? `${row.date}_${row.period}` : null);
    };

    let noticeTimer = null;
    const showLiveNotice = (message) => {
      setLiveNotice(message);
      if (noticeTimer) clearTimeout(noticeTimer);
      noticeTimer = setTimeout(() => setLiveNotice(''), 3500);
    };

    const unsubscribe = subscribeToRealtimeChanges({
      onShiftChange: (payload) => {
        setShifts(prev => {
          const id = getPayloadId(payload.new) || getPayloadId(payload.old);
          if (!id) return prev;

          if (payload.eventType === 'DELETE') {
            const next = { ...prev };
            delete next[id];
            return next;
          }

          return {
            ...prev,
            [id]: payload.new
          };
        });
        showLiveNotice('Escala atualizada por outra pessoa.');
      },
      onLogChange: (payload) => {
        setLogs(prev => {
          const id = getPayloadId(payload.new) || getPayloadId(payload.old);
          if (!id) return prev;

          if (payload.eventType === 'DELETE') {
            const next = { ...prev };
            delete next[id];
            return next;
          }

          return {
            ...prev,
            [id]: payload.new
          };
        });
        showLiveNotice('Diário atualizado por outra pessoa.');
      },
      onCaregiverChange: () => {
        getCaregivers().then(setCaregivers);
        showLiveNotice('Lista de cuidadoras atualizada.');
      },
      onMedicationChange: (payload) => {
        setMedications(prev => {
          if (payload.eventType === 'DELETE') {
            return prev.filter(item => item.id !== payload.old?.id);
          }

          if (!payload.new?.id) return prev;

          const withoutCurrent = prev.filter(item => item.id !== payload.new.id);
          return [...withoutCurrent, payload.new].sort((a, b) => a.time.localeCompare(b.time));
        });
        showLiveNotice('Lista de medicamentos atualizada.');
      },
      onStatusChange: (status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Realtime indisponível:', status);
        }
      }
    });

    return () => {
      if (noticeTimer) clearTimeout(noticeTimer);
      unsubscribe();
    };
  }, [dbTrigger, session]);

  const handleResetConnection = () => {
    try {
      localStorage.removeItem('escala_supabase_config');
      localStorage.removeItem('escala_local_shifts_v2');
      localStorage.removeItem('escala_local_logs_v2');
      localStorage.removeItem('escala_local_caregivers_v2');
      localStorage.setItem('escala_local_mode_active', 'false');
    } catch (e) {
      console.error('Erro ao limpar configuração local:', e);
    } finally {
      window.location.reload();
    }
  };

  // Atualizar escala
  const handleUpdateShift = async (date, period, assignedTo, caregiverAssigned, status) => {
    const id = `${date}_${period}`;
    
    // Atualização otimista na tela (UI rápida)
    setShifts(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        id,
        date,
        period,
        assigned_to: assignedTo,
        caregiver_assigned: caregiverAssigned,
        status,
        updated_at: new Date().toISOString()
      }
    }));

    try {
      await updateShift(date, period, assignedTo, caregiverAssigned, status);
    } catch (e) {
      console.error('Falha ao gravar alteração na escala:', e);
      // Força recarga para reverter
      setDbTrigger(prev => prev + 1);
    }
  };

  // Salvar diário de bordo
  const handleSaveLog = async (date, period, author, caregiver, medsGiven, mealsOk, notes) => {
    try {
      await saveDailyLog(date, period, author, caregiver, medsGiven, mealsOk, notes);
      setDbTrigger(prev => prev + 1);
    } catch (e) {
      console.error('Falha ao salvar diário de bordo:', e);
    }
  };

  if (isAuthLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Verificando sessão...
      </div>
    );
  }

  if (!session) {
    return <Login onLoginSuccess={() => {}} />;
  }

  const userEmail = session?.user?.email?.toLowerCase() || '';
  let userProfile = USER_MAPPING[userEmail] || null;
  const isAdmin = userProfile?.role === 'SUPERADMIN' || userProfile?.role === 'ADMIN';

  if (!userProfile) {
    // Look up in caregivers table by email
    const matchedCaregiver = caregivers.find(c => c.email && c.email.toLowerCase() === userEmail);
    if (matchedCaregiver) {
      userProfile = {
        name: matchedCaregiver.name,
        role: 'CAREGIVER'
      };
    }
  }

  const effectiveActiveMember = isAdmin ? activeMember : (userProfile?.name || 'Cuidadora');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar userProfile={userProfile} />

      <main className="container" style={{ flex: 1 }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Carregando informações...
          </div>
        ) : loadError ? (
          <div className="card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
            <h3 className="card-title" style={{ color: 'var(--color-danger)' }}>Banco indisponível</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{loadError}</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => setDbTrigger(prev => prev + 1)}>
                Tentar novamente
              </button>
              <button className="btn btn-secondary" onClick={handleResetConnection}>
                Limpar conexão deste navegador
              </button>
            </div>
          </div>
        ) : (
          <>
            {loadWarning && (
              <div className="info-banner" style={{ borderColor: 'var(--color-warning)', color: 'var(--color-warning)', backgroundColor: 'var(--color-warning-light)' }}>
                {loadWarning}
              </div>
            )}

            {liveNotice && (
              <div className="info-banner" style={{ borderColor: 'var(--color-success)', color: 'var(--color-success)', backgroundColor: 'var(--color-success-light)' }}>
                {liveNotice}
              </div>
            )}

            {activeTab === 'calendar' && (
              <Calendar 
                shifts={shifts} 
                onUpdateShift={handleUpdateShift} 
                activeMember={activeMember} 
                caregivers={caregivers}
              />
            )}
            
            {activeTab === 'logs' && (
              <DailyLogs
                shifts={shifts}
                logs={logs}
                onSaveLog={handleSaveLog}
                medications={medications}
              />
            )}
            
            {isAdmin && activeTab === 'config' && (
              <Config
                onConfigChanged={() => setDbTrigger(prev => prev + 1)}
              />
            )}
          </>
        )}
      </main>

      {/* Menu Inferior (Navigation Bar) */}
      <nav className="bottom-nav">
        <button 
          className={`nav-item ${activeTab === 'calendar' ? 'nav-item-active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          <CalendarDays />
          <span>Escalas</span>
        </button>
        
        <button 
          className={`nav-item ${activeTab === 'logs' ? 'nav-item-active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <FileText />
          <span>Diário</span>
        </button>
        
        {isAdmin && (
          <button 
            className={`nav-item ${activeTab === 'config' ? 'nav-item-active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            <Settings />
            <span>Configurações</span>
          </button>
        )}
      </nav>
    </div>
  );
}
