import { describe, it, expect } from 'vitest';
import {
  unidadesParaEmbalagens,
  embalagensParaUnidades,
  formatarNumeroPtBr,
  formatarQuantidade,
  pluralizarEmbalagem,
  FRACAO_EMBALAGEM_ABERTA
} from '../../../src/features/estoque/domain/conversoes.js';

describe('conversoes.js - Funções puras de conversão e formatação', () => {
  it('unidadesParaEmbalagens converte corretamente quantidade base para embalagens', () => {
    expect(unidadesParaEmbalagens(60, 20)).toBe(3);
    expect(unidadesParaEmbalagens(45, 20)).toBe(2.25);
    expect(unidadesParaEmbalagens(0, 20)).toBe(0);
    expect(unidadesParaEmbalagens(10, 0)).toBe(10);
  });

  it('embalagensParaUnidades calcula total na unidade base a partir de fechadas + soltas', () => {
    expect(embalagensParaUnidades(2, 5, 20)).toBe(45);
    expect(embalagensParaUnidades(3, 0, 20)).toBe(60);
    expect(embalagensParaUnidades('1', '10', '30')).toBe(40);
    expect(embalagensParaUnidades(0, 0, 20)).toBe(0);
  });

  it('formatarNumeroPtBr formata com vírgula e casas decimais corretas', () => {
    expect(formatarNumeroPtBr(45)).toBe('45');
    expect(formatarNumeroPtBr(2.25, 1)).toBe('2,3');
    expect(formatarNumeroPtBr(2.5, 1)).toBe('2,5');
    expect(formatarNumeroPtBr(0)).toBe('0');
    expect(formatarNumeroPtBr(NaN)).toBe('0');
  });

  it('pluralizarEmbalagem pluraliza nomes comuns em pt-BR', () => {
    expect(pluralizarEmbalagem('pacote', 1)).toBe('pacote');
    expect(pluralizarEmbalagem('pacote', 2)).toBe('pacotes');
    expect(pluralizarEmbalagem('frasco', 2)).toBe('frascos');
    expect(pluralizarEmbalagem('caixa', 3)).toBe('caixas');
  });

  it('formatarQuantidade exibe quantidade base + embalagens conforme especificação', () => {
    // Exemplo clássico da especificação: "45 fraldas (~ 2,3 pacotes)"
    expect(formatarQuantidade(45, 'fraldas', 'pacote', 20)).toBe('45 fraldas (~ 2,3 pacotes)');
    // Inteiro: "60 fraldas (~ 3 pacotes)"
    expect(formatarQuantidade(60, 'fraldas', 'pacote', 20)).toBe('60 fraldas (~ 3 pacotes)');
    // Embalagem com 1 unidade não exibe parênteses redundantes
    expect(formatarQuantidade(1, 'tubo', 'tubo', 1)).toBe('1 tubo');
    // Nulo / indefinido
    expect(formatarQuantidade(null, 'comprimidos')).toBe('0 comprimidos');
  });

  it('FRACAO_EMBALAGEM_ABERTA contém frações esperadas para itens em ml', () => {
    expect(FRACAO_EMBALAGEM_ABERTA).toHaveLength(5);
    expect(FRACAO_EMBALAGEM_ABERTA.map(f => f.valor)).toEqual([1, 0.75, 0.5, 0.25, 0.1]);
  });
});
