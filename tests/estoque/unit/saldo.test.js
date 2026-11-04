import { describe, it, expect } from 'vitest';
import { calcularSaldoEProjecao, formatarDataPtBr } from '../../../src/features/estoque/domain/saldo.js';

describe('saldo.js - Âncora, saldo e cálculo temporal puro', () => {
  const produtoTaxa = {
    id: 'prod-1',
    nome: 'Fralda G',
    unidade_base: 'fralda',
    embalagem_nome: 'pacote',
    embalagem_quantidade: 20,
    modo_consumo: 'taxa',
    consumo_diario_base: 6,
    dias_critico: 5,
    dias_atencao: 15
  };

  it('usa a conferência mais RECENTE como âncora (M4: não pode usar a mais antiga)', () => {
    const agora = new Date('2026-07-15T12:00:00Z');

    const movimentos = [
      {
        id: 'conf-antiga',
        produto_id: 'prod-1',
        tipo: 'conferencia',
        quantidade_base: 100,
        ocorrido_em: '2026-07-01T12:00:00Z',
        registrado_em: '2026-07-01T12:00:00Z'
      },
      {
        id: 'conf-recente',
        produto_id: 'prod-1',
        tipo: 'conferencia',
        quantidade_base: 40,
        ocorrido_em: '2026-07-10T12:00:00Z',
        registrado_em: '2026-07-10T12:00:00Z'
      }
    ];

    const res = calcularSaldoEProjecao(produtoTaxa, movimentos, [], [], agora);
    expect(res.ancora.id).toBe('conf-recente');
    expect(res.saldo).toBe(40);
  });

  it('desempata conferências com mesmo ocorrido_em pelo registrado_em', () => {
    const agora = new Date('2026-07-15T12:00:00Z');

    const movimentos = [
      {
        id: 'conf-primeiro-reg',
        produto_id: 'prod-1',
        tipo: 'conferencia',
        quantidade_base: 50,
        ocorrido_em: '2026-07-10T12:00:00Z',
        registrado_em: '2026-07-10T12:01:00Z'
      },
      {
        id: 'conf-segundo-reg',
        produto_id: 'prod-1',
        tipo: 'conferencia',
        quantidade_base: 70,
        ocorrido_em: '2026-07-10T12:00:00Z',
        registrado_em: '2026-07-10T12:05:00Z'
      }
    ];

    const res = calcularSaldoEProjecao(produtoTaxa, movimentos, [], [], agora);
    expect(res.ancora.id).toBe('conf-segundo-reg');
    expect(res.saldo).toBe(70);
  });

  it('ignora entradas e saídas ocorridas antes da âncora', () => {
    const agora = new Date('2026-07-15T12:00:00Z');

    const movimentos = [
      {
        id: 'ent-antiga',
        produto_id: 'prod-1',
        tipo: 'entrada',
        quantidade_base: 50,
        ocorrido_em: '2026-07-05T12:00:00Z'
      },
      {
        id: 'conf-recente',
        produto_id: 'prod-1',
        tipo: 'conferencia',
        quantidade_base: 30,
        ocorrido_em: '2026-07-10T12:00:00Z'
      },
      {
        id: 'ent-nova',
        produto_id: 'prod-1',
        tipo: 'entrada',
        quantidade_base: 20,
        ocorrido_em: '2026-07-12T12:00:00Z'
      }
    ];

    const res = calcularSaldoEProjecao(produtoTaxa, movimentos, [], [], agora);
    // Saldo = ancora (30) + ent-nova (20) = 50 (ent-antiga ignorada)
    expect(res.saldo).toBe(50);
  });

  it('exclui movimentos estornados e o próprio estorno do cálculo (M2: não pode incluir estornados)', () => {
    const agora = new Date('2026-07-15T12:00:00Z');

    const movimentos = [
      {
        id: 'conf-1',
        produto_id: 'prod-1',
        tipo: 'conferencia',
        quantidade_base: 40,
        ocorrido_em: '2026-07-10T12:00:00Z'
      },
      {
        id: 'ent-equivocada',
        produto_id: 'prod-1',
        tipo: 'entrada',
        quantidade_base: 100, // digitada errada
        ocorrido_em: '2026-07-11T12:00:00Z'
      },
      {
        id: 'estorno-ent',
        produto_id: 'prod-1',
        tipo: 'estorno',
        estorna_movimento_id: 'ent-equivocada',
        motivo: 'erro de digitação',
        ocorrido_em: '2026-07-11T12:10:00Z'
      },
      {
        id: 'ent-correta',
        produto_id: 'prod-1',
        tipo: 'entrada',
        quantidade_base: 10,
        ocorrido_em: '2026-07-12T12:00:00Z'
      }
    ];

    const res = calcularSaldoEProjecao(produtoTaxa, movimentos, [], [], agora);
    // Deve ignorar ent-equivocada (100) e o estorno-ent.
    // Saldo = 40 (ancora) + 10 (ent-correta) = 50.
    expect(res.saldo).toBe(50);
  });

  it('saldo nunca fica negativo (Math.max(0, ...))', () => {
    const agora = new Date('2026-07-15T12:00:00Z');

    const movimentos = [
      {
        id: 'conf-1',
        produto_id: 'prod-1',
        tipo: 'conferencia',
        quantidade_base: 10,
        ocorrido_em: '2026-07-10T12:00:00Z'
      },
      {
        id: 'saida-excessiva',
        produto_id: 'prod-1',
        tipo: 'saida',
        quantidade_base: 50,
        ocorrido_em: '2026-07-12T12:00:00Z'
      }
    ];

    const res = calcularSaldoEProjecao(produtoTaxa, movimentos, [], [], agora);
    expect(res.saldo).toBe(0);
    expect(res.saldoEstimado).toBe(0);
    expect(res.situacao).toBe('acabou');
  });

  it('calcula dias decorridos de forma puramente fracionária em ms (M6: imune a timezone)', () => {
    // 36 horas após a conferência = exatamente 1.5 dias
    const ancoraTime = new Date('2026-07-10T12:00:00.000Z');
    const agoraTime = new Date('2026-07-12T00:00:00.000Z');

    const movimentos = [
      {
        id: 'conf-1',
        produto_id: 'prod-1',
        tipo: 'conferencia',
        quantidade_base: 60,
        ocorrido_em: ancoraTime.toISOString()
      }
    ];

    // Consumo = 6 fraldas/dia. Em 1.5 dias, consome 9 fraldas.
    // Saldo estimado = 60 - 9 = 51.
    const res = calcularSaldoEProjecao(produtoTaxa, movimentos, [], [], agoraTime);
    expect(res.saldo).toBe(60);
    expect(res.saldoEstimado).toBeCloseTo(51, 2);
    // Dias restantes = 51 / 6 = 8.5 dias
    expect(res.diasRestantes).toBeCloseTo(8.5, 2);
  });

  it('formatarDataPtBr formata no fuso de America/Sao_Paulo', () => {
    // 2026-07-15T02:00:00Z em UTC é 2026-07-14 às 23:00 em America/Sao_Paulo (UTC-3)
    const dataUtc = new Date('2026-07-15T02:00:00Z');
    expect(formatarDataPtBr(dataUtc)).toBe('14/07');
  });
});
