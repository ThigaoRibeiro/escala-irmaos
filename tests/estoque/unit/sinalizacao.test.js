import { describe, it, expect } from 'vitest';
import { calcularSaldoEProjecao } from '../../../src/features/estoque/domain/saldo.js';

describe('sinalizacao.test.js - Sinalização "está acabando" (M5)', () => {
  const agora = new Date('2026-07-15T12:00:00Z');

  const produtoOk = {
    id: 'p-1',
    nome: 'Fralda',
    unidade_base: 'fralda',
    embalagem_nome: 'pacote',
    embalagem_quantidade: 20,
    modo_consumo: 'taxa',
    consumo_diario_base: 1,
    dias_critico: 5,
    dias_atencao: 15
  };

  it('sinalização pendente eleva situação de ok (🟢) para atenção (🟡) (M5)', () => {
    // 50 dias restantes -> normalmente seria 'ok'
    const movimentos = [
      {
        id: 'c-1',
        produto_id: 'p-1',
        tipo: 'conferencia',
        quantidade_base: 50,
        ocorrido_em: '2026-07-10T12:00:00Z'
      }
    ];

    // Sinalização feita em 12/07 (após a conferência)
    const sinalizacoes = [
      {
        id: 'sin-1',
        produto_id: 'p-1',
        criado_em: '2026-07-12T12:00:00Z',
        criado_por_email: 'cuidadora@exemplo.com',
        observacao: 'pacote aberto quase no fim'
      }
    ];

    const res = calcularSaldoEProjecao(produtoOk, movimentos, sinalizacoes, [], agora);
    // Sem elevação seria 'ok'. Com elevação por sinalização (M5), DEVE ser 'atencao'!
    expect(res.situacao).toBe('atencao');
    expect(res.situacaoIcon).toBe('🟡');
    expect(res.sinalizacaoPendente).not.toBeNull();
    expect(res.sinalizacaoPendente.id).toBe('sin-1');
  });

  it('sinalização pendente não rebaixa situação crítica (🔴) ou acabou (⚪)', () => {
    // 3 dias restantes -> já é 'critico'
    const movimentos = [
      {
        id: 'c-1',
        produto_id: 'p-1',
        tipo: 'conferencia',
        quantidade_base: 3,
        ocorrido_em: '2026-07-15T12:00:00Z'
      }
    ];

    const sinalizacoes = [
      {
        id: 'sin-1',
        produto_id: 'p-1',
        criado_em: '2026-07-15T12:01:00Z',
        criado_por_email: 'cuidadora@exemplo.com'
      }
    ];

    const res = calcularSaldoEProjecao(produtoOk, movimentos, sinalizacoes, [], agora);
    // Permanece 'critico'
    expect(res.situacao).toBe('critico');
    expect(res.situacaoIcon).toBe('🔴');
  });

  it('sinalização é resolvida quando há conferência ou entrada posterior', () => {
    // Sinalização feita em 11/07
    const sinalizacoes = [
      {
        id: 'sin-1',
        produto_id: 'p-1',
        criado_em: '2026-07-11T12:00:00Z',
        criado_por_email: 'cuidadora@exemplo.com'
      }
    ];

    // Nova conferência realizada em 12/07 (após o aviso)
    const movimentos = [
      {
        id: 'c-1',
        produto_id: 'p-1',
        tipo: 'conferencia',
        quantidade_base: 40,
        ocorrido_em: '2026-07-12T12:00:00Z'
      }
    ];

    const res = calcularSaldoEProjecao(produtoOk, movimentos, sinalizacoes, [], agora);
    // Sinalização resolvida, volta a ser 'ok'
    expect(res.sinalizacaoPendente).toBeNull();
    expect(res.situacao).toBe('ok');
  });
});
