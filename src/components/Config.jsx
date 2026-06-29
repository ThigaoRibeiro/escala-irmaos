import React, { useState, useEffect } from 'react';
import { 
  getSupabaseConfig, 
  saveSupabaseConfig, 
  clearSupabaseConfig, 
  SUPABASE_SQL_SETUP,
  resetSupabaseClient,
  getSupabaseClient,
  getCaregivers,
  addCaregiver,
  deleteCaregiver
} from '../utils/db';
import { 
  Settings, 
  Database, 
  Clipboard, 
  Check, 
  HelpCircle,
  Users,
  Plus,
  Trash2
} from 'lucide-react';

export default function Config({ onConfigChanged }) {
  // Configs Banco
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Cuidadoras
  const [caregivers, setCaregivers] = useState([]);
  const [newCaregiverName, setNewCaregiverName] = useState('');
  const [caregiverTrigger, setCaregiverTrigger] = useState(0);

  useEffect(() => {
    const config = getSupabaseConfig();
    setUrl(config.url || '');
    setKey(config.key || '');
    
    const client = getSupabaseClient();
    setIsConnected(!!client);
  }, []);

  // Recarrega cuidadoras quando o gatilho muda
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

  const handleSave = (e) => {
    e.preventDefault();
    if (!url.trim() || !key.trim()) {
      alert('Por favor, preencha os dois campos.');
      return;
    }
    
    saveSupabaseConfig(url.trim(), key.trim());
    resetSupabaseClient();
    
    const client = getSupabaseClient();
    setIsConnected(!!client);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
    setCaregiverTrigger(prev => prev + 1);
    
    if (onConfigChanged) onConfigChanged();
  };

  const handleClear = () => {
    if (window.confirm('Deseja realmente voltar para o Modo Local? Os dados salvos online não estarão visíveis.')) {
      clearSupabaseConfig();
      resetSupabaseClient();
      setUrl('');
      setKey('');
      setIsConnected(false);
      setCaregiverTrigger(prev => prev + 1);
      if (onConfigChanged) onConfigChanged();
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SETUP).then(() => {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    });
  };

  const handleAddCaregiver = async (e) => {
    e.preventDefault();
    if (!newCaregiverName.trim()) return;
    
    try {
      await addCaregiver(newCaregiverName.trim());
      setNewCaregiverName('');
      setCaregiverTrigger(prev => prev + 1);
      if (onConfigChanged) onConfigChanged(); // Notifica App.jsx para recarregar
    } catch (e) {
      console.error('Erro ao adicionar cuidadora:', e);
      alert('Não foi possível adicionar. Confira as permissões no Supabase.');
    }
  };

  const handleDeleteCaregiver = async (id, name) => {
    if (window.confirm(`Tem certeza de que deseja remover a cuidadora "${name}"?`)) {
      try {
        await deleteCaregiver(id);
        setCaregiverTrigger(prev => prev + 1);
        if (onConfigChanged) onConfigChanged(); // Notifica App.jsx para recarregar
      } catch (e) {
        console.error('Erro ao remover cuidadora:', e);
        alert('Não foi possível remover. Confira as permissões no Supabase.');
      }
    }
  };

  return (
    <div className="animate-fade">
      {/* Banner de Status de Conexão */}
      <div 
        className="card" 
        style={{ 
          borderLeft: isConnected ? '4px solid var(--color-success)' : '4px solid var(--color-warning)',
          backgroundColor: isConnected ? 'var(--color-success-light)' : 'var(--color-warning-light)'
        }}
      >
        <h4 style={{ 
          color: isConnected ? 'var(--color-success)' : 'var(--color-warning)', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          fontWeight: 600
        }}>
          <Database size={18} />
          <span>Status do Banco de Dados</span>
        </h4>
        <p style={{ fontSize: '0.9rem', marginTop: '6px' }}>
          {isConnected ? (
            <span>Conectado ao Supabase em tempo real! Os dados estão na nuvem e compartilhados com todos.</span>
          ) : (
            <span>Modo Demonstração (Local). As alterações estão sendo salvas apenas no navegador deste celular.</span>
          )}
        </p>
      </div>

      {/* PAINEL DE GERENCIAMENTO DE CUIDADORAS */}
      <div className="card">
        <h3 className="card-title">
          <Users size={20} />
          <span>Gerenciar Cuidadoras</span>
        </h3>
        
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Adicione, remova ou edite os nomes das cuidadoras profissionais que aparecem nas opções de escala.
        </p>

        {/* Form para Adicionar */}
        <form onSubmit={handleAddCaregiver} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input 
            type="text"
            value={newCaregiverName}
            onChange={(e) => setNewCaregiverName(e.target.value)}
            placeholder="Nome da cuidadora (ex: Paula)"
            className="form-control"
            style={{ flex: 1 }}
            required
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '10px 14px' }}>
            <Plus size={18} />
            <span>Adicionar</span>
          </button>
        </form>

        {/* Lista de Cuidadoras */}
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
                  <span style={{ fontSize: '1.2rem' }}>👩‍❤️‍🩹</span>
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

      {/* CONFIGURAÇÃO SUPABASE */}
      <form onSubmit={handleSave} className="card">
        <h3 className="card-title">
          <Settings size={20} />
          <span>Conexão Supabase</span>
        </h3>
        
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Insira a URL e a chave publishable/anon do projeto Supabase para sincronizar a escala entre celulares e computadores.
        </p>

        <div className="form-group">
          <label className="form-label">Supabase Project URL:</label>
          <input 
            type="url" 
            value={url} 
            onChange={(e) => setUrl(e.target.value)} 
            placeholder="https://xxxxxx.supabase.co" 
            className="form-control"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Supabase Publishable / Anon Key:</label>
          <input 
            type="password" 
            value={key} 
            onChange={(e) => setKey(e.target.value)} 
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." 
            className="form-control"
            required
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
            {isSaved ? 'Configurações Salvas!' : 'Salvar e Conectar'}
          </button>
          
          {isConnected && (
            <button type="button" className="btn btn-danger" onClick={handleClear}>
              Voltar ao Modo Local
            </button>
          )}
        </div>
      </form>

      {/* SQL TUTORIAL */}
      <div className="card">
        <h3 className="card-title" style={{ color: 'var(--primary)' }}>
          <HelpCircle size={20} />
          <span>Script SQL de Instalação</span>
        </h3>
        
        <ol style={{ paddingLeft: '16px', fontSize: '0.85rem', lineHeight: '1.5', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li>Acesse <a href="https://supabase.com" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 600 }}>supabase.com</a>.</li>
          <li>Vá em <strong>SQL Editor</strong> &gt; <strong>New Query</strong>, cole o código SQL abaixo e clique em <strong>Run</strong>.</li>
          <li>Copie a <strong>Project URL</strong> e a chave <strong>Publishable/anon</strong> em <strong>Settings</strong> &gt; <strong>API</strong> e cole nos campos acima.</li>
        </ol>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Código SQL:</span>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm" 
            onClick={handleCopySql}
            style={{ fontSize: '0.75rem', padding: '4px 8px' }}
          >
            {copiedSql ? (
              <>
                <Check size={12} style={{ color: 'var(--color-success)' }} />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Clipboard size={12} />
                <span>Copiar SQL</span>
              </>
            )}
          </button>
        </div>

        <div className="sql-block">
          {SUPABASE_SQL_SETUP}
        </div>
      </div>
    </div>
  );
}
