import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Calendar from './components/Calendar';
import DailyLogs from './components/DailyLogs';
import Config from './components/Config';
import {
  getShifts,
  updateShift,
  getDailyLogs,
  saveDailyLog,
  getCaregivers,
  subscribeToRealtimeChanges
} from './utils/db';
import { CalendarDays, FileText, Settings as SettingsIcon } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('calendar'); // calendar, logs, config
  const [activeMember, setActiveMember] = useState(() => {
    return localStorage.getItem('escala_active_member') || 'David';
  });
  
  const [shifts, setShifts] = useState({});
  const [logs, setLogs] = useState({});
  const [caregivers, setCaregivers] = useState([]);
  const [dbTrigger, setDbTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadWarning, setLoadWarning] = useState('');
  const [liveNotice, setLiveNotice] = useState('');

  // Carrega as escalas, logs e cuidadoras do banco (ou localstorage)
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setLoadError('');
      setLoadWarning('');

      try {
        const fetchedShifts = await getShifts();
        setShifts(fetchedShifts);
      } catch (e) {
        console.error('Erro ao carregar escalas:', e);
        setLoadError(`Não foi possível carregar a escala do Supabase. ${e?.message || 'Confira a configuração do banco.'}`);
        setIsLoading(false);
        return;
      }

      const warnings = [];

      try {
        const fetchedLogs = await getDailyLogs();
        setLogs(fetchedLogs);
      } catch (e) {
        console.error('Erro ao carregar diário:', e);
        setLogs({});
        warnings.push('Diário indisponível');
      }

      try {
        const fetchedCaregivers = await getCaregivers();
        setCaregivers(fetchedCaregivers);
      } catch (e) {
        console.error('Erro ao carregar cuidadoras:', e);
        setCaregivers([]);
        warnings.push('Cuidadoras indisponíveis');
      }

      if (warnings.length > 0) {
        setLoadWarning(warnings.join(' · '));
      }

      setIsLoading(false);
    }

    loadData();
  }, [dbTrigger]);

  useEffect(() => {
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
      onCaregiverChange: (payload) => {
        setCaregivers(prev => {
          if (payload.eventType === 'DELETE') {
            return prev.filter(item => item.id !== payload.old?.id);
          }

          if (!payload.new?.id) return prev;

          const withoutCurrent = prev.filter(item => item.id !== payload.new.id);
          return [...withoutCurrent, payload.new].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        });
        showLiveNotice('Lista de cuidadoras atualizada.');
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
  }, [dbTrigger]);

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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        activeMember={activeMember}
        setActiveMember={setActiveMember}
      />

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
                logs={logs} 
                onSaveLog={handleSaveLog} 
                activeMember={activeMember} 
                caregivers={caregivers}
              />
            )}
            
            {activeTab === 'config' && (
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
        
        <button 
          className={`nav-item ${activeTab === 'config' ? 'nav-item-active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          <SettingsIcon />
          <span>Configurar</span>
        </button>
      </nav>
    </div>
  );
}
