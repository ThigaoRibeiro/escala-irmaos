/**
 * Cálculo único dos itens e das contagens por situação.
 * A aba Estoque (cabeçalho) e o selo da navegação usam EXATAMENTE estas funções, para nunca
 * divergirem (por exemplo, ao considerar a agenda de remédios).
 */

import { calcularSaldoEProjecao } from './saldo.js';

/**
 * @param {Array} produtos
 * @param {Array} movimentos
 * @param {Array} sinalizacoes
 * @param {Array} medications Agenda de remédios (somente leitura)
 * @param {Date|string|number} agora
 * @returns {Array<{ produto: Object, calculo: Object }>}
 */
export function calcularItens(produtos, movimentos, sinalizacoes, medications, agora) {
  return (produtos || []).map((produto) => ({
    produto,
    calculo: calcularSaldoEProjecao(produto, movimentos, sinalizacoes, medications, agora)
  }));
}

/**
 * @param {Array<{ calculo: Object }>} itens
 * @returns {{ acabou: number, critico: number, atencao: number, sem_conferencia: number, ok: number }}
 */
export function contarPorSituacao(itens) {
  const contadores = { acabou: 0, critico: 0, atencao: 0, sem_conferencia: 0, ok: 0 };
  for (const item of itens || []) {
    const situacao = item.calculo?.situacao;
    if (contadores[situacao] !== undefined) contadores[situacao]++;
  }
  return contadores;
}

/** Itens que pedem ação imediata: ⚫ acabou + 🔴 comprar agora. */
export function contarUrgentes(contadores) {
  return (contadores?.acabou || 0) + (contadores?.critico || 0);
}
