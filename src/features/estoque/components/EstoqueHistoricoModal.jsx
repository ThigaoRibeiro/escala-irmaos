import React, { useState } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { formatarNumeroPtBr } from '../domain/conversoes.js';
import { formatarDataPtBr } from '../domain/saldo.js';
import { obterNomeUsuario } from '../domain/whatsapp.js';

export default function EstoqueHistoricoModal({
  produto,
  movimentos = [],
  userMapping,
  caregivers,
  onEstornar,
  onFechar
}) {
  const [estornandoId, setEstornandoId] = useState(null);
  const [motivoEstorno, setMotivoEstorno] = useState('');
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState('');

  // Identifica quais movimentos foram estornados
  const idsEstornados = new Set();
  for (const m of movimentos) {
    if (m.tipo === 'estorno' && m.estorna_movimento_id) {
      idsEstornados.add(m.estorna_movimento_id);
    }
  }

  // Ordena por data decrescente (mais recente primeiro)
  const movsOrdenados = [...movimentos].sort((a, b) => {
    return new Date(b.ocorrido_em).getTime() - new Date(a.ocorrido_em).getTime();
  });

  const handleConfirmarEstorno = async (movimentoId) => {
    if (!motivoEstorno.trim()) {
      setErro('O motivo da correção (estorno) é obrigatório.');
      return;
    }

    try {
      setProcessando(true);
      setErro('');
      await onEstornar(movimentoId, produto.id, motivoEstorno.trim());
      setEstornandoId(null);
      setMotivoEstorno('');
    } catch (err) {
      setErro(err.message || 'Erro ao realizar estorno.');
    } finally {
      setProcessando(false);
    }
  };

  const getTipoLabel = (tipo) => {
    switch (tipo) {
      case 'conferencia': return 'Conferência física';
      case 'entrada': return 'Entrada';
      case 'saida': return 'Saída';
      case 'estorno': return 'Estorno / Correção';
      default: return tipo;
    }
  };

  return (
    <div className="est-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="historico-modal-title">
      <div className="est-modal" style={{ maxWidth: 560 }}>
        <div className="est-modal-header">
          <h2 id="historico-modal-title" className="est-modal-title">
            Histórico: {produto.nome}
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

          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Registro auditável de conferências, compras e saídas. Nada é apagado; correções são registradas por estorno.
          </p>

          {movsOrdenados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
              Nenhuma movimentação registrada para este produto.
            </div>
          ) : (
            <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
              {movsOrdenados.map((m) => {
                const foiEstornado = idsEstornados.has(m.id);
                const isEstorno = m.tipo === 'estorno';
                const autor = obterNomeUsuario(m.registrado_por_email, userMapping, caregivers);
                const dataFormatada = formatarDataPtBr(m.ocorrido_em, true);

                return (
                  <div key={m.id} className="est-history-item" style={{ opacity: foiEstornado ? 0.6 : 1 }}>
                    <div className="est-history-top">
                      <strong style={{ textDecoration: foiEstornado ? 'line-through' : 'none' }}>
                        {getTipoLabel(m.tipo)}
                        {m.quantidade_base !== null && m.quantidade_base !== undefined && !isEstorno && (
                          <span>: {m.tipo === 'saida' ? '-' : '+'}{formatarNumeroPtBr(m.quantidade_base)} {produto.unidade_base}</span>
                        )}
                      </strong>

                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {dataFormatada}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                      Por {autor} • Origem: {m.origem}
                      {m.motivo && <span> • Motivo: {m.motivo}</span>}
                      {m.valor_pago && <span> • Valor: R$ {Number(m.valor_pago).toFixed(2).replace('.', ',')}</span>}
                      {m.local_compra && <span> • Local: {m.local_compra}</span>}
                    </div>

                    {m.observacao && (
                      <div style={{ fontSize: '0.8rem', fontStyle: 'italic', marginBottom: 4 }}>
                        "{m.observacao}"
                      </div>
                    )}

                    {foiEstornado && (
                      <span className="est-tag est-tag-aviso">
                        Estornado
                      </span>
                    )}

                    {isEstorno && (
                      <span className="est-tag est-tag-comprador">
                        Estorno
                      </span>
                    )}

                    {!foiEstornado && !isEstorno && (
                      <div style={{ marginTop: 6 }}>
                        {estornandoId === m.id ? (
                          <div style={{ marginTop: 6, padding: 8, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                            <div className="est-form-group">
                              <label className="est-label" style={{ fontSize: '0.75rem' }}>
                                Motivo obrigatório da correção / estorno:
                              </label>
                              <input
                                type="text"
                                className="est-input"
                                style={{ minHeight: 36, fontSize: '0.8rem' }}
                                placeholder="Ex: digitação errada da quantidade"
                                value={motivoEstorno}
                                onChange={(e) => setMotivoEstorno(e.target.value)}
                                autoFocus
                              />
                            </div>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 6 }}>
                              <button
                                type="button"
                                className="est-btn est-btn-secondary"
                                style={{ minHeight: 32, fontSize: '0.75rem' }}
                                onClick={() => {
                                  setEstornandoId(null);
                                  setMotivoEstorno('');
                                }}
                                disabled={processando}
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                className="est-btn est-btn-danger"
                                style={{ minHeight: 32, fontSize: '0.75rem' }}
                                onClick={() => handleConfirmarEstorno(m.id)}
                                disabled={processando}
                              >
                                {processando ? 'Estornando...' : 'Confirmar estorno'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="est-btn est-btn-outline"
                            style={{ minHeight: 30, fontSize: '0.75rem', padding: '0 8px' }}
                            onClick={() => {
                              setEstornandoId(m.id);
                              setMotivoEstorno('');
                            }}
                            title="Corrigir este movimento gerando um estorno"
                          >
                            <RotateCcw size={12} />
                            <span>Corrigir (estornar)</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="est-modal-footer">
            <button
              type="button"
              className="est-btn est-btn-secondary"
              onClick={onFechar}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
