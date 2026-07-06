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
  getDailyLogReceipts,
  markDailyLogSeen,
  saveDailyLog,
  setDailyLogReaction,
  getCaregivers,
  getMedications,
  subscribeToRealtimeChanges,
  getSession,
  onAuthStateChange,
  signOut,
  USER_MAPPING,
  buildCaregiverProfile
} from './utils/db';
import { CalendarDays, FileText, Settings } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('calendar');

  const [shifts, setShifts] = useState({});
  const [logs, setLogs] = useState({});
  const [logReceipts, setLogReceipts] = useState({});
  const [caregivers, setCaregivers] = useState([]);

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

  const [session, setSession] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    let authListener = null;

    const checkSession = async () => {
      try {
        const { data } = await getSession();
        setSession(data.session);
      } catch (e) {
        console.error('Erro ao verificar sessão:', e);
      } finally {
        setIsAuthLoading(false);
      }
    };

    checkSession();

    try {
      const { data } = onAuthStateChange((_event, nextSession) => {
        setSession(nextSession);
        setIsAuthLoading(false);
      });
      authListener = data.subscription;
    } catch (e) {
      console.warn('Não foi possível registrar o listener de autenticação.', e);
    }

    return () => {
      if (authListener) authListener.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;

    async function loadData() {
      setIsLoading(true);
      setLoadError('');
      setLoadWarning('');

      try {
        const [fetchedShifts, fetchedLogs, fetchedLogReceipts, fetchedCaregivers, fetchedMedications] = await Promise.all([
          getShifts(),
          getDailyLogs(),
          getDailyLogReceipts(),
          getCaregivers(),
          getMedications()
        ]);

        setShifts(fetchedShifts);
        setLogs(fetchedLogs);
        setLogReceipts(fetchedLogReceipts);
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
    if (!session || isLoading || loadError) return;

    const currentEmail = session.user?.email?.toLowerCase();
    if (!currentEmail || USER_MAPPING[currentEmail]) return;

    const exists = caregivers.some((caregiver) => caregiver.email && caregiver.email.toLowerCase() === currentEmail);
    if (!exists) {
      signOut().then(() => {
        window.location.reload();
      });
    }
  }, [caregivers, session, isLoading, loadError]);

  useEffect(() => {
    if (!session) return;

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
        setShifts((prev) => {
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
        setLogs((prev) => {
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
      onLogReceiptChange: (payload) => {
        setLogReceipts((prev) => {
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
      },
      onCaregiverChange: () => {
        getCaregivers().then(setCaregivers);
        showLiveNotice('Lista de cuidadoras atualizada.');
      },
      onMedicationChange: (payload) => {
        setMedications((prev) => {
          if (payload.eventType === 'DELETE') {
            return prev.filter((item) => item.id !== payload.old?.id);
          }

          if (!payload.new?.id) return prev;

          const withoutCurrent = prev.filter((item) => item.id !== payload.new.id);
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
      localStorage.removeItem('escala_local_logs_v3');
      localStorage.removeItem('escala_local_log_receipts_v1');
      localStorage.removeItem('escala_local_caregivers_v2');
      localStorage.setItem('escala_local_mode_active', 'false');
    } catch (e) {
      console.error('Erro ao limpar configuração local:', e);
    } finally {
      window.location.reload();
    }
  };

  const handleUpdateShift = async (date, period, assignedTo, caregiverAssigned, status) => {
    const id = `${date}_${period}`;

    setShifts((prev) => ({
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
      setDbTrigger((prev) => prev + 1);
    }
  };

  const handleSaveLog = async (date, period, author, caregiver, medsGiven, mealsOk, notes) => {
    try {
      await saveDailyLog(date, period, author, caregiver, medsGiven, mealsOk, notes);
      setDbTrigger((prev) => prev + 1);
      return true;
    } catch (e) {
      console.error('Falha ao salvar diário de bordo:', e);
      return false;
    }
  };

  const handleMarkLogSeen = async (logId, viewerName) => {
    const receipt = await markDailyLogSeen(logId, viewerName);
    if (receipt?.id) {
      setLogReceipts((prev) => ({
        ...prev,
        [receipt.id]: receipt
      }));
    }
    return receipt;
  };

  const handleSetLogReaction = async (logId, viewerName, reaction) => {
    const receipt = await setDailyLogReaction(logId, viewerName, reaction);
    if (receipt?.id) {
      setLogReceipts((prev) => ({
        ...prev,
        [receipt.id]: receipt
      }));
    }
    return receipt;
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
  const caregiverRecord = caregivers.find((caregiver) => caregiver.email && caregiver.email.toLowerCase() === userEmail);
  const userProfile = USER_MAPPING[userEmail] || buildCaregiverProfile(caregiverRecord);

  const isSuperAdmin = userProfile?.role === 'SUPERADMIN';
  const isAdmin = isSuperAdmin || userProfile?.role === 'ADMIN';

  if (!isLoading && !userProfile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="card" style={{ maxWidth: '420px', width: '100%' }}>
          <h3 className="card-title" style={{ color: 'var(--color-danger)' }}>Acesso não liberado</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Este usuário autenticado ainda não está vinculado a nenhum irmão administrador nem a uma cuidadora ativa.
          </p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => signOut()}>
              Sair
            </button>
          </div>
        </div>
      </div>
    );
  }

  const effectiveActiveMember = isSuperAdmin ? activeMember : (userProfile?.name || 'Cuidadora');

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
              <button className="btn btn-primary" onClick={() => setDbTrigger((prev) => prev + 1)}>
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
                activeMember={effectiveActiveMember}
                caregivers={caregivers}
              />
            )}

            {activeTab === 'logs' && (
              <DailyLogs
                shifts={shifts}
                logs={logs}
                receipts={logReceipts}
                onSaveLog={handleSaveLog}
                onMarkLogSeen={handleMarkLogSeen}
                onSetLogReaction={handleSetLogReaction}
                medications={medications}
                currentUserName={userProfile?.name || ''}
              />
            )}

            {isAdmin && activeTab === 'config' && (
              <Config
                onConfigChanged={() => setDbTrigger((prev) => prev + 1)}
              />
            )}
          </>
        )}
      </main>

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
