import { describe, it, expect } from 'vitest';
import { calcularSaldoEProjecao } from '../../../src/features/estoque/domain/saldo.js';

describe('conferenciaAntiga.test.js - Selo de conferência antiga (> 30 dias)', () => {
  const agora = new Date('2026-07-31T12:00:00Z');

  const produtoTaxa = {
    id: 'p-1',
    nome: 'Shampoo',
    unidade_base: 'ml',
    embalagem_nome: 'frasco',
    embalagem_quantidade: 400,
    modo_consumo: 'taxa',
    consumo_diario_base: 5,
    dias_critico: 5,
    dias_atencao: 15
  };

  it('gera selo conferirDeNovo se última conferência ocorreu há mais de 30 dias', () => {
    // 31 dias antes de 31/07 = 30/06
    const movimentos = [
      {
        id: 'c-1',
        produto_id: 'p-1',
        tipo: 'conferencia',
        quantidade_base: 400,
        ocorrido_em: '2026-06-30T11:00:00Z'
      }
    ];

    const res = calcularSaldoEProjecao(produtoTaxa, movimentos, [], [], agora);
    expect(res.conferirDeNovo).toBe(true);
  });

  it('não gera selo conferirDeNovo se conferência ocorreu há 30 dias ou menos', () => {
    // 15 dias antes
    const movimentos = [
      {
        id: 'c-1',
        produto_id: 'p-1',
        tipo: 'conferencia',
        quantidade_base: 400,
        ocorrido_em: '2026-07-16T12:00:00Z'
      }
    ];

    const res = calcularSaldoEProjecao(produtoTaxa, movimentos, [], [], agora);
    expect(res.conferirDeNovo).toBe(false);
  });
});
