import React from 'react';
import {
  CheckCircle2,
  ShoppingCart,
  AlertCircle,
  Clock,
  Edit,
  History,
  MinusCircle,
  UserCheck
} from 'lucide-react';
import { formatarQuantidade } from '../domain/conversoes.js';
import { formatarDataPtBr } from '../domain/saldo.js';
import { obterNomeUsuario } from '../domain/whatsapp.js';

export default function EstoqueCard({
  produto,
  calculo,
  compraAssumida,
  currentUserEmail,
  userMapping,
  caregivers,
  onConferir,
  onComprar,
  onConcluirCompra,
  onAssumirCompra,
  onDesistirCompra,
  onSinalizar,
  onSaida,
  onHistorico,
  onEditar
}) {
  const {
    temConferencia,
    situacao,
    situacaoLabel,
    situacaoIcon,
    saldo,
    saldoEstimado,
    diasRestantes,
    previsaoTerminoFormatada,
    conferirDeNovo,
    sinalizacaoPendente,
    vinculoOrigem,
    vinculoMudou,
    receitaStatus
  } = calculo || {};

  const isCompradorAtual = compraAssumida && currentUserEmail &&
    compraAssumida.assumida_por_email?.toLowerCase() === currentUserEmail.toLowerCase();

  const nomeComprador = compraAssumida
    ? obterNomeUsuario(compraAssumida.assumida_por_email, userMapping, caregivers)
    : null;

  const saldoExibicao = formatarQuantidade(
    saldoEstimado ?? saldo,
    produto.unidade_base,
    produto.embalagem_nome,
    produto.embalagem_quantidade
  );

  return (
    <article className="est-card" data-testid={`estoque-card-${produto.id}`}>
      <div className="est-card-header">
        <div className="est-card-title-group">
          <h2 className="est-card-title">
            <span>{produto.nome}</span>
            {produto.marca_preferida && (
              <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>
                ({produto.marca_preferida})
              </span>
            )}
            {produto.arquivado_em && (
              <span className="est-tag est-tag-aviso">Arquivado</span>
            )}
          </h2>
          <span className="est-card-category">
            {produto.categoria} • Modo {produto.modo_consumo === 'minimo' ? 'mínimo' : 'taxa contínua'}
          </span>
        </div>

        <div className={`est-badge-status est-badge-${situacao}`}>
          <span>{situacaoIcon}</span>
          <span>{situacaoLabel}</span>
        </div>
      </div>

      <div className="est-card-body">
        {!temConferencia ? (
          <div style={{ padding: '8px 0' }}>
            <p style={{ margin: '0 0 8px 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              ⚪ Produto novo: ainda não possui nenhuma conferência registrada. Sem projeção de término.
            </p>
            <button
              type="button"
              className="est-btn est-btn-primary"
              onClick={() => onConferir(produto)}
            >
              <CheckCircle2 size={16} />
              <span>Fazer primeira conferência</span>
            </button>
          </div>
        ) : (
          <>
            <div className="est-saldo-principal">
              {saldoExibicao}
            </div>

            {produto.modo_consumo === 'taxa' && (
              <div className="est-projecao-linha">
                <Clock size={14} />
                {previsaoTerminoFormatada ? (
                  <span>
                    acaba por volta de <strong>{previsaoTerminoFormatada}</strong>
                    {typeof diasRestantes === 'number' && isFinite(diasRestantes) && (
                      <span> (~ {Math.max(0, diasRestantes).toFixed(1).replace('.', ',')} dias)</span>
                    )}
                  </span>
                ) : (
                  <span>Saldo esgotado ou consumo não configurado</span>
                )}
              </div>
            )}

            {produto.modo_consumo === 'minimo' && (
              <div className="est-consumo-info">
                Estoque mínimo: {produto.estoque_minimo_base} {produto.unidade_base} | Atenção: {produto.estoque_atencao_base} {produto.unidade_base}
              </div>
            )}

            {vinculoOrigem && produto.modo_consumo === 'taxa' && (
              <div className="est-consumo-info">
                Consumo: {vinculoOrigem}
              </div>
            )}

            {/* Selos / Badges contextuais */}
            <div className="est-tags-list">
              {compraAssumida && (
                <span className="est-tag est-tag-comprador">
                  <UserCheck size={12} />
                  🙋‍♂️ {nomeComprador} vai comprar
                </span>
              )}

              {sinalizacaoPendente && (
                <span className="est-tag est-tag-aviso">
                  <AlertCircle size={12} />
                  Avisado por {obterNomeUsuario(sinalizacaoPendente.criado_por_email, userMapping, caregivers)} em {formatarDataPtBr(sinalizacaoPendente.criado_em)}
                </span>
              )}

              {conferirDeNovo && (
                <span className="est-tag est-tag-aviso" title="A estimativa pode ter se afastado da realidade">
                  <Clock size={12} />
                  Conferir de novo (&gt; 30 dias)
                </span>
              )}

              {vinculoMudou && (
                <span className="est-tag est-tag-aviso">
                  <AlertCircle size={12} />
                  Vínculo com a agenda mudou – revise o consumo
                </span>
              )}

              {receitaStatus?.tipo === 'vencida' && (
                <span className="est-tag est-tag-receita-vencida">
                  <AlertCircle size={12} />
                  Receita vencida
                </span>
              )}

              {receitaStatus?.tipo === 'vencendo' && (
                <span className="est-tag est-tag-receita">
                  <Clock size={12} />
                  {receitaStatus.texto}
                </span>
              )}
            </div>
          </>
        )}

        {produto.observacoes && (
          <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Obs: {produto.observacoes}
          </p>
        )}
      </div>

      <div className="est-card-actions">
        {temConferencia && (
          <button
            type="button"
            className="est-btn est-btn-secondary"
            onClick={() => onConferir(produto)}
            title="Conferir estoque físico"
          >
            <CheckCircle2 size={15} />
            <span>Conferir</span>
          </button>
        )}

        <button
          type="button"
          className="est-btn est-btn-secondary"
          onClick={() => {
            if (compraAssumida) {
              onConcluirCompra(produto, compraAssumida);
            } else {
              onComprar(produto);
            }
          }}
          title="Registrar compra ou reposição"
        >
          <ShoppingCart size={15} />
          <span>{compraAssumida ? 'Concluir compra' : 'Comprei'}</span>
        </button>

        {!compraAssumida ? (
          <button
            type="button"
            className="est-btn est-btn-outline"
            onClick={() => onAssumirCompra(produto)}
            title="Avisar os irmãos que você vai comprar este item"
          >
            <UserCheck size={15} />
            <span>Eu compro</span>
          </button>
        ) : isCompradorAtual ? (
          <button
            type="button"
            className="est-btn est-btn-outline"
            onClick={() => onDesistirCompra(compraAssumida)}
            title="Desistir de comprar este item"
          >
            <span>Desistir da compra</span>
          </button>
        ) : null}

        <button
          type="button"
          className="est-btn est-btn-outline"
          onClick={() => onSinalizar(produto)}
          title="Avisar que está acabando"
        >
          <AlertCircle size={15} />
          <span>Está acabando</span>
        </button>

        {temConferencia && (
          <button
            type="button"
            className="est-btn est-btn-outline"
            onClick={() => onSaida(produto)}
            title="Registrar consumo avulso, perda ou vencimento"
          >
            <MinusCircle size={15} />
            <span>Saída</span>
          </button>
        )}

        <button
          type="button"
          className="est-btn est-btn-outline"
          onClick={() => onHistorico(produto)}
          title="Ver histórico de movimentações e estornos"
        >
          <History size={15} />
          <span>Histórico</span>
        </button>

        <button
          type="button"
          className="est-btn est-btn-outline"
          onClick={() => onEditar(produto)}
          title="Editar configurações do produto"
        >
          <Edit size={15} />
          <span>Editar</span>
        </button>
      </div>
    </article>
  );
}
