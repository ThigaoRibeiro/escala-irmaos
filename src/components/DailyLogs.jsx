import React, { useEffect, useState } from 'react';
import { MEMBERS } from '../utils/db';
import {
  Plus,
  Share2,
  Calendar,
  Check,
  X,
  FileSpreadsheet,
  ClipboardList
} from 'lucide-react';

const EMPTY_FORM = {
  pressure: '',
  temperature: '',
  alertSigns: '',
  sleepStatus: '',
  breakfast: '',
  lunch: '',
  snack: '',
  dinner: '',
  hydration: '',
  urine: '',
  stool: '',
  diaperChanges: '',
  bath: '',
  bathPlace: '',
  skinCare: '',
  mood: '',
  medManha1: false,
  medManha2: false,
  medApevitin: false,
  medNoite1: false,
  medNoite2: false,
  activityLegs: false,
  activitySun: false,
  activityTv: false,
  notes: ''
};

export default function DailyLogs({ shifts, logs, onSaveLog }) {
  const currentPlantao = getCurrentPlantao();
  const [showAddForm, setShowAddForm] = useState(false);
  const [date, setDate] = useState(currentPlantao.date);
  const [period, setPeriod] = useState(currentPlantao.period);
  const [entryTime, setEntryTime] = useState(getPeriodTimes(currentPlantao.period).entry);
  const [exitTime, setExitTime] = useState(getPeriodTimes(currentPlantao.period).exit);
  const [mealsOk, setMealsOk] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [copiedLogId, setCopiedLogId] = useState(null);

  const selectedShift = shifts?.[`${date}_${period}`];
  const responsibleName = selectedShift?.assigned_to || selectedShift?.caregiver_assigned || '';

  useEffect(() => {
    const times = getPeriodTimes(period);
    setEntryTime(times.entry);
    setExitTime(times.exit);
  }, [period]);

  const updateField = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const openForm = () => {
    const nextPlantao = getCurrentPlantao();
    const times = getPeriodTimes(nextPlantao.period);
    setDate(nextPlantao.date);
    setPeriod(nextPlantao.period);
    setEntryTime(times.entry);
    setExitTime(times.exit);
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setMealsOk(false);
    setShowAddForm(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const author = responsibleName || 'Sem responsável';
    const medsGiven = formData.medManha1 && formData.medManha2 && formData.medApevitin && formData.medNoite1 && formData.medNoite2;
    const dailyNotes = buildDailyNotes({
      responsibleName: author,
      date,
      period,
      entryTime,
      exitTime,
      mealsOk,
      ...formData
    });

    onSaveLog(date, period, author, null, medsGiven, mealsOk, dailyNotes);
    resetForm();
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
    text += `👤 Responsável do Plantão: ${log.author} ${authorAvatar}\n`;

    text += `\n💊 Medicações: ${log.meds_given ? '✅ Ministradas' : '❌ Pendentes / Não ministradas'}\n`;
    text += `🍽️ Alimentação: ${log.meals_ok ? '✅ OK' : '❌ Atenção'}\n\n`;
    text += `✍️ *Registro do Plantão:*\n${log.notes}\n`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedLogId(log.id);
      setTimeout(() => setCopiedLogId(null), 3000);
    });
  };

  const logsList = Object.values(logs).sort((a, b) => {
    const dateA = new Date(a.created_at || `${a.date}T${a.period === 'diurno' ? '19:00' : '07:00'}`);
    const dateB = new Date(b.created_at || `${b.date}T${b.period === 'diurno' ? '19:00' : '07:00'}`);
    return dateB - dateA;
  });

  return (
    <div className="animate-fade">
      {!showAddForm ? (
        <button
          className="btn btn-primary"
          onClick={openForm}
          style={{ width: '100%', marginBottom: '20px', justifyContent: 'center' }}
        >
          <Plus size={20} />
          <span>Registrar Plantão</span>
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

          <div className="form-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
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

            <div>
              <label className="form-label">Entrada:</label>
              <input type="time" value={entryTime} onChange={(e) => setEntryTime(e.target.value)} className="form-control" />
            </div>

            <div>
              <label className="form-label">Saída:</label>
              <input type="time" value={exitTime} onChange={(e) => setExitTime(e.target.value)} className="form-control" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Responsável do plantão:</label>
            <div
              style={{
                padding: '10px',
                backgroundColor: responsibleName ? getMemberLightColor(responsibleName) : 'var(--bg-subtle)',
                borderRadius: '8px',
                border: `1px solid ${responsibleName ? getMemberColor(responsibleName) : 'var(--border-color)'}`,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minHeight: '42px'
              }}
            >
              <span>{responsibleName ? getMemberAvatar(responsibleName) : '👤'}</span>
              <span>{responsibleName || 'Sem responsável escalado'}</span>
            </div>
          </div>

          <SectionTitle label="Medicamentos 💊" />
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '-4px 0 12px' }}>
            Devem ser macerados com iogurte
          </p>
          <div className="checkbox-group" style={{ flexDirection: 'column', gap: '10px' }}>
            <label className="checkbox-label">
              <input type="checkbox" checked={formData.medManha1} onChange={(e) => updateField('medManha1', e.target.checked)} className="checkbox-input" />
              <span>09:00 — Desventafaxina (1 comp)</span>
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={formData.medManha2} onChange={(e) => updateField('medManha2', e.target.checked)} className="checkbox-input" />
              <span>09:00 — Memantina (1 comp)</span>
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={formData.medApevitin} onChange={(e) => updateField('medApevitin', e.target.checked)} className="checkbox-input" />
              <span>11:30 — Apevitin (1 copinho, antes do almoço)</span>
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={formData.medNoite1} onChange={(e) => updateField('medNoite1', e.target.checked)} className="checkbox-input" />
              <span>21:00 — Donepezila (1 comp)</span>
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={formData.medNoite2} onChange={(e) => updateField('medNoite2', e.target.checked)} className="checkbox-input" />
              <span>21:00 — Memantina (1 comp)</span>
            </label>
          </div>

          <div className="checkbox-group" style={{ marginTop: '14px' }}>
            <label className="checkbox-label">
              <input type="checkbox" checked={mealsOk} onChange={(e) => setMealsOk(e.target.checked)} className="checkbox-input" />
              <span>Alimentação OK 🍽️</span>
            </label>
          </div>

          <SectionTitle label="Sinais e sono" />
          <div className="form-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            <TextInput label="Pressão arterial:" value={formData.pressure} onChange={(value) => updateField('pressure', value)} placeholder="Ex: 12x8" />
            <TextInput label="Temperatura:" value={formData.temperature} onChange={(value) => updateField('temperature', value)} placeholder="Ex: 36,5" />
            <TextInput label="Sinais de alerta:" value={formData.alertSigns} onChange={(value) => updateField('alertSigns', value)} placeholder="Tosse, engasgo, febre..." />
            <SelectInput
              label="Noite / Sono:"
              value={formData.sleepStatus}
              onChange={(value) => updateField('sleepStatus', value)}
              options={['Dormiu bem', 'Acordou', 'Insônia', 'Demorou dormir']}
            />
          </div>

          <SectionTitle label="Alimentação" />
          <div className="form-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            <TextInput label="Café da manhã:" value={formData.breakfast} onChange={(value) => updateField('breakfast', value)} placeholder="Horário / aceitação" />
            <TextInput label="Almoço:" value={formData.lunch} onChange={(value) => updateField('lunch', value)} placeholder="Horário / aceitação" />
            <TextInput label="Lanche:" value={formData.snack} onChange={(value) => updateField('snack', value)} placeholder="Horário / aceitação" />
            <TextInput label="Jantar / ceia:" value={formData.dinner} onChange={(value) => updateField('dinner', value)} placeholder="Horário / aceitação" />
          </div>

          <SectionTitle label="Hidratação e fisiologia" />
          <div className="form-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            <TextInput label="Hidratação:" value={formData.hydration} onChange={(value) => updateField('hydration', value)} placeholder="Água / sucos / quantidade" />
            <SelectInput label="Urina:" value={formData.urine} onChange={(value) => updateField('urine', value)} options={['Normal', 'Pouca', 'Escura / odor forte']} />
            <TextInput label="Fezes:" value={formData.stool} onChange={(value) => updateField('stool', value)} placeholder="Sim/não, aspecto" />
            <TextInput label="Trocas de fraldas:" value={formData.diaperChanges} onChange={(value) => updateField('diaperChanges', value)} placeholder="Horários" />
          </div>

          <SectionTitle label="Higiene, bem estar e atividades" />
          <div className="form-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            <SelectInput label="Banho:" value={formData.bath} onChange={(value) => updateField('bath', value)} options={['Sim', 'Não']} />
            <SelectInput label="Local do banho:" value={formData.bathPlace} onChange={(value) => updateField('bathPlace', value)} options={['Leito', 'Chuveiro']} />
            <SelectInput label="Pele / hidratação:" value={formData.skinCare} onChange={(value) => updateField('skinCare', value)} options={['Sim', 'Não']} />
            <SelectInput label="Humor:" value={formData.mood} onChange={(value) => updateField('mood', value)} options={['Calma', 'Agitada', 'Alegre', 'Triste', 'Confusa']} />
          </div>

          <div className="checkbox-group" style={{ flexWrap: 'wrap' }}>
            <label className="checkbox-label">
              <input type="checkbox" checked={formData.activityLegs} onChange={(e) => updateField('activityLegs', e.target.checked)} className="checkbox-input" />
              <span>Sentou / Andou</span>
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={formData.activitySun} onChange={(e) => updateField('activitySun', e.target.checked)} className="checkbox-input" />
              <span>Tomou sol</span>
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={formData.activityTv} onChange={(e) => updateField('activityTv', e.target.checked)} className="checkbox-input" />
              <span>Assistiu TV</span>
            </label>
          </div>

          <div className="form-group">
            <label className="form-label">Intercorrências / observações:</label>
            <textarea
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              className="form-control"
              rows={4}
              placeholder="Quedas, dor, febre, recusa alimentar, comportamento, recomendações..."
            />
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
                  {formatLogDate(log.date)} - {log.period === 'diurno' ? '☀️ Dia' : '🌙 Noite'}
                </span>
              </div>

              <div className="log-checklists">
                <span className={`log-badge ${log.meds_given ? 'log-badge-done' : 'log-badge-pending'}`}>
                  {log.meds_given ? <Check size={12} /> : <X size={12} />}
                  Medicações 💊
                </span>

                <span className={`log-badge ${log.meals_ok ? 'log-badge-done' : 'log-badge-pending'}`}>
                  {log.meals_ok ? <Check size={12} /> : <X size={12} />}
                  Alimentação 🍽️
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

function SelectInput({ label, value, onChange, options }) {
  return (
    <div>
      <label className="form-label">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="form-control">
        <option value="">Selecionar</option>
        {options.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}

function buildDailyNotes(data) {
  const activities = [
    data.activityLegs ? 'Sentou / Andou' : '',
    data.activitySun ? 'Tomou sol' : '',
    data.activityTv ? 'Assistiu TV' : ''
  ].filter(Boolean);

  const lines = [
    `Responsável do plantão: ${data.responsibleName}`,
    `Horário: ${data.entryTime || '--:--'} às ${data.exitTime || '--:--'}`,
    formatGroup('Medicamentos', [
      `09:00 Desventafaxina: ${data.medManha1 ? '✓' : '✗ pendente'}`,
      `09:00 Memantina: ${data.medManha2 ? '✓' : '✗ pendente'}`,
      `11:30 Apevitin: ${data.medApevitin ? '✓' : '✗ pendente'}`,
      `21:00 Donepezila: ${data.medNoite1 ? '✓' : '✗ pendente'}`,
      `21:00 Memantina: ${data.medNoite2 ? '✓' : '✗ pendente'}`,
    ]),
    `Alimentação geral: ${data.mealsOk ? 'OK' : 'atenção'}`,
    formatGroup('Sinais', [
      formatItem('Pressão arterial', data.pressure),
      formatItem('Temperatura', data.temperature),
      formatItem('Sinais de alerta', data.alertSigns),
      formatItem('Noite / sono', data.sleepStatus)
    ]),
    formatGroup('Alimentação', [
      formatItem('Café da manhã', data.breakfast),
      formatItem('Almoço', data.lunch),
      formatItem('Lanche', data.snack),
      formatItem('Jantar / ceia', data.dinner)
    ]),
    formatGroup('Hidratação e fisiologia', [
      formatItem('Hidratação', data.hydration),
      formatItem('Urina', data.urine),
      formatItem('Fezes', data.stool),
      formatItem('Trocas de fraldas', data.diaperChanges)
    ]),
    formatGroup('Higiene e bem estar', [
      formatItem('Banho', data.bath),
      formatItem('Local do banho', data.bathPlace),
      formatItem('Pele / hidratação', data.skinCare),
      formatItem('Humor', data.mood)
    ]),
    activities.length > 0 ? `Atividades: ${activities.join(', ')}` : '',
    data.notes ? `Intercorrências / observações: ${data.notes}` : ''
  ].filter(Boolean);

  return lines.join('\n');
}

function formatGroup(title, items) {
  const content = items.filter(Boolean);
  return content.length > 0 ? `${title}: ${content.join(' | ')}` : '';
}

function formatItem(label, value) {
  return value ? `${label}: ${value}` : '';
}

function getPeriodTimes(period) {
  return period === 'noturno'
    ? { entry: '19:00', exit: '07:00' }
    : { entry: '07:00', exit: '19:00' };
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
