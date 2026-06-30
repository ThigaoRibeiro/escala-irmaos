import React, { useState } from 'react';
import { MEMBERS, CAREGIVER_STYLE } from '../utils/db';
import { 
  ChevronLeft, 
  ChevronRight, 
  Share2, 
  Check, 
  X
} from 'lucide-react';

export default function Calendar({ shifts, onUpdateShift, activeMember, caregivers }) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    return getMondayStart(new Date());
  });

  const [copiedText, setCopiedText] = useState(false);
  const [editingShift, setEditingShift] = useState(null); // { date, period, shiftObj }

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
    setCurrentWeekStart(getMondayStart(new Date()));
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

  const getWeekRangeLabel = () => {
    const startStr = days[0].toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
    const endStr = days[6].toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  };

  // Gerar resumo de texto formatado para o WhatsApp
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

      // Formatação Diurno
      const famDiurno = shiftDiurno?.assigned_to 
        ? `${shiftDiurno.assigned_to} ${MEMBERS.find(m => m.name === shiftDiurno.assigned_to)?.avatar || ''}`
        : '❌ [Vago]';
      const careDiurno = shiftDiurno?.caregiver_assigned
        ? `+ ${shiftDiurno.caregiver_assigned} 🩺`
        : '';
      const statusDiurno = shiftDiurno?.status === 'needs_swap' ? ' ⚠️ (Precisa de troca)' : '';

      // Formatação Noturno
      const famNoturno = shiftNoturno?.assigned_to 
        ? `${shiftNoturno.assigned_to} ${MEMBERS.find(m => m.name === shiftNoturno.assigned_to)?.avatar || ''}`
        : '❌ [Vago]';
      const careNoturno = shiftNoturno?.caregiver_assigned
        ? `+ ${shiftNoturno.caregiver_assigned} 🩺`
        : '';
      const statusNoturno = shiftNoturno?.status === 'needs_swap' ? ' ⚠️ (Precisa de troca)' : '';

      text += `*${dayName} (${dayNum})*\n☀️ Diurno: ${famDiurno} ${careDiurno}${statusDiurno}\n🌙 Noturno: ${famNoturno} ${careNoturno}${statusNoturno}\n\n`;
    });

    text += `👉 Atualize pelo app da escala!`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 3000);
    });
  };

  const openEditModal = (dateStr, period) => {
    const shiftKey = `${dateStr}_${period}`;
    const currentShift = shifts[shiftKey] || {
      id: shiftKey,
      date: dateStr,
      period,
      assigned_to: null,
      caregiver_assigned: null,
      status: 'confirmed'
    };
    setEditingShift({ date: dateStr, period, shiftObj: currentShift });
  };

  const handleModalSave = (assignedTo, caregiverAssigned, status) => {
    if (editingShift) {
      onUpdateShift(editingShift.date, editingShift.period, assignedTo, caregiverAssigned, status);
      setEditingShift(null);
    }
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
          const dayOfWeek = day.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // 0 = Domingo, 6 = Sábado
          
          const shiftDiurno = shifts[`${dateStr}_diurno`];
          const shiftNoturno = shifts[`${dateStr}_noturno`];

          return (
            <div key={dateStr} className={`day-card animate-fade ${isWeekend && !isDayToday ? 'day-card-weekend' : ''}`}>
              <div className={`day-header ${isDayToday ? 'day-header-today' : isWeekend ? 'day-header-weekend' : ''}`}>
                <span>{dayName}</span>
                <span>{formatDateLabel(day)}</span>
              </div>
              
              <div className="shifts-container">
                {/* TURNO DIURNO */}
                <ShiftRow 
                  timeLabel="☀️ 07:00 - 19:00"
                  shift={shiftDiurno}
                  onClick={() => openEditModal(dateStr, 'diurno')}
                />
                
                {/* TURNO NOTURNO */}
                <ShiftRow 
                  timeLabel="🌙 19:00 - 07:00"
                  shift={shiftNoturno}
                  onClick={() => openEditModal(dateStr, 'noturno')}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Escala/Edição */}
      {editingShift && (
        <EditShiftModal 
          dateStr={editingShift.date}
          period={editingShift.period}
          shift={editingShift.shiftObj}
          caregivers={caregivers}
          activeMember={activeMember}
          onClose={() => setEditingShift(null)}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
}

function getMondayStart(date) {
  const start = new Date(date);
  const day = start.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - daysSinceMonday);
  start.setHours(0, 0, 0, 0);
  return start;
}

function ShiftRow({ timeLabel, shift, onClick }) {
  const assignedName = shift?.assigned_to;
  const caregiverName = shift?.caregiver_assigned;
  const status = shift?.status || 'confirmed';

  const assignedMember = MEMBERS.find(m => m.name === assignedName);

  return (
    <div className="shift-row" onClick={onClick} style={{ cursor: 'pointer', transition: 'background var(--transition-fast)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        <span className="shift-time">{timeLabel}</span>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          {!assignedMember && !caregiverName ? (
            /* Turno completamente vago — um único badge */
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--text-muted)',
                backgroundColor: 'var(--bg-subtle)',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontStyle: 'italic',
                border: '1px dashed var(--border-color)'
              }}
            >
              <span>👤</span>
              <span>Vago</span>
            </div>
          ) : (
            <>
              {/* Slot de Filho(a) */}
              {assignedMember && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: assignedMember.color,
                    backgroundColor: assignedMember.lightColor,
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    border: `1px solid ${assignedMember.color}`
                  }}
                >
                  <span>{assignedMember.avatar}</span>
                  <span>{assignedName}</span>
                  {status === 'needs_swap' && (
                    <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem', fontWeight: 'bold', marginLeft: '4px' }}>
                      ⚠️ Troca
                    </span>
                  )}
                </div>
              )}

              {/* Slot de Cuidadora */}
              {caregiverName && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: CAREGIVER_STYLE.color,
                    backgroundColor: CAREGIVER_STYLE.lightColor,
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    border: `1px solid ${CAREGIVER_STYLE.color}`
                  }}
                >
                  <span>{CAREGIVER_STYLE.avatar}</span>
                  <span>{caregiverName}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      <div>
        <button className="btn btn-secondary btn-sm" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
          Escalar
        </button>
      </div>
    </div>
  );
}

function EditShiftModal({ dateStr, period, shift, caregivers, activeMember, onClose, onSave }) {
  const [assignedTo, setAssignedTo] = useState(shift.assigned_to);
  const [caregiverAssigned, setCaregiverAssigned] = useState(shift.caregiver_assigned);
  const [status, setStatus] = useState(shift.status || 'confirmed');

  const formattedDate = () => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const handleSave = () => {
    onSave(assignedTo, caregiverAssigned, status);
  };

  const selectMyself = () => {
    setAssignedTo(activeMember);
    setStatus('confirmed');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="card-title" style={{ color: 'var(--primary)', justifyContent: 'space-between', marginBottom: '20px' }}>
          <span>Escalar Turno</span>
          <button className="btn btn-secondary btn-icon" onClick={onClose} style={{ width: '28px', height: '28px' }}>
            <X size={16} />
          </button>
        </h3>

        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px', display: 'flex', gap: '8px' }}>
          <span>📅 <strong>{formattedDate()}</strong></span>
          <span>•</span>
          <span>{period === 'diurno' ? '☀️ Diurno (07h-19h)' : '🌙 Noturno (19h-07h)'}</span>
        </div>

        {/* 1. SELEÇÃO DE FAMILIAR */}
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Filhos:</span>
            <button 
              type="button" 
              onClick={selectMyself} 
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
            >
              Me Escalar
            </button>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '6px' }}>
            {MEMBERS.map(m => {
              const isSelected = assignedTo === m.name;
              return (
                <button
                  key={m.name}
                  type="button"
                  onClick={() => setAssignedTo(m.name)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: '8px',
                    border: isSelected ? `2px solid ${m.color}` : '1px solid var(--border-color)',
                    backgroundColor: isSelected ? m.lightColor : 'var(--bg-card)',
                    color: isSelected ? m.color : 'var(--text-primary)',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>{m.avatar}</span>
                  <span>{m.name}</span>
                </button>
              );
            })}
          </div>
          
          {assignedTo && (
            <button 
              type="button" 
              onClick={() => setAssignedTo(null)}
              style={{ 
                marginTop: '8px', 
                background: 'none', 
                border: 'none', 
                color: 'var(--color-danger)', 
                fontSize: '0.75rem', 
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              Remover Familiar do Turno
            </button>
          )}
        </div>

        {/* Status de Troca para o Familiar */}
        {assignedTo && (
          <div className="form-group" style={{ backgroundColor: 'var(--bg-subtle)', padding: '10px', borderRadius: '8px', marginBottom: '16px' }}>
            <label className="form-label" style={{ fontSize: '0.85rem' }}>Status do Familiar:</label>
            <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="shift_status" 
                  checked={status === 'confirmed'} 
                  onChange={() => setStatus('confirmed')} 
                />
                <span>Confirmado ✅</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--color-danger)', fontWeight: 600 }}>
                <input 
                  type="radio" 
                  name="shift_status" 
                  checked={status === 'needs_swap'} 
                  onChange={() => setStatus('needs_swap')} 
                />
                <span>Precisa de Troca ⚠️</span>
              </label>
            </div>
          </div>
        )}

        {/* 2. SELEÇÃO DE CUIDADORA */}
        <div className="form-group" style={{ marginTop: '16px' }}>
          <label className="form-label" style={{ fontWeight: 600 }}>Cuidadora:</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '6px' }}>
            {caregivers.map(c => {
              const isSelected = caregiverAssigned === c.name;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCaregiverAssigned(c.name)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: isSelected ? `2px solid ${CAREGIVER_STYLE.color}` : '1px solid var(--border-color)',
                    backgroundColor: isSelected ? CAREGIVER_STYLE.lightColor : 'var(--bg-card)',
                    color: isSelected ? CAREGIVER_STYLE.color : 'var(--text-primary)',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <span>{CAREGIVER_STYLE.avatar}</span>
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>
          
          {caregiverAssigned && (
            <button 
              type="button" 
              onClick={() => setCaregiverAssigned(null)}
              style={{ 
                marginTop: '8px', 
                background: 'none', 
                border: 'none', 
                color: 'var(--color-danger)', 
                fontSize: '0.75rem', 
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              Remover Cuidadora do Turno
            </button>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Salvar Escala
          </button>
        </div>
      </div>
    </div>
  );
}
