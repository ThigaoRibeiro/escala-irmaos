import { describe, it, expect } from 'vitest';
import { calcularSaldoEProjecao } from '../../../src/features/estoque/domain/saldo.js';
import { gerarTextoWhatsApp } from '../../../src/features/estoque/domain/whatsapp.js';

// M1: a cuidadora avisa "está acabando" num produto que ainda não teve a primeira conferência.
// O aviso não pode se perder: eleva para 🟡 (sem inventar projeção) e aparece na mensagem.
describe('sinalizacaoSemConferencia.test.js - aviso em produto sem conferência (M1)', () => {
  const agora = new Date('2026-07-15T12:00:00Z');
  const produto = {
    id: 'p-1',
    nome: 'Shampoo',
    unidade_base: 'ml',
    embalagem_nome: 'frasco',
    embalagem_quantidade: 400,
    modo_consumo: 'taxa',
    consumo_diario_base: 10
  };
  const sinal = { id: 's-1', produto_id: 'p-1', criado_em: '2026-07-14T10:00:00Z', criado_por_email: 'maria@cuidadora.com' };

  it('sem aviso: continua ⚪ sem_conferencia', () => {
    const res = calcularSaldoEProjecao(produto, [], [], [], agora);
    expect(res.situacao).toBe('sem_conferencia');
  });

  it('com aviso: eleva para 🟡, mantém "sem conferência" e NÃO expõe projeção', () => {
    const res = calcularSaldoEProjecao(produto, [], [sinal], [], agora);
    expect(res.situacao).toBe('atencao');
    expect(res.situacaoIcon).toBe('🟡');
    expect(res.temConferencia).toBe(false);
    expect(res.sinalizacaoPendente?.id).toBe('s-1');
    expect(res.saldo).toBeNull();
    expect(res.diasRestantes).toBeNull();
    expect(res.previsaoTermino).toBeNull();
  });

  it('aviso de OUTRO produto não afeta', () => {
    const res = calcularSaldoEProjecao(produto, [], [{ ...sinal, produto_id: 'outro' }], [], agora);
    expect(res.situacao).toBe('sem_conferencia');
  });

  it('a mensagem do WhatsApp lista o item na seção 🟡 marcando "sem conferência"', () => {
    const calculo = calcularSaldoEProjecao(produto, [], [sinal], [], agora);
    const texto = gerarTextoWhatsApp([{ produto, calculo }], [], {}, [], agora);
    expect(texto).toContain('🟡 Ficar de olho (pesquisar preço)\n• Shampoo – sem conferência');
    expect(texto).not.toContain('NaN');
    expect(texto).not.toContain('null');
  });
});
