import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Calendar from './components/Calendar';
import DailyLogs from './components/DailyLogs';
import Config from './components/Config';
import { getShifts, updateShift, getDailyLogs, saveDailyLog } from './utils/db';
import { CalendarDays, FileText, Settings as SettingsIcon } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('calendar'); // calendar, logs, config
  const [activeMember, setActiveMember] = useState(() => {
    return localStorage.getItem('escala_active_member') || 'David';
  });
  
  const [shifts, setShifts] = useState({});
  const [logs, setLogs] = useState({});
  const [dbTrigger, setDbTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Carrega as escalas e logs na inicialização ou quando mudar o banco
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const fetchedShifts = await getShifts();
        const fetchedLogs = await getDailyLogs();
        setShifts(fetchedShifts);
        setLogs(fetchedLogs);
      } catch (e) {
        console.error('Erro ao carregar dados:', e);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, [dbTrigger]);

  // Atualizar escala
  const handleUpdateShift = async (date, period, assignedTo, status) => {
    // Atualização otimista na tela (UI rápida)
    const id = `${date}_${period}`;
    setShifts(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        id,
        date,
        period,
        assigned_to: assignedTo,
        status,
        updated_at: new Date().toISOString()
      }
    }));

    try {
      await updateShift(date, period, assignedTo, status);
    } catch (e) {
      console.error('Falha ao gravar alteração na escala:', e);
      // Força recarga para reverter
      setDbTrigger(prev => prev + 1);
    }
  };

  // Salvar diário de bordo
  const handleSaveLog = async (date, period, author, medsGiven, mealsOk, notes) => {
    try {
      await saveDailyLog(date, period, author, medsGiven, mealsOk, notes);
      // Força a recarga dos logs para refletir a alteração
      setDbTrigger(prev => prev + 1);
    } catch (e) {
      console.error('Falha ao salvar diário de bordo:', e);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar activeMember={activeMember} setActiveMember={setActiveMember} />

      <main className="container" style={{ flex: 1 }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Carregando informações...
          </div>
        ) : (
          <>
            {activeTab === 'calendar' && (
              <Calendar 
                shifts={shifts} 
                onUpdateShift={handleUpdateShift} 
                activeMember={activeMember} 
              />
            )}
            
            {activeTab === 'logs' && (
              <DailyLogs 
                logs={logs} 
                onSaveLog={handleSaveLog} 
                activeMember={activeMember} 
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
