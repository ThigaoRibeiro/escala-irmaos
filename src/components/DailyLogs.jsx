import React, { useState } from 'react';
import { MEMBERS } from '../utils/db';
import { 
  FileText, 
  CheckSquare, 
  Square, 
  Plus, 
  Share2, 
  Calendar, 
  Clock, 
  Check, 
  X,
  FileSpreadsheet
} from 'lucide-react';

export default function DailyLogs({ logs, onSaveLog, activeMember }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [period, setPeriod] = useState('diurno');
  const [medsGiven, setMedsGiven] = useState(false);
  const [mealsOk, setMealsOk] = useState(false);
  const [notes, setNotes] = useState('');
  
  const [copiedLogId, setCopiedLogId] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!notes.trim()) {
      alert('Por favor, escreva uma breve observação sobre o plantão.');
      return;
    }
    onSaveLog(date, period, activeMember, medsGiven, mealsOk, notes);
    
    // Reset Form
    setNotes('');
    setMedsGiven(false);
    setMealsOk(false);
    setShowAddForm(false);
  };

  const getMemberAvatar = (name) => {
    const member = MEMBERS.find(m => m.name === name);
    return member ? member.avatar : '👤';
  };

  const getMemberColor = (name) => {
    const member = MEMBERS.find(m => m.name === name);
    return member ? member.color : 'var(--text-primary)';
  };

  const getMemberLightColor = (name) => {
    const member = MEMBERS.find(m => m.name === name);
    return member ? member.lightColor : 'var(--bg-subtle)';
  };

  const formatLogDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const shareLogToWhatsapp = (log) => {
    const authorAvatar = getMemberAvatar(log.author);
    const periodLabel = log.period === 'diurno' ? '☀️ Diurno (07h-19h)' : '🌙 Noturno (19h-07h)';
    
    let text = `📝 *PASSAGEM DE PLANTÃO DA MÃE*\n`;
    text += `📅 Data: ${formatLogDate(log.date)}\n`;
    text += `⏰ Turno: ${periodLabel}\n`;
    text += `👤 Cuidador: ${log.author} ${authorAvatar}\n\n`;
    text += `💊 Remédios do turno: ${log.meds_given ? '✅ Tomou todos' : '❌ Não tomou / Pendente'}\n`;
    text += `🍲 Alimentação: ${log.meals_ok ? '✅ Comeu bem' : '❌ Comeu pouco / Recusou'}\n\n`;
    text += `✍️ *Observações do Plantão:*\n${log.notes}\n`;
    
    navigator.clipboard.writeText(text).then(() => {
      setCopiedLogId(log.id);
      setTimeout(() => setCopiedLogId(null), 3000);
    });
  };

  // Transforma o objeto de logs em array ordenado por data de criação descrescente
  const logsList = Object.values(logs).sort((a, b) => {
    // Ordenação secundária por data e turno se created_at não for preciso
    const dateA = new Date(a.created_at || `${a.date}T${a.period === 'diurno' ? '19:00' : '07:00'}`);
    const dateB = new Date(b.created_at || `${b.date}T${b.period === 'diurno' ? '19:00' : '07:00'}`);
    return dateB - dateA;
  });

  return (
    <div className="animate-fade">
      {/* Botão de abrir formulário de Novo Registro */}
      {!showAddForm ? (
        <button 
          className="btn btn-primary" 
          onClick={() => setShowAddForm(true)}
          style={{ width: '100%', marginBottom: '20px', justifyContent: 'center' }}
        >
          <Plus size={20} />
          <span>Escrever Diário / Passar Plantão</span>
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="card animate-scale" style={{ border: '2px solid var(--primary)' }}>
          <h3 className="card-title" style={{ color: 'var(--primary)', justifyContent: 'space-between' }}>
            <span>Novo Registro de Plantão</span>
            <button 
              type="button" 
              className="btn btn-secondary btn-icon" 
              onClick={() => setShowAddForm(false)}
              style={{ width: '28px', height: '28px' }}
            >
              <X size={16} />
            </button>
          </h3>
          
          <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="form-label">Data:</label>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                className="form-control"
                required
              />
            </div>
            
            <div>
              <label className="form-label">Turno:</label>
              <select 
                value={period} 
                onChange={(e) => setPeriod(e.target.value)} 
                className="form-control"
              >
                <option value="diurno">☀️ Diurno (07h-19h)</option>
                <option value="noturno">🌙 Noturno (19h-07h)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Cuidador ativo:</label>
            <div 
              style={{ 
                padding: '10px', 
                backgroundColor: getMemberLightColor(activeMember), 
                borderRadius: '8px', 
                border: `1px solid ${getMemberColor(activeMember)}`,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{getMemberAvatar(activeMember)}</span>
              <span>{activeMember}</span>
            </div>
          </div>

          <div className="checkbox-group">
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={medsGiven} 
                onChange={(e) => setMedsGiven(e.target.checked)} 
                className="checkbox-input"
              />
              <span>Remédios Ministrados? 💊</span>
            </label>
            
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={mealsOk} 
                onChange={(e) => setMealsOk(e.target.checked)} 
                className="checkbox-input"
              />
              <span>Alimentação OK? 🍲</span>
            </label>
          </div>

          <div className="form-group">
            <label className="form-label">Observações (Como ela passou o plantão):</label>
            <textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              className="form-control"
              rows={4}
              placeholder="Ex: Comeu bem, dormiu à tarde, tomou os remédios do horário. Estava um pouco agitada às 17h mas acalmou após o chá..."
              required
            ></textarea>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Gravar Plantão
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Feed de Ocorrências */}
      <h3 className="card-title" style={{ marginBottom: '12px' }}>
        <FileSpreadsheet size={20} />
        <span>Histórico de Plantões</span>
      </h3>

      {logsList.length === 0 ? (
        <div className="card empty-state">
          Nenhum plantão registrado ainda.
        </div>
      ) : (
        logsList.map(log => {
          const authorAvatar = getMemberAvatar(log.author);
          const authorColor = getMemberColor(log.author);
          const authorLightColor = getMemberLightColor(log.author);
          
          return (
            <div 
              key={log.id} 
              className="log-item animate-fade" 
              style={{ borderLeftColor: authorColor }}
            >
              <div className="log-meta">
                <span className="log-author" style={{ color: authorColor }}>
                  {authorAvatar} {log.author}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={12} />
                  {formatLogDate(log.date)} - {log.period === 'diurno' ? '☀️ Manhã' : '🌙 Noite'}
                </span>
              </div>
              
              <div className="log-checklists">
                <span className={`log-badge ${log.meds_given ? 'log-badge-done' : 'log-badge-pending'}`}>
                  {log.meds_given ? <Check size={12} /> : <X size={12} />}
                  Remédios 💊
                </span>
                
                <span className={`log-badge ${log.meals_ok ? 'log-badge-done' : 'log-badge-pending'}`}>
                  {log.meals_ok ? <Check size={12} /> : <X size={12} />}
                  Alimentação 🍲
                </span>
              </div>

              <div className="log-text">{log.notes}</div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => shareLogToWhatsapp(log)}
                  style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', gap: '6px', alignItems: 'center' }}
                >
                  {copiedLogId === log.id ? (
                    <>
                      <Check size={14} style={{ color: 'var(--color-success)' }} />
                      <span style={{ color: 'var(--color-success)' }}>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Share2 size={14} />
                      <span>Copiar p/ WhatsApp</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
