import { describe, it, expect } from 'vitest';
import { calcularItens, contarPorSituacao, contarUrgentes } from '../../../src/features/estoque/domain/resumo.js';

// A2: o selo da navegação e o cabeçalho da aba precisam contar EXATAMENTE a mesma coisa.
describe('resumo.test.js - contagem única para selo e cabeçalho (A2)', () => {
  const agora = new Date('2026-07-15T12:00:00Z');
  const medications = [
    { id: '1', time: '08:00', name: 'Memantina', dose: '1 comp' },
    { id: '2', time: '20:00', name: 'Memantina', dose: '1 comp' }
  ];

  const produtos = [
    // Vinculado à agenda: 2 horários x 1 = 2/dia; saldo 8 = 4 dias = crítico
    { id: 'p-agenda', nome: 'Memantina', unidade_base: 'comprimido', embalagem_nome: 'caixa', embalagem_quantidade: 30,
      modo_consumo: 'taxa', medicamento_ids: ['1', '2'], quantidade_por_administracao: 1, dias_critico: 5, dias_atencao: 15 },
    // Manual, folgado = ok
    { id: 'p-ok', nome: 'Shampoo', unidade_base: 'ml', embalagem_nome: 'frasco', embalagem_quantidade: 400,
      modo_consumo: 'taxa', consumo_diario_base: 5, dias_critico: 5, dias_atencao: 15 },
    // Já acabou
    { id: 'p-fim', nome: 'Luvas', unidade_base: 'par', embalagem_nome: 'caixa', embalagem_quantidade: 50,
      modo_consumo: 'minimo', estoque_minimo_base: 5, estoque_atencao_base: 10 },
    // Sem conferência
    { id: 'p-novo', nome: 'Gaze', unidade_base: 'un', embalagem_nome: 'pacote', embalagem_quantidade: 10,
      modo_consumo: 'taxa', consumo_diario_base: 1 }
  ];
  const conf = (produtoId, quantidadeBase) => ({
    id: `c-${produtoId}`, produto_id: produtoId, tipo: 'conferencia', quantidade_base: quantidadeBase, ocorrido_em: agora.toISOString()
  });
  const movimentos = [conf('p-agenda', 8), conf('p-ok', 500), conf('p-fim', 0)];

  it('conta por situação com a agenda de remédios', () => {
    const itens = calcularItens(produtos, movimentos, [], medications, agora);
    const c = contarPorSituacao(itens);
    expect(c).toEqual({ acabou: 1, critico: 1, atencao: 0, sem_conferencia: 1, ok: 1 });
    expect(contarUrgentes(c)).toBe(2);
  });

  it('sem a agenda o remédio vinculado muda de situação (por isso o selo PRECISA receber a agenda)', () => {
    const c = contarPorSituacao(calcularItens(produtos, movimentos, [], [], agora));
    expect(c.critico).toBe(0);
    expect(contarUrgentes(c)).toBe(1);
  });
});
