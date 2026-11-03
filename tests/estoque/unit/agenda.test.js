import { describe, it, expect } from 'vitest';
import { calcularConsumoDiario, calcularSaldoEProjecao } from '../../../src/features/estoque/domain/saldo.js';

describe('agenda.test.js - Vínculo com a agenda de remédios (M11)', () => {
  const agora = new Date('2026-07-15T12:00:00Z');

  const medications = [
    { id: '101', time: '08:00', name: 'Memantina', dose: '10 comprimidos de 500mg' }, // texto enganoso em dose
    { id: '102', time: '20:00', name: 'Memantina', dose: '50 gotas' }                  // texto enganoso em dose
  ];

  it('calcula consumo pela agenda ignorando completamente o texto de dose (M11)', () => {
    const produto = {
      id: 'p-mem',
      nome: 'Memantina 10mg',
      unidade_base: 'comprimido',
      embalagem_nome: 'caixa',
      embalagem_quantidade: 30,
      modo_consumo: 'taxa',
      medicamento_ids: ['101', '102'],
      quantidade_por_administracao: 1, // 1 comprimido por horário configurado explicitamente
      dias_critico: 5,
      dias_atencao: 15
    };

    const res = calcularConsumoDiario(produto, medications);
    // 2 horários encontrados * 1 por admin = 2 comprimidos/dia.
    // NUNCA ler "10 comprimidos" ou "50 gotas" da coluna dose (M11)!
    expect(res.consumoDiario).toBe(2);
    expect(res.vinculoMudou).toBe(false);
  });

  it('detecta vínculo parcialmente quebrado quando uma linha da agenda é removida', () => {
    const produto = {
      id: 'p-mem',
      nome: 'Memantina 10mg',
      unidade_base: 'comprimido',
      embalagem_nome: 'caixa',
      embalagem_quantidade: 30,
      modo_consumo: 'taxa',
      medicamento_ids: ['101', '102', '999'], // 999 não existe mais na agenda
      quantidade_por_administracao: 1
    };

    const res = calcularConsumoDiario(produto, medications);
    // Encontrou 2 de 3: consumo = 2, mas vinculoMudou = true
    expect(res.consumoDiario).toBe(2);
    expect(res.vinculoMudou).toBe(true);
  });

  it('vínculo totalmente quebrado com consumo manual configurado usa o consumo manual', () => {
    const produto = {
      id: 'p-mem',
      nome: 'Memantina 10mg',
      unidade_base: 'comprimido',
      embalagem_nome: 'caixa',
      embalagem_quantidade: 30,
      modo_consumo: 'taxa',
      medicamento_ids: ['888', '999'], // nenhum existe
      quantidade_por_administracao: 1,
      consumo_diario_base: 3 // fallback manual
    };

    const res = calcularConsumoDiario(produto, medications);
    expect(res.consumoDiario).toBe(3);
    expect(res.vinculoMudou).toBe(true);
    expect(res.vinculoQuebradoSemManual).toBe(false);
  });

  it('vínculo totalmente quebrado sem consumo manual deixa o produto em situação ⚪', () => {
    const produto = {
      id: 'p-mem',
      nome: 'Memantina 10mg',
      unidade_base: 'comprimido',
      embalagem_nome: 'caixa',
      embalagem_quantidade: 30,
      modo_consumo: 'taxa',
      medicamento_ids: ['888', '999'], // nenhum existe
      quantidade_por_administracao: 1,
      consumo_diario_base: null // sem fallback manual
    };

    const movimentos = [
      {
        id: 'c-1',
        produto_id: 'p-mem',
        tipo: 'conferencia',
        quantidade_base: 30,
        ocorrido_em: agora.toISOString()
      }
    ];

    const res = calcularSaldoEProjecao(produto, movimentos, [], medications, agora);
    expect(res.situacao).toBe('sem_conferencia');
    expect(res.situacaoIcon).toBe('⚪');
    expect(res.situacaoLabel).toContain('quebrado');
  });
});
