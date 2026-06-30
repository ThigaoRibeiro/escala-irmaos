import React, { useEffect, useState } from 'react';
import { MEMBERS } from '../utils/db';
import {
  Plus,
  Share2,
  Calendar,
  Check,
  X,
  ClipboardList,
  Clock3,
  Activity
} from 'lucide-react';

const EMPTY_FORM = {
  eventType: 'Evolução geral',
  entryTime: getCurrentTimeValue(),
  pressure: '',
  temperature: '',
  glucose: '',
  medicationNote: '',
  notes: ''
};

const ENTRY_TYPES = [
  'Evolução geral',
  'Pressão arterial',
  'Medicação',
  'Alimentação',
  'Sono',
  'Intercorrência'
];

export default function DailyLogs({ shifts, logs, onSaveLog, medications = [], currentUserName = '' }) {
  const currentPlantao = getCurrentPlantao();
  const [showAddForm, setShowAddForm] = useState(false);
  const [date, setDate] = useState(currentPlantao.date);
  const [period, setPeriod] = useState(currentPlantao.period);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [checkedMeds, setCheckedMeds] = useState({});
  const [copiedLogId, setCopiedLogId] = useState(null);

  const selectedShift = shifts?.[`${date}_${period}`];
  const responsibleName = selectedShift?.assigned_to || selectedShift?.caregiver_assigned || '';
  const authorName = currentUserName || responsibleName || 'Sem identificação';

  useEffect(() => {
    if (!showAddForm) return;

    const nextPlantao = getCurrentPlantao();
    setDate(nextPlantao.date);
    setPeriod(nextPlantao.period);
    setFormData((prev) => ({
      ...prev,
      entryTime: getCurrentTimeValue()
    }));
    setCheckedMeds({});
  }, [showAddForm]);

  const updateField = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const openForm = () => {
    const nextPlantao = getCurrentPlantao();
    setDate(nextPlantao.date);
    setPeriod(nextPlantao.period);
    setFormData({
      ...EMPTY_FORM,
      entryTime: getCurrentTimeValue()
    });
    setCheckedMeds({});
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      ...EMPTY_FORM,
      entryTime: getCurrentTimeValue()
    });
    setCheckedMeds({});
    setShowAddForm(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const hasCheckedMedication = Object.values(checkedMeds).some(Boolean);

    if (!formData.notes.trim() && !formData.pressure.trim() && !formData.temperature.trim() && !formData.glucose.trim() && !formData.medicationNote.trim() && !hasCheckedMedication) {
      window.alert('Adicione pelo menos uma observação, sinal vital ou medicação para registrar a evolução.');
      return;
    }

    const notes = buildEvolutionNotes({
      authorName,
      responsibleName,
      period,
      medications,
      checkedMeds,
      ...formData
    });

    const medsGiven = formData.eventType === 'Medicação' || !!formData.medicationNote.trim() || hasCheckedMedication;
    onSaveLog(date, period, authorName, responsibleName || null, medsGiven, true, notes);
    resetForm();
  };

  const getMemberAvatar = (name) => {
    const member = MEMBERS.find((memberItem) => memberItem.name === name);
    return member ? member.avatar : '👤';
  };

  const getMemberColor = (name) => {
    const member = MEMBERS.find((memberItem) => memberItem.name === name);
    return member ? member.color : 'var(--text-primary)';
  };

  const formatLogDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const formatLogTime = (log) => {
    const source = log.created_at || `${log.date}T00:00:00`;
    const dateObj = new Date(source);
    if (Number.isNaN(dateObj.getTime())) return '--:--';

    return dateObj.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const shareLogToWhatsapp = (log) => {
    const authorAvatar = getMemberAvatar(log.author);
    const periodLabel = log.period === 'diurno' ? '☀️ Diurno' : '🌙 Noturno';
    const timeLabel = formatLogTime(log);

    let text = `📝 *EVOLUÇÃO DO DIÁRIO*\n`;
    text += `📅 Data: ${formatLogDate(log.date)}\n`;
    text += `⏰ Turno: ${periodLabel}\n`;
    text += `🕒 Registro: ${timeLabel}\n`;
    text += `👤 Registrado por: ${log.author} ${authorAvatar}\n`;
    if (log.caregiver) {
      text += `🩺 Em plantão: ${log.caregiver}\n`;
    }
    text += `\n${log.notes}\n`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedLogId(log.id);
      setTimeout(() => setCopiedLogId(null), 3000);
    });
  };

  const logsList = Object.values(logs).sort((a, b) => {
    const dateA = new Date(a.created_at || `${a.date}T00:00:00`);
    const dateB = new Date(b.created_at || `${b.date}T00:00:00`);
    return dateB - dateA;
  });

  return (
    <div className="animate-fade">
      <div className="card" style={{ marginBottom: '16px' }}>
        <h3 className="card-title">
          <Activity size={20} />
          <span>Diário de Evolução</span>
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 0 }}>
          Cada registro entra com autor e horário. O histórico é cumulativo ao longo do dia e não pode ser removido.
        </p>
      </div>

      {!showAddForm ? (
        <button
          className="btn btn-primary"
          onClick={openForm}
          style={{ width: '100%', marginBottom: '20px', justifyContent: 'center' }}
        >
          <Plus size={20} />
          <span>Adicionar evolução</span>
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="card animate-scale" style={{ border: '2px solid var(--primary)', marginBottom: '20px' }}>
          <h3 className="card-title" style={{ color: 'var(--primary)', justifyContent: 'space-between' }}>
            <span>Nova evolução</span>
            <button
              type="button"
              className="btn btn-secondary btn-icon"
              onClick={resetForm}
              style={{ width: '28px', height: '28px' }}
            >
              <X size={16} />
            </button>
          </h3>

          <div className="form-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            <div>
              <label className="form-label">Data</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="form-control"
                required
              />
            </div>

            <div>
              <label className="form-label">Turno</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="form-control"
              >
                <option value="diurno">☀️ Diurno</option>
                <option value="noturno">🌙 Noturno</option>
              </select>
            </div>

            <div>
              <label className="form-label">Hora do registro</label>
              <input
                type="time"
                value={formData.entryTime}
                onChange={(e) => updateField('entryTime', e.target.value)}
                className="form-control"
                required
              />
            </div>

            <div>
              <label className="form-label">Tipo</label>
              <select
                value={formData.eventType}
                onChange={(e) => updateField('eventType', e.target.value)}
                className="form-control"
              >
                {ENTRY_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <ReadOnlyField label="Registrado por" value={authorName} />
            <ReadOnlyField label="Responsável no plantão" value={responsibleName || 'Sem responsável escalado'} />
          </div>

          <SectionTitle label="Medicamentos" />
          {medications.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '12px' }}>
              Nenhum medicamento cadastrado. Adicione na aba Configurações.
            </p>
          ) : (
            <div className="checkbox-group" style={{ flexDirection: 'column', gap: '10px', marginBottom: '8px' }}>
              {medications.map((med) => (
                <label key={med.id} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={!!checkedMeds[med.id]}
                    onChange={(e) =>
                      setCheckedMeds((prev) => ({
                        ...prev,
                        [med.id]: e.target.checked
                      }))
                    }
                    className="checkbox-input"
                  />
                  <span>
                    <strong>{med.time}</strong> - {med.name} ({med.dose})
                    {med.note && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}> - {med.note}</span>}
                  </span>
                </label>
              ))}
            </div>
          )}

          <SectionTitle label="Sinais e medicações" />
          <div className="form-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            <TextInput label="Pressão arterial" value={formData.pressure} onChange={(value) => updateField('pressure', value)} placeholder="Ex: 15x10" />
            <TextInput label="Temperatura" value={formData.temperature} onChange={(value) => updateField('temperature', value)} placeholder="Ex: 37,2" />
            <TextInput label="Glicemia" value={formData.glucose} onChange={(value) => updateField('glucose', value)} placeholder="Opcional" />
            <TextInput label="Medicação / ação feita" value={formData.medicationNote} onChange={(value) => updateField('medicationNote', value)} placeholder="Ex: captopril 25mg" />
          </div>

          <div className="form-group">
            <label className="form-label">Evolução / observação</label>
            <textarea
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              className="form-control"
              rows={5}
              placeholder="Descreva o que aconteceu. Ex: pressão subiu para 15x10 às 14:20, repouso orientado, nova aferição às 14:50..."
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Salvar evolução
            </button>
            <button type="button" className="btn btn-secondary" onClick={resetForm}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <h3 className="card-title" style={{ marginBottom: '12px' }}>
        <ClipboardList size={20} />
        <span>Histórico de evoluções</span>
      </h3>

      {logsList.length === 0 ? (
        <div className="card empty-state">
          Nenhuma evolução registrada ainda.
        </div>
      ) : (
        logsList.map((log) => {
          const authorAvatar = getMemberAvatar(log.author);
          const authorColor = getMemberColor(log.author);
          const periodLabel = log.period === 'diurno' ? '☀️ Dia' : '🌙 Noite';

          return (
            <div
              key={log.id}
              className="log-item animate-fade"
              style={{ borderLeftColor: authorColor }}
            >
              <div className="log-meta" style={{ alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
                <span className="log-author" style={{ color: authorColor }}>
                  {authorAvatar} {log.author}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={12} />
                  {formatLogDate(log.date)} - {periodLabel}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock3 size={12} />
                  {formatLogTime(log)}
                </span>
              </div>

              {log.caregiver && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Em plantão: <strong style={{ color: 'var(--text-primary)' }}>{log.caregiver}</strong>
                </div>
              )}

              <div className="log-checklists">
                <span className={`log-badge ${log.meds_given ? 'log-badge-done' : 'log-badge-pending'}`}>
                  {log.meds_given ? <Check size={12} /> : <Clock3 size={12} />}
                  {log.meds_given ? 'Com medicação/ação registrada' : 'Evolução registrada'}
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

function SectionTitle({ label }) {
  return (
    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', margin: '18px 0 10px', fontSize: '1rem' }}>
      <ClipboardList size={18} />
      <span>{label}</span>
    </h4>
  );
}

function TextInput({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="form-label">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="form-control" placeholder={placeholder} />
    </div>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <label className="form-label">{label}</label>
      <div
        style={{
          minHeight: '42px',
          padding: '10px 12px',
          backgroundColor: 'var(--bg-subtle)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          color: 'var(--text-primary)',
          fontWeight: 600
        }}
      >
        {value}
      </div>
    </div>
  );
}

function buildEvolutionNotes(data) {
  const lines = [
    `Tipo: ${data.eventType}`,
    `Horário do registro: ${data.entryTime}`,
    formatMedicationGroup(data.medications, data.checkedMeds),
    data.pressure ? `Pressão arterial: ${data.pressure}` : '',
    data.temperature ? `Temperatura: ${data.temperature}` : '',
    data.glucose ? `Glicemia: ${data.glucose}` : '',
    data.medicationNote ? `Medicação / ação feita: ${data.medicationNote}` : '',
    data.notes ? `Evolução: ${data.notes}` : ''
  ].filter(Boolean);

  return lines.join('\n');
}

function formatMedicationGroup(medications = [], checkedMeds = {}) {
  const selected = medications
    .filter((med) => checkedMeds[med.id])
    .map((med) => `${med.time} ${med.name} (${med.dose})`);

  return selected.length > 0 ? `Medicamentos administrados: ${selected.join(' | ')}` : '';
}

function getCurrentPlantao() {
  const now = new Date();
  const hour = now.getHours();
  const shiftDate = new Date(now);

  if (hour < 7) {
    shiftDate.setDate(shiftDate.getDate() - 1);
    return { date: toDateInputValue(shiftDate), period: 'noturno' };
  }

  if (hour >= 19) {
    return { date: toDateInputValue(shiftDate), period: 'noturno' };
  }

  return { date: toDateInputValue(shiftDate), period: 'diurno' };
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentTimeValue() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}
