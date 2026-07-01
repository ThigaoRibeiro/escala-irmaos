import React, { useEffect, useMemo, useState } from 'react';
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
  activityLegs: false,
  activitySun: false,
  activityTv: false,
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
  const [copiedGroupKey, setCopiedGroupKey] = useState(null);

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

  const groupedLogs = useMemo(() => buildGroupedLogs(logs), [logs]);

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

    if (
      !formData.notes.trim() &&
      !formData.pressure.trim() &&
      !formData.temperature.trim() &&
      !formData.alertSigns.trim() &&
      !formData.sleepStatus.trim() &&
      !formData.breakfast.trim() &&
      !formData.lunch.trim() &&
      !formData.snack.trim() &&
      !formData.dinner.trim() &&
      !formData.hydration.trim() &&
      !formData.urine.trim() &&
      !formData.stool.trim() &&
      !formData.diaperChanges.trim() &&
      !formData.bath.trim() &&
      !formData.bathPlace.trim() &&
      !formData.skinCare.trim() &&
      !formData.mood.trim() &&
      !formData.medicationNote.trim() &&
      !formData.activityLegs &&
      !formData.activitySun &&
      !formData.activityTv &&
      !hasCheckedMedication
    ) {
      window.alert('Adicione pelo menos uma observação, sinal vital ou medicação para registrar a evolução.');
      return;
    }

    const notes = buildEvolutionNotes({
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

  const shareGroupToWhatsapp = (group) => {
    const periodLabel = group.period === 'diurno' ? '☀️ Diurno' : '🌙 Noturno';

    let text = `📝 *EVOLUÇÃO DO DIÁRIO*\n`;
    text += `📅 Data: ${formatLogDate(group.date)}\n`;
    text += `⏰ Turno: ${periodLabel}\n`;
    text += `🩺 Em plantão: ${group.responsibleName}\n\n`;

    group.entries.forEach((entry) => {
      text += `🕒 ${formatLogTime(entry)} - ${entry.author}: ${buildEntrySummary(entry)}\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      setCopiedGroupKey(group.key);
      setTimeout(() => setCopiedGroupKey(null), 3000);
    });
  };

  return (
    <div className="animate-fade">
      <div className="card" style={{ marginBottom: '16px' }}>
        <h3 className="card-title">
          <Activity size={20} />
          <span>Diário de Evolução</span>
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 0 }}>
          Cada plantão reúne as evoluções em um único card. Dentro dele, as mensagens aparecem em ordem cronológica, da mais antiga para a mais recente.
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
            <TextInput label="Sinais de alerta" value={formData.alertSigns} onChange={(value) => updateField('alertSigns', value)} placeholder="Tosse, febre, sonolência..." />
            <TextInput label="Medicação / ação feita" value={formData.medicationNote} onChange={(value) => updateField('medicationNote', value)} placeholder="Ex: captopril 25mg" />
          </div>

          <SectionTitle label="Sono e alimentação" />
          <div className="form-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            <SelectInput
              label="Sono"
              value={formData.sleepStatus}
              onChange={(value) => updateField('sleepStatus', value)}
              options={['Dormiu bem', 'Acordou algumas vezes', 'Insônia', 'Sonolenta']}
            />
            <TextInput label="Café da manhã" value={formData.breakfast} onChange={(value) => updateField('breakfast', value)} placeholder="Horário / aceitação" />
            <TextInput label="Almoço" value={formData.lunch} onChange={(value) => updateField('lunch', value)} placeholder="Horário / aceitação" />
            <TextInput label="Lanche" value={formData.snack} onChange={(value) => updateField('snack', value)} placeholder="Horário / aceitação" />
            <TextInput label="Jantar / ceia" value={formData.dinner} onChange={(value) => updateField('dinner', value)} placeholder="Horário / aceitação" />
          </div>

          <SectionTitle label="Hidratação e fisiologia" />
          <div className="form-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            <TextInput label="Hidratação" value={formData.hydration} onChange={(value) => updateField('hydration', value)} placeholder="Água, suco, quantidade..." />
            <SelectInput
              label="Urina"
              value={formData.urine}
              onChange={(value) => updateField('urine', value)}
              options={['Normal', 'Pouca', 'Escura / odor forte']}
            />
            <TextInput label="Fezes" value={formData.stool} onChange={(value) => updateField('stool', value)} placeholder="Sim/não, aspecto" />
            <TextInput label="Trocas de fralda" value={formData.diaperChanges} onChange={(value) => updateField('diaperChanges', value)} placeholder="Horários" />
          </div>

          <SectionTitle label="Higiene e bem-estar" />
          <div className="form-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            <SelectInput
              label="Banho"
              value={formData.bath}
              onChange={(value) => updateField('bath', value)}
              options={['Sim', 'Não']}
            />
            <SelectInput
              label="Local do banho"
              value={formData.bathPlace}
              onChange={(value) => updateField('bathPlace', value)}
              options={['Leito', 'Chuveiro']}
            />
            <SelectInput
              label="Pele / hidratação"
              value={formData.skinCare}
              onChange={(value) => updateField('skinCare', value)}
              options={['Sim', 'Não']}
            />
            <SelectInput
              label="Humor"
              value={formData.mood}
              onChange={(value) => updateField('mood', value)}
              options={['Calma', 'Agitada', 'Alegre', 'Triste', 'Confusa']}
            />
          </div>

          <div className="checkbox-group" style={{ flexWrap: 'wrap', marginBottom: '12px' }}>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.activityLegs}
                onChange={(e) => updateField('activityLegs', e.target.checked)}
                className="checkbox-input"
              />
              <span>Sentou / Andou</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.activitySun}
                onChange={(e) => updateField('activitySun', e.target.checked)}
                className="checkbox-input"
              />
              <span>Tomou sol</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.activityTv}
                onChange={(e) => updateField('activityTv', e.target.checked)}
                className="checkbox-input"
              />
              <span>Assistiu TV</span>
            </label>
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
        <span>Histórico de plantões</span>
      </h3>

      {groupedLogs.length === 0 ? (
        <div className="card empty-state">
          Nenhuma evolução registrada ainda.
        </div>
      ) : (
        groupedLogs.map((group) => (
          <div
            key={group.key}
            className="log-item animate-fade"
            style={{ borderLeftColor: getMemberColor(group.responsibleName) }}
          >
            <div className="log-meta" style={{ alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
              <span className="log-author" style={{ color: getMemberColor(group.responsibleName) }}>
                {getMemberAvatar(group.responsibleName)} {group.responsibleName}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={12} />
                {formatLogDate(group.date)} - {group.period === 'diurno' ? '☀️ Dia' : '🌙 Noite'}
              </span>
            </div>

            <div style={{ fontSize: '0.9rem', marginBottom: '10px' }}>
              Em plantão: <strong>{group.responsibleName}</strong>
            </div>

            <div className="log-checklists">
              <span className={`log-badge ${group.entries.some((entry) => entry.meds_given) ? 'log-badge-done' : 'log-badge-pending'}`}>
                {group.entries.some((entry) => entry.meds_given) ? <Check size={12} /> : <Clock3 size={12} />}
                {group.entries.length} {group.entries.length === 1 ? 'evolução registrada' : 'evoluções registradas'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              {group.entries.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '72px 1fr',
                    gap: '10px',
                    alignItems: 'start',
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: '8px',
                    padding: '10px'
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem' }}>
                    {formatLogTime(entry)}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                      {buildEntrySummary(entry)}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Registrado por <strong style={{ color: 'var(--text-primary)' }}>{entry.author}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => shareGroupToWhatsapp(group)}
                style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', gap: '6px', alignItems: 'center' }}
              >
                {copiedGroupKey === group.key ? (
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
        ))
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
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
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
  const activities = [
    data.activityLegs ? 'Sentou / Andou' : '',
    data.activitySun ? 'Tomou sol' : '',
    data.activityTv ? 'Assistiu TV' : ''
  ].filter(Boolean);

  const lines = [
    `Tipo: ${data.eventType}`,
    `Horário do registro: ${data.entryTime}`,
    formatMedicationGroup(data.medications, data.checkedMeds),
    data.pressure ? `Pressão arterial: ${data.pressure}` : '',
    data.temperature ? `Temperatura: ${data.temperature}` : '',
    data.alertSigns ? `Sinais de alerta: ${data.alertSigns}` : '',
    data.sleepStatus ? `Sono: ${data.sleepStatus}` : '',
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
      formatItem('Trocas de fralda', data.diaperChanges)
    ]),
    formatGroup('Higiene e bem-estar', [
      formatItem('Banho', data.bath),
      formatItem('Local do banho', data.bathPlace),
      formatItem('Pele / hidratação', data.skinCare),
      formatItem('Humor', data.mood)
    ]),
    activities.length > 0 ? `Atividades: ${activities.join(' | ')}` : '',
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

function formatGroup(title, items) {
  const content = items.filter(Boolean);
  return content.length > 0 ? `${title}: ${content.join(' | ')}` : '';
}

function formatItem(label, value) {
  return value ? `${label}: ${value}` : '';
}

function buildGroupedLogs(logs) {
  const sortedEntries = Object.values(logs).sort((a, b) => {
    const dateA = new Date(a.created_at || `${a.date}T00:00:00`);
    const dateB = new Date(b.created_at || `${b.date}T00:00:00`);
    return dateA - dateB;
  });

  const grouped = sortedEntries.reduce((acc, entry) => {
    const responsibleName = entry.caregiver || entry.author || 'Sem responsável';
    const key = `${entry.date}_${entry.period}_${responsibleName}`;

    if (!acc[key]) {
      acc[key] = {
        key,
        date: entry.date,
        period: entry.period,
        responsibleName,
        entries: []
      };
    }

    acc[key].entries.push(entry);
    return acc;
  }, {});

  return Object.values(grouped).sort((a, b) => {
    const lastEntryA = a.entries[a.entries.length - 1];
    const lastEntryB = b.entries[b.entries.length - 1];
    const dateA = new Date(lastEntryA.created_at || `${lastEntryA.date}T00:00:00`);
    const dateB = new Date(lastEntryB.created_at || `${lastEntryB.date}T00:00:00`);
    return dateB - dateA;
  });
}

function buildEntrySummary(log) {
  const lines = String(log.notes || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('Horário do registro:'));

  const normalized = lines.map((line) => {
    if (line === 'Tipo: Evolução geral') return '';
    if (line.startsWith('Evolução: ')) return line.replace('Evolução: ', '');
    return line;
  }).filter(Boolean);

  return normalized.join(' • ');
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
