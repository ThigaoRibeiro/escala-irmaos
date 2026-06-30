import React, { useState, useEffect } from 'react';
import {
  CAREGIVER_STYLE,
  getCaregivers,
  addCaregiver,
  deleteCaregiver,
  getMedications,
  addMedication,
  deleteMedication
} from '../utils/db';
import {
  Users,
  Plus,
  Trash2,
  Pill
} from 'lucide-react';

export default function Config({ onConfigChanged }) {
  const [caregivers, setCaregivers] = useState([]);
  const [newCaregiverName, setNewCaregiverName] = useState('');
  const [newCaregiverEmail, setNewCaregiverEmail] = useState('');
  const [newCaregiverPassword, setNewCaregiverPassword] = useState('');
  const [caregiverSuccess, setCaregiverSuccess] = useState('');
  const [caregiverError, setCaregiverError] = useState('');
  const [caregiverTrigger, setCaregiverTrigger] = useState(0);

  const [medications, setMedications] = useState([]);
  const [medTime, setMedTime] = useState('');
  const [medName, setMedName] = useState('');
  const [medDose, setMedDose] = useState('');
  const [medNote, setMedNote] = useState('');
  const [medicationTrigger, setMedicationTrigger] = useState(0);

  useEffect(() => {
    async function loadCaregivers() {
      try {
        const list = await getCaregivers();
        setCaregivers(list);
      } catch (e) {
        console.error('Erro ao carregar cuidadoras:', e);
        setCaregivers([]);
      }
    }
    loadCaregivers();
  }, [caregiverTrigger]);

  useEffect(() => {
    async function loadMedications() {
      try {
        const list = await getMedications();
        setMedications(list);
      } catch (e) {
        console.error('Erro ao carregar medicamentos:', e);
        setMedications([]);
      }
    }
    loadMedications();
  }, [medicationTrigger]);

  const handleAddCaregiver = async (e) => {
    e.preventDefault();
    if (!newCaregiverName.trim() || !newCaregiverPassword.trim()) return;

    try {
      setCaregiverError('');
      const initialPassword = newCaregiverPassword.trim();
      const createdCaregiver = await addCaregiver(newCaregiverName.trim(), newCaregiverEmail.trim(), initialPassword);
      setCaregiverSuccess(`Acesso criado para ${createdCaregiver.name}. Login: ${createdCaregiver.email} | Senha inicial: ${initialPassword}`);
      setNewCaregiverName('');
      setNewCaregiverEmail('');
      setNewCaregiverPassword('');
      setCaregiverTrigger(prev => prev + 1);
      if (onConfigChanged) onConfigChanged();
    } catch (e) {
      console.error('Erro ao adicionar cuidadora:', e);
      setCaregiverSuccess('');
      setCaregiverError(e.message || 'Não foi possível adicionar a cuidadora.');
    }
  };

  const handleDeleteCaregiver = async (id, name) => {
    if (!window.confirm(`Tem certeza de que deseja remover a cuidadora "${name}"?`)) return;

    try {
      setCaregiverError('');
      await deleteCaregiver(id);
      setCaregiverSuccess(`A cuidadora ${name} foi removida e perdeu o acesso ao app.`);
      setCaregiverTrigger(prev => prev + 1);
      if (onConfigChanged) onConfigChanged();
    } catch (e) {
      console.error('Erro ao remover cuidadora:', e);
      setCaregiverSuccess('');
      setCaregiverError(e.message || 'Não foi possível remover a cuidadora.');
    }
  };

  const handleAddMedication = async (e) => {
    e.preventDefault();
    if (!medTime || !medName.trim() || !medDose.trim()) return;
    try {
      await addMedication(medTime, medName.trim(), medDose.trim(), medNote.trim());
      setMedTime('');
      setMedName('');
      setMedDose('');
      setMedNote('');
      setMedicationTrigger(prev => prev + 1);
      if (onConfigChanged) onConfigChanged();
    } catch (e) {
      console.error('Erro ao adicionar medicamento:', e);
      alert('Não foi possível adicionar o medicamento.');
    }
  };

  const handleDeleteMedication = async (id, name) => {
    if (!window.confirm(`Remover "${name}" da lista de medicamentos?`)) return;
    try {
      await deleteMedication(id);
      setMedicationTrigger(prev => prev + 1);
      if (onConfigChanged) onConfigChanged();
    } catch (e) {
      console.error('Erro ao remover medicamento:', e);
      alert('Não foi possível remover o medicamento.');
    }
  };

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      <div className="card">
        <h3 className="card-title">
          <Pill size={20} />
          <span>Medicamentos</span>
        </h3>

        <form onSubmit={handleAddMedication} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 90px', gap: '8px' }}>
            <input
              type="time"
              value={medTime}
              onChange={(e) => setMedTime(e.target.value)}
              className="form-control"
              required
              placeholder="Horário"
            />
            <input
              type="text"
              value={medName}
              onChange={(e) => setMedName(e.target.value)}
              placeholder="Nome do medicamento"
              className="form-control"
              required
            />
            <input
              type="text"
              value={medDose}
              onChange={(e) => setMedDose(e.target.value)}
              placeholder="Dose"
              className="form-control"
              required
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={medNote}
              onChange={(e) => setMedNote(e.target.value)}
              placeholder="Observação (ex: macerado com iogurte)"
              className="form-control"
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
              <Plus size={18} />
              <span>Adicionar</span>
            </button>
          </div>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {medications.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '8px' }}>
              Nenhum medicamento cadastrado.
            </p>
          ) : (
            medications.map(med => (
              <div
                key={med.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', minWidth: '42px' }}>{med.time}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{med.name} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>({med.dose})</span></div>
                    {med.note && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{med.note}</div>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteMedication(med.id, med.name)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                  title="Remover medicamento"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">
          <Users size={20} />
          <span>Cuidadoras</span>
        </h3>

        {caregiverError && (
          <div className="info-banner" style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)', backgroundColor: '#fef2f2', marginBottom: '16px' }}>
            {caregiverError}
          </div>
        )}

        {caregiverSuccess && (
          <div className="info-banner" style={{ borderColor: 'var(--color-success)', color: 'var(--color-success)', backgroundColor: 'var(--color-success-light)', marginBottom: '16px' }}>
            {caregiverSuccess}
          </div>
        )}

        <form onSubmit={handleAddCaregiver} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
            O login da cuidadora é criado no Supabase com o padrão `nome@lessacare.com`. A senha inicial só aparece aqui no momento do cadastro.
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={newCaregiverName}
              onChange={(e) => {
                const val = e.target.value;
                setNewCaregiverName(val);
                if (val) {
                  const generatedEmail = val
                    .trim()
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/\s+/g, '') + '@lessacare.com';
                  setNewCaregiverEmail(generatedEmail);
                } else {
                  setNewCaregiverEmail('');
                }
              }}
              placeholder="Nome da cuidadora"
              className="form-control"
              style={{ flex: '1 1 150px' }}
              required
            />
            <input
              type="text"
              value={newCaregiverEmail}
              onChange={(e) => setNewCaregiverEmail(e.target.value)}
              placeholder="Usuário / E-mail de acesso"
              className="form-control"
              style={{ flex: '1 1 180px' }}
              required
            />
            <input
              type="password"
              value={newCaregiverPassword}
              onChange={(e) => setNewCaregiverPassword(e.target.value)}
              placeholder="Senha inicial"
              className="form-control"
              style={{ flex: '1 1 120px' }}
              required
              minLength={6}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '10px 14px', flex: '0 0 auto' }}>
              <Plus size={18} />
              <span>Adicionar</span>
            </button>
          </div>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {caregivers.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '8px' }}>
              Nenhuma cuidadora cadastrada.
            </p>
          ) : (
            caregivers.map(item => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
                  <span style={{ fontSize: '1.2rem' }}>{CAREGIVER_STYLE.avatar}</span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{item.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Login: <strong style={{ color: 'var(--text-primary)' }}>{item.email || '—'}</strong>
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteCaregiver(item.id, item.name)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                  title="Excluir cuidadora"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
