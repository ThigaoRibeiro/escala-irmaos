import React, { useState } from 'react';
import { X, Sparkles, Pill } from 'lucide-react';
import { ITENS_SUGERIDOS, criarItensSugeridosDaAgenda } from '../domain/catalogoSugerido.js';

export default function EstoqueSugeridosModal({
  produtosExistentes = [],
  medications = [],
  onAdicionarLote,
  onFechar
}) {
  const [abaAtiva, setAbaAtiva] = useState('casa'); // 'casa' ou 'agenda'
  const [itensCasaSelecionados, setItensCasaSelecionados] = useState(
    ITENS_SUGERIDOS.map((_, i) => i) // todos selecionados por padrão
  );

  const itensAgenda = criarItensSugeridosDaAgenda(medications, produtosExistentes);
  const [itensAgendaSelecionados, setItensAgendaSelecionados] = useState(
    itensAgenda.map((_, i) => i)
  );

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const toggleItemCasa = (index) => {
    setItensCasaSelecionados(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const toggleItemAgenda = (index) => {
    setItensAgendaSelecionados(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleSalvar = async () => {
    try {
      setSalvando(true);
      setErro('');

      let selecionados = [];
      if (abaAtiva === 'casa') {
        selecionados = itensCasaSelecionados.map(i => ITENS_SUGERIDOS[i]);
      } else {
        selecionados = itensAgendaSelecionados.map(i => itensAgenda[i]);
      }

      if (selecionados.length === 0) {
        setErro('Selecione pelo menos um item para cadastrar.');
        setSalvando(false);
        return;
      }

      await onAdicionarLote(selecionados);
      onFechar();
    } catch (err) {
      setErro(err.message || 'Erro ao cadastrar itens sugeridos.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="est-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="sugeridos-modal-title">
      <div className="est-modal" style={{ maxWidth: 540 }}>
        <div className="est-modal-header">
          <h2 id="sugeridos-modal-title" className="est-modal-title">
            Adicionar itens sugeridos
          </h2>
          <button
            type="button"
            className="est-btn est-btn-outline"
            style={{ minHeight: 36, minWidth: 36, padding: 0 }}
            onClick={onFechar}
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="est-modal-body">
          {erro && (
            <div className="est-banner est-banner-error" role="alert">
              {erro}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
            <button
              type="button"
              className={`est-btn ${abaAtiva === 'casa' ? 'est-btn-primary' : 'est-btn-outline'}`}
              style={{ flex: 1 }}
              onClick={() => setAbaAtiva('casa')}
            >
              <Sparkles size={16} />
              <span>Itens da casa ({ITENS_SUGERIDOS.length})</span>
            </button>
            <button
              type="button"
              className={`est-btn ${abaAtiva === 'agenda' ? 'est-btn-primary' : 'est-btn-outline'}`}
              style={{ flex: 1 }}
              onClick={() => setAbaAtiva('agenda')}
            >
              <Pill size={16} />
              <span>Da agenda de remédios ({itensAgenda.length})</span>
            </button>
          </div>

          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Os itens cadastrados começam em situação ⚪ (sem conferência). Faça a primeira conferência física para iniciar o acompanhamento.
          </p>

          <div style={{ maxHeight: '45vh', overflowY: 'auto' }}>
            {abaAtiva === 'casa' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ITENS_SUGERIDOS.map((item, idx) => {
                  const marcado = itensCasaSelecionados.includes(idx);
                  return (
                    <label
                      key={item.nome}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        backgroundColor: marcado ? 'var(--primary-light)' : 'transparent'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={() => toggleItemCasa(idx)}
                        />
                        <div>
                          <strong style={{ fontSize: '0.875rem' }}>{item.nome}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {item.embalagem_nome} com {item.embalagem_quantidade} {item.unidade_base}
                          </div>
                        </div>
                      </div>
                      <span className="est-tag est-tag-aviso" style={{ fontSize: '0.7rem' }}>
                        {item.categoria}
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div>
                {itensAgenda.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                    Todos os medicamentos da agenda já estão cadastrados no estoque ou a agenda está vazia.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {itensAgenda.map((item, idx) => {
                      const marcado = itensAgendaSelecionados.includes(idx);
                      return (
                        <label
                          key={item.nome}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            backgroundColor: marcado ? 'var(--primary-light)' : 'transparent'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input
                              type="checkbox"
                              checked={marcado}
                              onChange={() => toggleItemAgenda(idx)}
                            />
                            <div>
                              <strong style={{ fontSize: '0.875rem' }}>{item.nome}</strong>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {item.medicamento_ids.length} horário{item.medicamento_ids.length > 1 ? 's' : ''} pré-vinculado(s)
                              </div>
                            </div>
                          </div>
                          <span className="est-tag est-tag-receita" style={{ fontSize: '0.7rem' }}>
                            Remédio
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="est-modal-footer">
            <button
              type="button"
              className="est-btn est-btn-secondary"
              onClick={onFechar}
              disabled={salvando}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="est-btn est-btn-primary"
              onClick={handleSalvar}
              disabled={salvando}
            >
              <Sparkles size={16} />
              <span>{salvando ? 'Cadastrando...' : 'Adicionar selecionados'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
