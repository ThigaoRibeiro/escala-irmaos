import React, { useState } from 'react';
import { MEMBERS } from '../utils/db';
import { 
  Sun, 
  Moon, 
  ChevronLeft, 
  ChevronRight, 
  CalendarDays, 
  Share2, 
  HelpCircle,
  AlertTriangle,
  Check
} from 'lucide-react';

export default function Calendar({ shifts, onUpdateShift, activeMember }) {
  // Estado para controlar o primeiro dia da semana exibida (começa no domingo da semana atual)
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay(); // 0 = Domingo, 1 = Segunda, etc.
    const diff = today.getDate() - day; // Ajusta para o domingo
    const sunday = new Date(today.setDate(diff));
    sunday.setHours(0, 0, 0, 0);
    return sunday;
  });

  const [copiedText, setCopiedText] = useState(false);

  // Auxiliares para cálculo de data
  const getDaysOfWeek = (start) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(start);
      nextDay.setDate(start.getDate() + i);
      days.push(nextDay);
    }
    return days;
  };

  const days = getDaysOfWeek(currentWeekStart);

  const navigateWeek = (direction) => {
    const nextStart = new Date(currentWeekStart);
    nextStart.setDate(currentWeekStart.getDate() + (direction * 7));
    setCurrentWeekStart(nextStart);
  };

  const jumpToToday = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day;
    const sunday = new Date(today.setDate(diff));
    sunday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(sunday);
  };

  const formatDateLabel = (date) => {
    const options = { day: 'numeric', month: 'short' };
    return date.toLocaleDateString('pt-BR', options);
  };

  const getDayName = (date) => {
    const names = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return names[date.getDay()];
  };

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  // Gerar resumo para WhatsApp
  const shareToWhatsapp = () => {
    const startStr = days[0].toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const endStr = days[6].toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    
    let text = `👵 *ESCALA DE CUIDADOS DA MÃE*\n📅 Período: ${startStr} a ${endStr}\n\n`;

    days.forEach(day => {
      const dateStr = day.toISOString().split('T')[0];
      const dayName = getDayName(day);
      const dayNum = day.getDate();
      
      const shiftDiurno = shifts[`${dateStr}_diurno`];
      const shiftNoturno = shifts[`${dateStr}_noturno`];

      const diurnoName = shiftDiurno?.assigned_to 
        ? `${shiftDiurno.assigned_to} ${MEMBERS.find(m => m.name === shiftDiurno.assigned_to)?.avatar || ''}`
        : '❌ [VAGO]';
        
      const noturnoName = shiftNoturno?.assigned_to 
        ? `${shiftNoturno.assigned_to} ${MEMBERS.find(m => m.name === shiftNoturno.assigned_to)?.avatar || ''}`
        : '❌ [VAGO]';

      const diurnoStatus = shiftDiurno?.status === 'needs_swap' ? ' ⚠️ (Precisa de troca)' : '';
      const noturnoStatus = shiftNoturno?.status === 'needs_swap' ? ' ⚠️ (Precisa de troca)' : '';

      text += `*${dayName} (${dayNum})*\n☀️ Diurno (07h-19h): ${diurnoName}${diurnoStatus}\n🌙 Noturno (19h-07h): ${noturnoName}${noturnoStatus}\n\n`;
    });

    text += `👉 Atualize pelo app da escala!`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 3000);
    });
  };

  // Tratar ação de clique em turno
  const handleShiftAction = (dateStr, period, currentShift) => {
    if (!currentShift || !currentShift.assigned_to) {
      // Turno Vago -> Assumir
      onUpdateShift(dateStr, period, activeMember, 'confirmed');
    } else if (currentShift.assigned_to === activeMember) {
      // É o próprio usuário
      // Vamos mostrar uma pergunta ou realizar a ação direta
      // Para ser simples, se o usuário clicar no seu próprio turno:
      // Se for confirmado, pode pedir troca ou liberar. Vamos abrir um menu de escolha
      // Mas para fazer de forma rápida na UI sem complicados modals:
      // Vamos criar um pequeno popover ou alternar o estado.
    }
  };

  const getWeekRangeLabel = () => {
    const startStr = days[0].toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
    const endStr = days[6].toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  };

  return (
    <div className="animate-fade">
      {/* Controles de Navegação da Semana */}
      <div className="week-nav">
        <button className="btn btn-secondary btn-icon" onClick={() => navigateWeek(-1)}>
          <ChevronLeft size={20} />
        </button>
        
        <div style={{ textAlign: 'center' }}>
          <div className="week-title">{getWeekRangeLabel()}</div>
          <button 
            onClick={jumpToToday}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--primary)', 
              fontSize: '0.8rem', 
              fontWeight: 600, 
              cursor: 'pointer',
              marginTop: '4px',
              textDecoration: 'underline'
            }}
          >
            Voltar para Hoje
          </button>
        </div>

        <button className="btn btn-secondary btn-icon" onClick={() => navigateWeek(1)}>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Botão de Compartilhamento WhatsApp */}
      <button 
        className="btn btn-secondary" 
        onClick={shareToWhatsapp}
        style={{ width: '100%', marginBottom: '16px', justifyContent: 'center', gap: '8px' }}
      >
        {copiedText ? (
          <>
            <Check size={18} style={{ color: 'var(--color-success)' }} />
            <span style={{ color: 'var(--color-success)' }}>Copiado para o WhatsApp!</span>
          </>
        ) : (
          <>
            <Share2 size={18} />
            <span>Copiar Escala Semanal para WhatsApp</span>
          </>
        )}
      </button>

      {/* Grid de Dias */}
      <div className="days-list">
        {days.map(day => {
          const dateStr = day.toISOString().split('T')[0];
          const isDayToday = isToday(day);
          const dayName = getDayName(day);
          
          const shiftDiurno = shifts[`${dateStr}_diurno`];
          const shiftNoturno = shifts[`${dateStr}_noturno`];

          return (
            <div key={dateStr} className="day-card">
              <div className={`day-header ${isDayToday ? 'day-header-today' : ''}`}>
                <span>{dayName}</span>
                <span>{formatDateLabel(day)}</span>
              </div>
              
              <div className="shifts-container">
                {/* TURNO DIURNO */}
                <ShiftRow 
                  period="diurno"
                  timeLabel="07:00 - 19:00"
                  dateStr={dateStr}
                  shift={shiftDiurno}
                  activeMember={activeMember}
                  onUpdateShift={onUpdateShift}
                />
                
                {/* TURNO NOTURNO */}
                <ShiftRow 
                  period="noturno"
                  timeLabel="19:00 - 07:00"
                  dateStr={dateStr}
                  shift={shiftNoturno}
                  activeMember={activeMember}
                  onUpdateShift={onUpdateShift}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ShiftRow({ period, timeLabel, dateStr, shift, activeMember, onUpdateShift }) {
  const [showOptions, setShowOptions] = useState(false);
  const isDiurno = period === 'diurno';
  
  const assignedName = shift?.assigned_to;
  const status = shift?.status || 'open';
  
  const assignedMember = MEMBERS.find(m => m.name === assignedName);

  const handleClaim = () => {
    onUpdateShift(dateStr, period, activeMember, 'confirmed');
    setShowOptions(false);
  };

  const handleRelease = () => {
    onUpdateShift(dateStr, period, null, 'open');
    setShowOptions(false);
  };

  const handleRequestSwap = () => {
    onUpdateShift(dateStr, period, assignedName, 'needs_swap');
    setShowOptions(false);
  };

  const handleResolveSwap = () => {
    onUpdateShift(dateStr, period, activeMember, 'confirmed');
    setShowOptions(false);
  };

  return (
    <div className="shift-row">
      <div className="shift-info">
        <div className="shift-icon" style={{ color: isDiurno ? '#f59e0b' : '#3b82f6' }}>
          {isDiurno ? <Sun size={20} fill="currentColor" /> : <Moon size={20} fill="currentColor" />}
        </div>
        <div className="shift-details">
          <span className="shift-time">{timeLabel}</span>
          {assignedMember ? (
            <span className="shift-assignee">
              <span style={{ fontSize: '1.1rem' }}>{assignedMember.avatar}</span>
              <span 
                style={{ 
                  color: assignedMember.color,
                  backgroundColor: assignedMember.lightColor,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.9rem'
                }}
              >
                {assignedName}
              </span>
            </span>
          ) : (
            <span className="shift-assignee vacant">Vago</span>
          )}
        </div>
      </div>

      <div className="shift-actions">
        {/* Caso 1: Turno Vago */}
        {status === 'open' && (
          <button className="btn btn-secondary btn-sm" onClick={handleClaim} style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
            Assumir
          </button>
        )}

        {/* Caso 2: Reservado por mim */}
        {status === 'confirmed' && assignedName === activeMember && (
          <div style={{ position: 'relative' }}>
            {!showOptions ? (
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => setShowOptions(true)}
                style={{ fontSize: '0.85rem', padding: '6px 12px', border: '1px solid var(--primary)' }}
              >
                Meu Turno
              </button>
            ) : (
              <div className="animate-scale" style={{ display: 'flex', gap: '6px' }}>
                <button className="btn btn-danger btn-sm" onClick={handleRelease} style={{ fontSize: '0.8rem', padding: '6px 10px' }}>
                  Liberar
                </button>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={handleRequestSwap}
                  style={{ fontSize: '0.8rem', padding: '6px 10px', backgroundColor: 'var(--color-warning-light)', color: 'var(--color-warning)' }}
                >
                  Pedir Troca
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowOptions(false)} style={{ fontSize: '0.8rem', padding: '6px 10px' }}>
                  X
                </button>
              </div>
            )}
          </div>
        )}

        {/* Caso 3: Reservado por outro irmão (Confirmado) */}
        {status === 'confirmed' && assignedName !== activeMember && (
          <span className="badge badge-confirmed">Ok</span>
        )}

        {/* Caso 4: Precisa de Troca (Cadastrado por qualquer um, inclusive eu) */}
        {status === 'needs_swap' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-swap" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertTriangle size={12} />
              Troca
            </span>
            {assignedName !== activeMember && (
              <button 
                className="btn btn-primary btn-sm" 
                onClick={handleResolveSwap}
                style={{ fontSize: '0.85rem', padding: '6px 12px', backgroundColor: 'var(--color-success)' }}
              >
                Pegar
              </button>
            )}
            {assignedName === activeMember && (
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={handleRelease}
                style={{ fontSize: '0.85rem', padding: '6px 10px', color: 'var(--color-danger)' }}
              >
                Desistir
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
