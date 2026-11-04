import { describe, it, expect } from 'vitest';
import { calcularSaldoEProjecao } from '../../../src/features/estoque/domain/saldo.js';

describe('limiares.test.js - Limiares e fronteiras exatas (M1, M3)', () => {
  const agora = new Date('2026-07-15T12:00:00Z');

  describe('Modo taxa contínua', () => {
    it('fronteira crítica exata: diasRestantes == dias_critico cai em crítico (M1: <= crítico)', () => {
      // dias_critico = 5, consumo = 1/dia
      // Conferência de 5 unidades ocorrida em agora -> diasRestantes = 5.0
      const produto = {
        id: 'p-1',
        nome: 'Item Teste',
        unidade_base: 'un',
        embalagem_nome: 'pct',
        embalagem_quantidade: 1,
        modo_consumo: 'taxa',
        consumo_diario_base: 1,
        dias_critico: 5,
        dias_atencao: 15,
        requer_receita: false
      };

      const movimentos = [
        {
          id: 'c-1',
          produto_id: 'p-1',
          tipo: 'conferencia',
          quantidade_base: 5,
          ocorrido_em: agora.toISOString()
        }
      ];

      const res = calcularSaldoEProjecao(produto, movimentos, [], [], agora);
      expect(res.diasRestantes).toBe(5);
      // Se fosse `<` (mutação M1), daria 'atencao'. Com `<=`, DEVE ser 'critico'!
      expect(res.situacao).toBe('critico');
      expect(res.situacaoIcon).toBe('🔴');
    });

    it('fronteira de atenção exata: diasRestantes == dias_atencao cai em atenção', () => {
      const produto = {
        id: 'p-1',
        nome: 'Item Teste',
        unidade_base: 'un',
        embalagem_nome: 'pct',
        embalagem_quantidade: 1,
        modo_consumo: 'taxa',
        consumo_diario_base: 1,
        dias_critico: 5,
        dias_atencao: 15,
        requer_receita: false
      };

      const movimentos = [
        {
          id: 'c-1',
          produto_id: 'p-1',
          tipo: 'conferencia',
          quantidade_base: 15,
          ocorrido_em: agora.toISOString()
        }
      ];

      const res = calcularSaldoEProjecao(produto, movimentos, [], [], agora);
      expect(res.diasRestantes).toBe(15);
      expect(res.situacao).toBe('atencao');
      expect(res.situacaoIcon).toBe('🟡');
    });

    it('acima da atenção fica ok', () => {
      const produto = {
        id: 'p-1',
        nome: 'Item Teste',
        unidade_base: 'un',
        embalagem_nome: 'pct',
        embalagem_quantidade: 1,
        modo_consumo: 'taxa',
        consumo_diario_base: 1,
        dias_critico: 5,
        dias_atencao: 15,
        requer_receita: false
      };

      const movimentos = [
        {
          id: 'c-1',
          produto_id: 'p-1',
          tipo: 'conferencia',
          quantidade_base: 15.1,
          ocorrido_em: agora.toISOString()
        }
      ];

      const res = calcularSaldoEProjecao(produto, movimentos, [], [], agora);
      expect(res.diasRestantes).toBeGreaterThan(15);
      expect(res.situacao).toBe('ok');
      expect(res.situacaoIcon).toBe('🟢');
    });

    it('antecedência de receita antecipa os limiares (M3: não pode ignorar antecedencia_receita_dias)', () => {
      // Produto com receita: dias_critico=5, dias_atencao=15, antecedencia=7
      // Limiar crítico efetivo vira 5 + 7 = 12 dias!
      // Limiar atenção efetivo vira 15 + 7 = 22 dias!
      const produto = {
        id: 'p-rem',
        nome: 'Remédio Controlado',
        unidade_base: 'comp',
        embalagem_nome: 'cx',
        embalagem_quantidade: 30,
        modo_consumo: 'taxa',
        consumo_diario_base: 1,
        dias_critico: 5,
        dias_atencao: 15,
        requer_receita: true,
        antecedencia_receita_dias: 7
      };

      // Com 12 dias restantes:
      // Se ignorasse receita (M3), 12 dias seria apenas 'atencao' (> 5).
      // Com receita, 12 dias <= (5+7=12), logo DEVE ser 'critico'!
      const movimentos = [
        {
          id: 'c-1',
          produto_id: 'p-rem',
          tipo: 'conferencia',
          quantidade_base: 12,
          ocorrido_em: agora.toISOString()
        }
      ];

      const res = calcularSaldoEProjecao(produto, movimentos, [], [], agora);
      expect(res.diasRestantes).toBe(12);
      expect(res.situacao).toBe('critico');
    });
  });

  describe('Modo mínimo', () => {
    const produtoMin = {
      id: 'p-min',
      nome: 'Curativo',
      unidade_base: 'pct',
      embalagem_nome: 'pct',
      embalagem_quantidade: 1,
      modo_consumo: 'minimo',
      estoque_minimo_base: 2,
      estoque_atencao_base: 5
    };

    it('saldo <= 0 -> acabou (⚫)', () => {
      const movimentos = [
        { id: 'c-1', produto_id: 'p-min', tipo: 'conferencia', quantidade_base: 0, ocorrido_em: agora.toISOString() }
      ];
      const res = calcularSaldoEProjecao(produtoMin, movimentos, [], [], agora);
      expect(res.situacao).toBe('acabou');
      expect(res.situacaoIcon).toBe('⚫');
    });

    it('fronteira mínima exata: saldo == estoque_minimo_base -> crítico (🔴)', () => {
      const movimentos = [
        { id: 'c-1', produto_id: 'p-min', tipo: 'conferencia', quantidade_base: 2, ocorrido_em: agora.toISOString() }
      ];
      const res = calcularSaldoEProjecao(produtoMin, movimentos, [], [], agora);
      expect(res.saldo).toBe(2);
      expect(res.situacao).toBe('critico');
      expect(res.situacaoIcon).toBe('🔴');
    });

    it('fronteira de atenção exata: saldo == estoque_atencao_base -> atenção (🟡)', () => {
      const movimentos = [
        { id: 'c-1', produto_id: 'p-min', tipo: 'conferencia', quantidade_base: 5, ocorrido_em: agora.toISOString() }
      ];
      const res = calcularSaldoEProjecao(produtoMin, movimentos, [], [], agora);
      expect(res.saldo).toBe(5);
      expect(res.situacao).toBe('atencao');
      expect(res.situacaoIcon).toBe('🟡');
    });

    it('saldo > estoque_atencao_base -> ok (🟢)', () => {
      const movimentos = [
        { id: 'c-1', produto_id: 'p-min', tipo: 'conferencia', quantidade_base: 6, ocorrido_em: agora.toISOString() }
      ];
      const res = calcularSaldoEProjecao(produtoMin, movimentos, [], [], agora);
      expect(res.saldo).toBe(6);
      expect(res.situacao).toBe('ok');
      expect(res.situacaoIcon).toBe('🟢');
    });
  });
});
