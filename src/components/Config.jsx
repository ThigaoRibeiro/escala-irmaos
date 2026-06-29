import React, { useState, useEffect } from 'react';
import { 
  getSupabaseConfig, 
  saveSupabaseConfig, 
  clearSupabaseConfig, 
  SUPABASE_SQL_SETUP,
  resetSupabaseClient,
  getSupabaseClient
} from '../utils/db';
import { 
  Settings, 
  Database, 
  Clipboard, 
  Check, 
  AlertCircle,
  HelpCircle,
  Link2
} from 'lucide-react';

export default function Config({ onConfigChanged }) {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    const config = getSupabaseConfig();
    setUrl(config.url || '');
    setKey(config.key || '');
    
    const client = getSupabaseClient();
    setIsConnected(!!client);
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    if (!url.trim() || !key.trim()) {
      alert('Por favor, preencha os dois campos.');
      return;
    }
    
    saveSupabaseConfig(url.trim(), key.trim());
    resetSupabaseClient();
    
    // Testa se o cliente foi inicializado com sucesso
    const client = getSupabaseClient();
    setIsConnected(!!client);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
    
    if (onConfigChanged) onConfigChanged();
  };

  const handleClear = () => {
    if (window.confirm('Deseja realmente voltar para o Modo Local? Os dados salvos online não estarão visíveis.')) {
      clearSupabaseConfig();
      resetSupabaseClient();
      setUrl('');
      setKey('');
      setIsConnected(false);
      if (onConfigChanged) onConfigChanged();
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SETUP).then(() => {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    });
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
            <span>Conectado ao Supabase em tempo real! Os dados estão sendo salvos na nuvem e compartilhados com todos.</span>
          ) : (
            <span>Modo Demonstração (Local). As alterações estão sendo salvas apenas no navegador deste celular.</span>
          )}
        </p>
      </div>

      {/* Formulário de Configuração */}
      <form onSubmit={handleSave} className="card">
        <h3 className="card-title">
          <Settings size={20} />
          <span>Configuração de Conexão</span>
        </h3>
        
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Conecte o aplicativo ao seu banco de dados Supabase para que as escalas e diários sejam sincronizados nos aparelhos de todos os irmãos.
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
          <label className="form-label">Supabase Anon Key:</label>
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
              Desconectar
            </button>
          )}
        </div>
      </form>

      {/* Tutorial Supabase SQL */}
      <div className="card">
        <h3 className="card-title" style={{ color: 'var(--primary)' }}>
          <HelpCircle size={20} />
          <span>Como criar o Banco de Dados?</span>
        </h3>
        
        <ol style={{ paddingLeft: '16px', fontSize: '0.85rem', lineHeight: '1.5', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li>Acesse <a href="https://supabase.com" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 600 }}>supabase.com</a> e crie uma conta gratuita.</li>
          <li>Crie um novo projeto (guarde a senha do banco se desejar, mas não será usada aqui).</li>
          <li>No painel lateral esquerdo, clique no ícone **SQL Editor** (um ícone de terminal com <code>&gt;_</code>).</li>
          <li>Clique em **New Query**, cole o código SQL abaixo e clique no botão **Run** no canto inferior direito.</li>
          <li>Vá em **Project Settings** (ícone de engrenagem) &gt; **API**, e copie a **Project URL** e a **API anon key** para colar no formulário acima. Pronto!</li>
        </ol>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Código SQL Necessário:</span>
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
