import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Calendar from './components/Calendar';
import DailyLogs from './components/DailyLogs';
import Config from './components/Config';
import { getShifts, updateShift, getDailyLogs, saveDailyLog, getCaregivers } from './utils/db';
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

  // Carrega as escalas, logs e cuidadoras do banco (ou localstorage)
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const fetchedShifts = await getShifts();
        const fetchedLogs = await getDailyLogs();
        const fetchedCaregivers = await getCaregivers();
        
        setShifts(fetchedShifts);
        setLogs(fetchedLogs);
        setCaregivers(fetchedCaregivers);
      } catch (e) {
        console.error('Erro ao carregar dados:', e);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, [dbTrigger]);

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
