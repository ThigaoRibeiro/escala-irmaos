import React, { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { embalagensParaUnidades, formatarNumeroPtBr, FRACAO_EMBALAGEM_ABERTA } from '../domain/conversoes.js';

export default function EstoqueConferenciaModal({
  produto,
  onConfirmar,
  onFechar
}) {
  const [embalagens, setEmbalagens] = useState('');
  const [soltas, setSoltas] = useState('');
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const isMl = produto.unidade_base?.toLowerCase() === 'ml';
  const eq = Number(produto.embalagem_quantidade) || 1;

  const totalBase = embalagensParaUnidades(embalagens, soltas, eq);

  const handleAplicarFracao = (fracao) => {
    const qtdMl = Math.round(fracao * eq);
    setSoltas(String(qtdMl));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (totalBase < 0) {
      setErro('A quantidade total não pode ser negativa.');
      return;
    }

    try {
      setSalvando(true);
      setErro('');
      await onConfirmar(produto.id, totalBase, observacao);
      onFechar();
    } catch (err) {
      setErro(err.message || 'Erro ao registrar conferência.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="est-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="conferencia-modal-title">
      <div className="est-modal">
        <div className="est-modal-header">
          <h2 id="conferencia-modal-title" className="est-modal-title">
            Conferir {produto.nome}
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

        <form onSubmit={handleSubmit} className="est-modal-body">
          {erro && (
            <div className="est-banner est-banner-error" role="alert">
              {erro}
            </div>
          )}

          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Conte o que está fisicamente na casa da mãe. Cada {produto.embalagem_nome} contém {formatarNumeroPtBr(eq)} {produto.unidade_base}.
          </p>

          <div className="est-form-group">
            <label className="est-label">
              {produto.embalagem_nome ? `${produto.embalagem_nome.charAt(0).toUpperCase() + produto.embalagem_nome.slice(1)}s fechados:` : 'Embalagens fechadas:'}
            </label>
            <input
              type="number"
              min="0"
              step="1"
              className="est-input"
              placeholder="0"
              value={embalagens}
              onChange={(e) => setEmbalagens(e.target.value)}
              autoFocus
            />
          </div>

          <div className="est-form-group">
            <label className="est-label">
              {produto.unidade_base.charAt(0).toUpperCase() + produto.unidade_base.slice(1)}s soltos / abertos:
            </label>
            <input
              type="number"
              min="0"
              step="any"
              className="est-input"
              placeholder="0"
              value={soltas}
              onChange={(e) => setSoltas(e.target.value)}
            />
          </div>

          {isMl && eq > 1 && (
            <div className="est-form-group">
              <span className="est-help-text">Ajuda para frasco aberto:</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {FRACAO_EMBALAGEM_ABERTA.map((f) => (
                  <button
                    key={f.label}
                    type="button"
                    className="est-btn est-btn-outline"
                    style={{ fontSize: '0.75rem', padding: '0 8px', minHeight: 36 }}
                    onClick={() => handleAplicarFracao(f.valor)}
                  >
                    {f.label} (~{Math.round(f.valor * eq)} ml)
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{
            padding: '12px',
            backgroundColor: 'var(--primary-light)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>
              Total conferido na unidade base:
            </span>
            <strong style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>
              {formatarNumeroPtBr(totalBase)} {produto.unidade_base}
            </strong>
          </div>

          <div className="est-form-group">
            <label className="est-label">Observação (opcional):</label>
            <input
              type="text"
              className="est-input"
              placeholder="Ex: conferido na gaveta do armário"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
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
              type="submit"
              className="est-btn est-btn-primary"
              disabled={salvando}
            >
              <CheckCircle2 size={16} />
              <span>{salvando ? 'Salvando...' : 'Confirmar conferência'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
