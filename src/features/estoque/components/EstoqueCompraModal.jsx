import React, { useState } from 'react';
import { X, ShoppingCart } from 'lucide-react';
import { formatarNumeroPtBr } from '../domain/conversoes.js';

export default function EstoqueCompraModal({
  produto,
  compraAssumida,
  onConfirmarEntrada,
  onConcluirCompra,
  onFechar
}) {
  const [modoEntrada, setModoEntrada] = useState('embalagens'); // 'embalagens' ou 'unidades'
  const [quantidade, setQuantidade] = useState('');
  const [motivo, setMotivo] = useState('compra');
  const [valorPago, setValorPago] = useState('');
  const [localCompra, setLocalCompra] = useState('');
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const eq = Number(produto.embalagem_quantidade) || 1;
  const qtdNum = Number(quantidade) || 0;

  const totalBase = modoEntrada === 'embalagens'
    ? qtdNum * eq
    : qtdNum;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (totalBase <= 0) {
      setErro('A quantidade de entrada deve ser maior que zero.');
      return;
    }

    try {
      setSalvando(true);
      setErro('');

      if (compraAssumida) {
        // Conclui a compra assumida de forma atômica pela RPC
        await onConcluirCompra(compraAssumida.id, totalBase, valorPago ? Number(valorPago) : null, localCompra || null);
      } else {
        await onConfirmarEntrada(
          produto.id,
          totalBase,
          motivo,
          observacao,
          valorPago ? Number(valorPago) : null,
          localCompra || null
        );
      }

      onFechar();
    } catch (err) {
      setErro(err.message || 'Erro ao registrar compra.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="est-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="compra-modal-title">
      <div className="est-modal">
        <div className="est-modal-header">
          <h2 id="compra-modal-title" className="est-modal-title">
            {compraAssumida ? `Concluir compra de ${produto.nome}` : `Registrar compra: ${produto.nome}`}
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

          {compraAssumida && (
            <div className="est-banner est-banner-warning" style={{ margin: 0 }}>
              🙋‍♂️ Esta compra foi assumida anteriormente. Ao registrar a entrada, ela será concluída automaticamente.
            </div>
          )}

          <div className="est-form-group">
            <label className="est-label">Forma de digitação:</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className={`est-btn ${modoEntrada === 'embalagens' ? 'est-btn-primary' : 'est-btn-outline'}`}
                style={{ flex: 1 }}
                onClick={() => setModoEntrada('embalagens')}
              >
                Por {produto.embalagem_nome || 'embalagem'} ({formatarNumeroPtBr(eq)} {produto.unidade_base})
              </button>
              <button
                type="button"
                className={`est-btn ${modoEntrada === 'unidades' ? 'est-btn-primary' : 'est-btn-outline'}`}
                style={{ flex: 1 }}
                onClick={() => setModoEntrada('unidades')}
              >
                Por {produto.unidade_base}
              </button>
            </div>
          </div>

          <div className="est-form-group">
            <label className="est-label">
              Quantidade de {modoEntrada === 'embalagens' ? `${produto.embalagem_nome}s` : produto.unidade_base}:
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

          <div style={{
            padding: '12px',
            backgroundColor: 'var(--primary-light)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>
              Total que será adicionado ao estoque:
            </span>
            <strong style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>
              +{formatarNumeroPtBr(totalBase)} {produto.unidade_base}
            </strong>
          </div>

          {!compraAssumida && (
            <div className="est-form-group">
              <label className="est-label">Motivo da entrada:</label>
              <select
                className="est-select"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              >
                <option value="compra">Compra</option>
                <option value="doacao">Doação</option>
                <option value="outro">Outro</option>
              </select>
            </div>
          )}

          <div className="est-form-group">
            <label className="est-label">Valor total pago em R$ (opcional):</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="est-input"
              placeholder="Ex: 85.50"
              value={valorPago}
              onChange={(e) => setValorPago(e.target.value)}
            />
          </div>

          <div className="est-form-group">
            <label className="est-label">Local da compra (opcional):</label>
            <input
              type="text"
              className="est-input"
              placeholder="Ex: Farmácia Droga Raia, Supermercado Guanabara"
              value={localCompra}
              onChange={(e) => setLocalCompra(e.target.value)}
            />
          </div>

          <div className="est-form-group">
            <label className="est-label">Observação (opcional):</label>
            <input
              type="text"
              className="est-input"
              placeholder="Ex: promoção leve 3 pague 2"
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
              <ShoppingCart size={16} />
              <span>{salvando ? 'Salvando...' : 'Confirmar entrada'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
