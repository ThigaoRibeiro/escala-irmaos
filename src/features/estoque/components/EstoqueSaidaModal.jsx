import React, { useState } from 'react';
import { X, MinusCircle } from 'lucide-react';
import { formatarNumeroPtBr } from '../domain/conversoes.js';

export default function EstoqueSaidaModal({
  produto,
  saldoAtual,
  onConfirmarSaida,
  onFechar
}) {
  const isModoMinimo = produto.modo_consumo === 'minimo';
  const [motivo, setMotivo] = useState(isModoMinimo ? 'uso' : 'perda');
  const [quantidade, setQuantidade] = useState('');
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const qtdNum = Number(quantidade) || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (qtdNum <= 0) {
      setErro('A quantidade deve ser maior que zero.');
      return;
    }

    if (!isModoMinimo && motivo === 'uso') {
      setErro('Em produtos de uso contínuo (modo taxa), o uso diário é calculado automaticamente. Utilize "perda", "vencimento" ou faça uma nova conferência.');
      return;
    }

    try {
      setSalvando(true);
      setErro('');
      await onConfirmarSaida(produto.id, qtdNum, motivo, observacao);
      onFechar();
    } catch (err) {
      setErro(err.message || 'Erro ao registrar saída.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="est-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="saida-modal-title">
      <div className="est-modal">
        <div className="est-modal-header">
          <h2 id="saida-modal-title" className="est-modal-title">
            Registrar saída: {produto.nome}
          </h2>
          <button
            type="button"
            className="est-btn est-btn-outline"
            style={{ minHeight: 44, minWidth: 44, padding: 0 }}
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

          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Saldo atual: <strong>{formatarNumeroPtBr(saldoAtual)} {produto.unidade_base}</strong>
          </div>

          <div className="est-form-group">
            <label className="est-label">Motivo da saída:</label>
            <select
              className="est-select"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            >
              {isModoMinimo && <option value="uso">Uso / Consumo</option>}
              <option value="perda">Perda / Descarte acidental</option>
              <option value="vencimento">Vencimento do produto</option>
              <option value="outro">Outro motivo</option>
            </select>
            {!isModoMinimo && (
              <span className="est-help-text">
                * Em produtos de uso contínuo (taxa), o consumo diário já é descontado pela estimativa do sistema.
              </span>
            )}
          </div>

          <div className="est-form-group">
            <label className="est-label">
              Quantidade de {produto.unidade_base} a retirar:
            </label>
            <input
              type="number"
              min="0.01"
              step="any"
              className="est-input"
              placeholder="0"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="est-form-group">
            <label className="est-label">Observação (opcional):</label>
            <input
              type="text"
              className="est-input"
              placeholder="Ex: frasco caiu e quebrou"
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
              className="est-btn est-btn-danger"
              disabled={salvando}
            >
              <MinusCircle size={16} />
              <span>{salvando ? 'Salvando...' : 'Confirmar saída'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
