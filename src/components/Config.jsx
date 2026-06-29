import React, { useState, useEffect } from 'react';
import {
  CAREGIVER_STYLE,
  getCaregivers,
  addCaregiver,
  deleteCaregiver
} from '../utils/db';
import {
  Users,
  Plus,
  Trash2
} from 'lucide-react';

export default function Config({ onConfigChanged }) {
  const [caregivers, setCaregivers] = useState([]);
  const [newCaregiverName, setNewCaregiverName] = useState('');
  const [caregiverTrigger, setCaregiverTrigger] = useState(0);

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

  const handleAddCaregiver = async (e) => {
    e.preventDefault();
    if (!newCaregiverName.trim()) return;

    try {
      await addCaregiver(newCaregiverName.trim());
      setNewCaregiverName('');
      setCaregiverTrigger(prev => prev + 1);
      if (onConfigChanged) onConfigChanged();
    } catch (e) {
      console.error('Erro ao adicionar cuidadora:', e);
      alert('Não foi possível adicionar a cuidadora.');
    }
  };

  const handleDeleteCaregiver = async (id, name) => {
    if (!window.confirm(`Tem certeza de que deseja remover a cuidadora "${name}"?`)) {
      return;
    }

    try {
      await deleteCaregiver(id);
      setCaregiverTrigger(prev => prev + 1);
      if (onConfigChanged) onConfigChanged();
    } catch (e) {
      console.error('Erro ao remover cuidadora:', e);
      alert('Não foi possível remover a cuidadora.');
    }
  };

  return (
    <div className="animate-fade">
      <div className="card">
        <h3 className="card-title">
          <Users size={20} />
          <span>Cuidadoras</span>
        </h3>

        <form onSubmit={handleAddCaregiver} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            type="text"
            value={newCaregiverName}
            onChange={(e) => setNewCaregiverName(e.target.value)}
            placeholder="Nome da cuidadora"
            className="form-control"
            style={{ flex: 1 }}
            required
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '10px 14px' }}>
            <Plus size={18} />
            <span>Adicionar</span>
          </button>
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
                  <span>{item.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteCaregiver(item.id, item.name)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-danger)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
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
