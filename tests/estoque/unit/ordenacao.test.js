import { describe, it, expect } from 'vitest';
import { ordenarItensEstoque } from '../../../src/features/estoque/domain/ordenacao.js';

describe('ordenacao.test.js - Ordenação estrita por urgência', () => {
  it('ordena pelos grupos na ordem estrita: acabou (⚪), crítico (🔴), atenção (🟡), sem conferência (⚪), ok (🟢)', () => {
    const itens = [
      { produto: { nome: 'Item E' }, calculo: { situacao: 'ok', diasRestantes: 30 } },
      { produto: { nome: 'Item D' }, calculo: { situacao: 'sem_conferencia', diasRestantes: null } },
      { produto: { nome: 'Item B' }, calculo: { situacao: 'critico', diasRestantes: 3 } },
      { produto: { nome: 'Item A' }, calculo: { situacao: 'acabou', diasRestantes: 0 } },
      { produto: { nome: 'Item C' }, calculo: { situacao: 'atencao', diasRestantes: 10 } }
    ];

    const ordenados = ordenarItensEstoque(itens);
    const nomes = ordenados.map(i => i.produto.nome);
    expect(nomes).toEqual(['Item A', 'Item B', 'Item C', 'Item D', 'Item E']);
  });

  it('no mesmo grupo de urgência, ordena por menos dias restantes primeiro', () => {
    const itens = [
      { produto: { nome: 'Item Mais Dias' }, calculo: { situacao: 'critico', diasRestantes: 4.5 } },
      { produto: { nome: 'Item Menos Dias' }, calculo: { situacao: 'critico', diasRestantes: 1.2 } },
      { produto: { nome: 'Item Médio' }, calculo: { situacao: 'critico', diasRestantes: 3.0 } }
    ];

    const ordenados = ordenarItensEstoque(itens);
    const nomes = ordenados.map(i => i.produto.nome);
    expect(nomes).toEqual(['Item Menos Dias', 'Item Médio', 'Item Mais Dias']);
  });

  it('desempate por nome alfabético em pt-BR', () => {
    const itens = [
      { produto: { nome: 'Zebra' }, calculo: { situacao: 'atencao', diasRestantes: 10 } },
      { produto: { nome: 'Água boricada' }, calculo: { situacao: 'atencao', diasRestantes: 10 } },
      { produto: { nome: 'Algodão' }, calculo: { situacao: 'atencao', diasRestantes: 10 } }
    ];

    const ordenados = ordenarItensEstoque(itens);
    const nomes = ordenados.map(i => i.produto.nome);
    expect(nomes).toEqual(['Água boricada', 'Algodão', 'Zebra']);
  });
});
