import { describe, it, expect } from 'vitest';
import { calcularSaldoEProjecao } from '../../../src/features/estoque/domain/saldo.js';

// M2: a receita vale até o FIM DO DIA em Brasília. Antes, o fim do dia era calculado em UTC
// (21h em Brasília), então a receita aparecia como vencida três horas antes da hora.
describe('receitaFuso.test.js - validade da receita no fuso de Brasília (M2)', () => {
  const produto = {
    id: 'p-1',
    nome: 'Memantina',
    unidade_base: 'comprimido',
    embalagem_nome: 'caixa',
    embalagem_quantidade: 30,
    modo_consumo: 'taxa',
    consumo_diario_base: 1,
    requer_receita: true,
    antecedencia_receita_dias: 7,
    receita_validade: '2026-11-10'
  };
  const conf = (agora) => [{ id: 'c-1', produto_id: 'p-1', tipo: 'conferencia', quantidade_base: 30, ocorrido_em: agora.toISOString() }];

  it('às 22h de Brasília do último dia (01h UTC do dia seguinte) a receita ainda NÃO venceu', () => {
    const agora = new Date('2026-11-11T01:00:00Z'); // 22:00 de 10/11 em Brasília
    const res = calcularSaldoEProjecao(produto, conf(agora), [], [], agora);
    expect(res.receitaStatus?.tipo).not.toBe('vencida');
  });

  it('um minuto depois da meia-noite de Brasília a receita vence', () => {
    const agora = new Date('2026-11-11T03:01:00Z'); // 00:01 de 11/11 em Brasília
    const res = calcularSaldoEProjecao(produto, conf(agora), [], [], agora);
    expect(res.receitaStatus?.tipo).toBe('vencida');
  });

  it('dias até vencer contam a partir do fim do dia de Brasília', () => {
    const agora = new Date('2026-11-08T15:00:00Z'); // 12:00 de 08/11 em Brasília
    const res = calcularSaldoEProjecao(produto, conf(agora), [], [], agora);
    expect(res.receitaStatus?.tipo).toBe('vencendo');
    expect(res.receitaStatus?.dias).toBe(3);
  });
});
