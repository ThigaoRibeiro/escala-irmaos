import { describe, it, expect } from 'vitest';
import { calcularSaldoEProjecao } from '../../../src/features/estoque/domain/saldo.js';

describe('semConferencia.test.js - Produto novo sem conferência (M12)', () => {
  const agora = new Date('2026-07-15T12:00:00Z');

  const produtoNovo = {
    id: 'prod-novo',
    nome: 'Item Sem Conferência',
    unidade_base: 'unidade',
    embalagem_nome: 'pacote',
    embalagem_quantidade: 10,
    modo_consumo: 'taxa',
    consumo_diario_base: 2,
    dias_critico: 5,
    dias_atencao: 15
  };

  it('produto sem nenhuma conferência válida tem situação ⚪ sem_conferencia', () => {
    const res = calcularSaldoEProjecao(produtoNovo, [], [], [], agora);
    expect(res.temConferencia).toBe(false);
    expect(res.situacao).toBe('sem_conferencia');
    expect(res.situacaoIcon).toBe('⚪');
    expect(res.situacaoLabel).toBe('Sem conferência');
  });

  it('NUNCA expõe dias restantes nem previsão para produto sem conferência (M12)', () => {
    const res = calcularSaldoEProjecao(produtoNovo, [], [], [], agora);
    // Mutação M12 tentaria inventar ou mostrar dias restantes em sem_conferencia
    expect(res.diasRestantes).toBeNull();
    expect(res.previsaoTermino).toBeNull();
    expect(res.previsaoTerminoFormatada).toBeNull();
    expect(res.saldo).toBeNull();
    expect(res.saldoEstimado).toBeNull();
  });

  it('entradas sem conferência não criam saldo estimável (conferência inicial é obrigatória)', () => {
    // Mesmo se houver uma entrada avulsa, sem conferência física inicial não há âncora confiável
    const movimentos = [
      {
        id: 'ent-1',
        produto_id: 'prod-novo',
        tipo: 'entrada',
        quantidade_base: 50,
        ocorrido_em: agora.toISOString()
      }
    ];

    const res = calcularSaldoEProjecao(produtoNovo, movimentos, [], [], agora);
    expect(res.temConferencia).toBe(false);
    expect(res.situacao).toBe('sem_conferencia');
    expect(res.diasRestantes).toBeNull();
  });
});
